import { deleteProject, getLocalProjects, getProjectImages, getProjects, getSafeProjectLink, saveProject, saveProjectOrder } from './project-store.js';

const form = document.querySelector('#project-form');
const fileInput = document.querySelector('#project-image');
const pdfInput = document.querySelector('#project-pdf');
const preview = document.querySelector('#image-preview');
const projectList = document.querySelector('#admin-project-list');
const statusMessage = document.querySelector('#admin-status');
const migrateButton = document.querySelector('#migrate-legacy-projects');
const legacyNotice = document.querySelector('#legacy-projects-notice');
const migrationStatus = document.querySelector('#migration-status');
const submitButton = form.querySelector('button[type="submit"]');
const previewUrls = [];
const projectFileUrls = [];

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('is-error', isError);
}

function releasePreview() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.length = 0;
}

function createAdminProject(project, index, projects) {
  const card = document.createElement('article');
  card.className = 'admin-project';

  const number = document.createElement('span');
  number.className = 'admin-project-number';
  number.textContent = `งานที่ ${String(index + 1).padStart(2, '0')}`;

  const [coverImage] = getProjectImages(project);
  const image = document.createElement('img');
  image.src = coverImage instanceof Blob ? URL.createObjectURL(coverImage) : coverImage;
  image.alt = '';
  if (coverImage instanceof Blob) {
    image.addEventListener('load', () => URL.revokeObjectURL(image.src), { once: true });
  }

  const details = document.createElement('div');
  details.className = 'admin-project-details';

  const category = document.createElement('span');
  category.className = 'admin-project-category';
  category.textContent = project.category;

  const title = document.createElement('h3');
  title.textContent = project.title;

  const description = document.createElement('p');
  description.textContent = project.description;

  const projectLink = getSafeProjectLink(project.link);
  let projectLinkElement = null;
  if (projectLink) {
    projectLinkElement = document.createElement('a');
    projectLinkElement.className = 'text-link project-link';
    projectLinkElement.href = projectLink;
    projectLinkElement.target = '_blank';
    projectLinkElement.rel = 'noopener noreferrer';
    projectLinkElement.textContent = 'เปิดลิงก์ผลงาน ↗';
  }

  let pdfLinkElement = null;
  if ((project.pdf instanceof Blob && project.pdf.type === 'application/pdf')
    || getSafeProjectLink(project.pdf)) {
    pdfLinkElement = document.createElement('a');
    pdfLinkElement.className = 'text-link project-link';
    pdfLinkElement.href = project.pdf instanceof Blob ? URL.createObjectURL(project.pdf) : project.pdf;
    pdfLinkElement.target = '_blank';
    pdfLinkElement.rel = 'noopener noreferrer';
    pdfLinkElement.textContent = 'เปิดไฟล์ PDF ↗';
    if (project.pdf instanceof Blob) projectFileUrls.push(pdfLinkElement.href);
  }

  const removeButton = document.createElement('button');
  removeButton.className = 'button button-danger';
  removeButton.type = 'button';
  removeButton.textContent = 'ลบผลงาน';
  removeButton.addEventListener('click', async () => {
    if (!window.confirm(`ต้องการลบผลงาน “${project.title}” หรือไม่?`)) return;

    removeButton.disabled = true;
    try {
      await deleteProject(project.id);
      await renderProjects();
      setStatus('ลบผลงานเรียบร้อยแล้ว');
    } catch (error) {
      removeButton.disabled = false;
      setStatus(`ลบผลงานไม่สำเร็จ: ${error.message}`, true);
    }
  });

  const reorderButtons = document.createElement('div');
  reorderButtons.className = 'admin-project-order';

  const moveButton = (direction, label, symbol, disabled) => {
    const button = document.createElement('button');
    button.className = 'button admin-project-move';
    button.type = 'button';
    button.textContent = symbol;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    button.addEventListener('click', async () => {
      const newIndex = index + direction;
      const reorderedProjects = [...projects];
      [reorderedProjects[index], reorderedProjects[newIndex]] = [reorderedProjects[newIndex], reorderedProjects[index]];
      button.disabled = true;
      try {
        await saveProjectOrder(reorderedProjects);
        await renderProjects();
        setStatus(`เปลี่ยนลำดับ “${project.title}” เป็นงานที่ ${String(newIndex + 1).padStart(2, '0')} แล้ว`);
      } catch (error) {
        setStatus(`จัดเรียงผลงานไม่สำเร็จ: ${error.message}`, true);
        await renderProjects();
      }
    });
    return button;
  };

  reorderButtons.append(
    moveButton(-1, `เลื่อน ${project.title} ขึ้น`, '↑', index === 0),
    moveButton(1, `เลื่อน ${project.title} ลง`, '↓', index === projects.length - 1),
  );
  details.append(number, category, title, description, reorderButtons);
  if (projectLinkElement) details.append(projectLinkElement);
  if (pdfLinkElement) details.append(pdfLinkElement);
  details.append(removeButton);
  card.append(image, details);
  return card;
}

async function renderProjects() {
  const projects = await getProjects();
  projectList.replaceChildren();

  if (projects.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'admin-empty';
    emptyMessage.textContent = 'ยังไม่มีผลงานที่อัปโหลด';
    projectList.append(emptyMessage);
    return;
  }

  projects.forEach((project, index) => projectList.append(createAdminProject(project, index, projects)));
}

async function updateLegacyProjectsNotice() {
  const [localProjects, cloudProjects] = await Promise.all([getLocalProjects(), getProjects()]);
  const cloudIds = new Set(cloudProjects.map((project) => project.id));
  const projectsToMigrate = localProjects.filter((project) => !cloudIds.has(project.id));
  migrateButton.hidden = projectsToMigrate.length === 0;
  legacyNotice.hidden = projectsToMigrate.length === 0;
  if (projectsToMigrate.length > 0) {
    migrationStatus.textContent = `พบผลงานเดิม ${projectsToMigrate.length} รายการในเบราว์เซอร์เครื่องนี้`;
  }
}

migrateButton.addEventListener('click', async () => {
  migrateButton.disabled = true;
  migrationStatus.textContent = 'กำลังย้ายผลงานเดิมไปยัง Supabase...';
  migrationStatus.classList.remove('is-error');

  try {
    const [localProjects, cloudProjects] = await Promise.all([getLocalProjects(), getProjects()]);
    const cloudIds = new Set(cloudProjects.map((project) => project.id));
    const projectsToMigrate = localProjects.filter((project) => !cloudIds.has(project.id));
    for (const [index, project] of projectsToMigrate.entries()) {
      await saveProject({ ...project, order: cloudProjects.length + index });
    }

    await renderProjects();
    await updateLegacyProjectsNotice();
    migrationStatus.textContent = `ย้ายผลงาน ${projectsToMigrate.length} รายการเรียบร้อยแล้ว`;
  } catch (error) {
    migrationStatus.textContent = `ย้ายผลงานไม่สำเร็จ: ${error.message}`;
    migrationStatus.classList.add('is-error');
  } finally {
    migrateButton.disabled = false;
  }
});

fileInput.addEventListener('change', () => {
  releasePreview();
  const files = Array.from(fileInput.files);
  preview.replaceChildren();
  preview.hidden = files.length === 0;
  files.forEach((file) => {
    const image = document.createElement('img');
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    image.src = url;
    image.alt = `ตัวอย่างรูปภาพ: ${file.name}`;
    preview.append(image);
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const images = Array.from(fileInput.files);
  const [image] = images;
  const [pdf] = pdfInput.files;
  const title = form.elements.title.value.trim();
  const category = form.elements.category.value.trim();
  const description = form.elements.description.value.trim();
  const linkValue = form.elements.link.value.trim();
  const link = getSafeProjectLink(linkValue);

  if (!title || !category || !description) {
    setStatus('กรุณากรอกชื่อ หมวดหมู่ และรายละเอียดให้ครบ', true);
    return;
  }

  if (linkValue && !link) {
    setStatus('ลิงก์ผลงานต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://', true);
    form.elements.link.focus();
    return;
  }

  if (images.length === 0 || images.length > 3) {
    setStatus('กรุณาเลือกรูปภาพผลงาน 1–3 รูป', true);
    fileInput.focus();
    return;
  }

  const invalidImage = images.find((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type));
  if (invalidImage) {
    setStatus(`ไฟล์ “${invalidImage.name}” ไม่ใช่รูป JPG, PNG, WEBP หรือ GIF`, true);
    fileInput.focus();
    return;
  }

  const oversizedImage = images.find((file) => file.size > 10 * 1024 * 1024);
  if (oversizedImage) {
    setStatus(`รูป “${oversizedImage.name}” มีขนาดเกิน 10 MB`, true);
    fileInput.focus();
    return;
  }

  if (pdf && ((pdf.type && pdf.type !== 'application/pdf') || !pdf.name.toLowerCase().endsWith('.pdf'))) {
    setStatus('รองรับเฉพาะไฟล์ PDF', true);
    pdfInput.focus();
    return;
  }

  if (pdf && pdf.size > 10 * 1024 * 1024) {
    setStatus('ไฟล์ PDF ต้องมีขนาดไม่เกิน 10 MB', true);
    pdfInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus('กำลังบันทึกผลงานลงฐานข้อมูล...');

  try {
    const existingProjects = await getProjects();
    await saveProjectOrder(existingProjects);
    await saveProject({
      id: crypto.randomUUID(),
      title,
      category,
      description,
      link: link ?? '',
      image,
      images,
      pdf: pdf ? new Blob([pdf], { type: 'application/pdf' }) : null,
      createdAt: new Date().toISOString(),
      order: existingProjects.length,
    });
    form.reset();
    preview.hidden = true;
    preview.replaceChildren();
    releasePreview();
    await renderProjects();
    setStatus('เพิ่มผลงานเรียบร้อยแล้ว ผู้ชมจะเห็นทันที');
  } catch (error) {
    setStatus(`บันทึกผลงานไม่สำเร็จ: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  releasePreview();
  projectFileUrls.forEach((url) => URL.revokeObjectURL(url));
});

renderProjects().catch((error) => {
  setStatus(`โหลดรายการผลงานไม่สำเร็จ: ${error.message}`, true);
});

updateLegacyProjectsNotice().catch((error) => {
  migrationStatus.textContent = `ตรวจสอบผลงานเดิมไม่สำเร็จ: ${error.message}`;
  migrationStatus.classList.add('is-error');
});
