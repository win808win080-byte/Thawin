import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const TABLE_NAME = 'portfolio_projects';
const BUCKET_NAME = 'portfolio-assets';
const SESSION_KEY = 'thawin-portfolio-supabase-session';

function requireConfiguration() {
  if (!isSupabaseConfigured()) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase กรุณาตั้งค่า assets/supabase-config.js ก่อน');
  }
}

function getStoredSession() {
  const value = sessionStorage.getItem(SESSION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    throw new Error(`ข้อมูลเข้าสู่ระบบเสียหาย กรุณาเข้าสู่ระบบใหม่: ${error.message}`);
  }
}

function storeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function authRequest(path, body) {
  requireConfiguration();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.msg || result?.message || result?.error_description || 'ยืนยันตัวตนกับ Supabase ไม่สำเร็จ');
  }
  return result;
}

async function getValidSession() {
  const session = getStoredSession();
  if (!session) return null;

  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 30) return session;
  if (!session.refresh_token) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
  const nextSession = { ...refreshed, expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in };
  storeSession(nextSession);
  return nextSession;
}

export async function signIn(email, password) {
  const result = await authRequest('token?grant_type=password', { email, password });
  storeSession({ ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in });
  return result.user;
}

export async function getCurrentUser() {
  const session = await getValidSession();
  return session?.user ?? null;
}

export async function signOut() {
  const session = await getValidSession();
  if (!session) return;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `ออกจากระบบ Supabase ไม่สำเร็จ (HTTP ${response.status})`);
  }
  sessionStorage.removeItem(SESSION_KEY);
}

async function request(path, { method = 'GET', body, headers = {}, publicAccess = false } = {}) {
  requireConfiguration();
  const session = publicAccess ? null : await getValidSession();
  const requestHeaders = {
    apikey: SUPABASE_ANON_KEY,
    ...headers,
  };
  if (session) {
    requestHeaders.Authorization = `Bearer ${session.access_token}`;
  } else if (SUPABASE_ANON_KEY.startsWith('eyJ')) {
    requestHeaders.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  if (body !== undefined && !(body instanceof Blob)) requestHeaders['Content-Type'] = 'application/json';

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase ตอบกลับ HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function getPublicAssetUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function mapProject(row) {
  return {
    ...row,
    createdAt: row.created_at,
    order: row.order_index,
    images: row.image_paths.map(getPublicAssetUrl),
    image: null,
    pdf: row.pdf_path ? getPublicAssetUrl(row.pdf_path) : null,
  };
}

export function getSafeProjectLink(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function getProjectImages(project) {
  if (Array.isArray(project.images) && project.images.length > 0) {
    return project.images.filter((image) => image instanceof Blob || typeof image === 'string');
  }
  return project.image instanceof Blob ? [project.image] : [];
}

export async function getProjects() {
  const rows = await request(
    `/rest/v1/${TABLE_NAME}?select=*&order=order_index.asc,created_at.desc`,
    { publicAccess: true },
  );
  return rows.map(mapProject);
}

export async function getLocalProjects() {
  if (!('indexedDB' in window)) return [];

  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('thawin-portfolio', 1);
    let databaseExisted = false;

    opening.onupgradeneeded = () => {
      opening.transaction.abort();
    };

    opening.onerror = () => {
      if (!databaseExisted && opening.error?.name === 'AbortError') {
        resolve([]);
        return;
      }
      reject(opening.error ?? new Error('อ่านผลงานเดิมในเบราว์เซอร์ไม่สำเร็จ'));
    };

    opening.onsuccess = () => {
      databaseExisted = true;
      const database = opening.result;
      if (!database.objectStoreNames.contains('projects')) {
        database.close();
        resolve([]);
        return;
      }

      const transaction = database.transaction('projects', 'readonly');
      const requestProjects = transaction.objectStore('projects').getAll();
      requestProjects.onsuccess = () => resolve(requestProjects.result.sort((first, second) => {
        if (Number.isInteger(first.order) && Number.isInteger(second.order)) {
          return first.order - second.order;
        }
        return second.createdAt.localeCompare(first.createdAt);
      }));
      requestProjects.onerror = () => reject(requestProjects.error ?? new Error('อ่านผลงานเดิมในเบราว์เซอร์ไม่สำเร็จ'));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    };
  });
}

async function uploadAsset(path, file) {
  await request(`/storage/v1/object/${BUCKET_NAME}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
    body: file,
  });
}

async function deleteAssets(paths) {
  if (paths.length === 0) return;
  await request(`/storage/v1/object/${BUCKET_NAME}`, {
    method: 'DELETE',
    body: { prefixes: paths },
  });
}

export async function saveProject(project) {
  const session = await getValidSession();
  if (!session?.user?.id) throw new Error('กรุณาเข้าสู่ระบบใหม่ก่อนบันทึกผลงาน');

  const images = getProjectImages(project);
  const paths = [];
  const projectId = project.id ?? crypto.randomUUID();

  try {
    const imagePaths = [];
    for (const [index, image] of images.entries()) {
      if (!(image instanceof Blob)) throw new Error('ไฟล์รูปภาพใหม่ไม่ถูกต้อง');
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[image.type];
      if (!extension) throw new Error(`ไม่รองรับรูปภาพชนิด ${image.type || 'ที่ไม่ทราบชนิด'}`);
      const path = `${session.user.id}/${projectId}/${projectId}-image-${index + 1}.${extension}`;
      await uploadAsset(path, image);
      paths.push(path);
      imagePaths.push(path);
    }

    let pdfPath = null;
    if (project.pdf instanceof Blob) {
      pdfPath = `${session.user.id}/${projectId}/${projectId}-document.pdf`;
      await uploadAsset(pdfPath, project.pdf);
      paths.push(pdfPath);
    }

    const [row] = await request(`/rest/v1/${TABLE_NAME}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: {
        id: projectId,
        title: project.title,
        category: project.category,
        description: project.description,
        link: project.link || null,
        image_paths: imagePaths,
        pdf_path: pdfPath,
        order_index: project.order,
      },
    });
    return mapProject(row);
  } catch (error) {
    try {
      await deleteAssets(paths);
    } catch (cleanupError) {
      throw new Error(`${error.message}. ไฟล์ชั่วคราวลบบางส่วนไม่สำเร็จ: ${cleanupError.message}`);
    }
    throw error;
  }
}

export async function saveProjectOrder(projects) {
  await Promise.all(projects.map((project, index) => request(
    `/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(project.id)}`,
    { method: 'PATCH', body: { order_index: index } },
  )));
}

export async function deleteProject(id) {
  const project = (await getProjects()).find((item) => item.id === id);
  if (!project) throw new Error('ไม่พบผลงานที่ต้องการลบ');

  const paths = [...project.image_paths, ...(project.pdf_path ? [project.pdf_path] : [])];
  await request(`/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  try {
    await deleteAssets(paths);
  } catch (error) {
    throw new Error(`ลบข้อมูลผลงานแล้ว แต่ลบไฟล์สื่อบางส่วนไม่สำเร็จ: ${error.message}`);
  }
}
