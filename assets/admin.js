import { deleteProject, getProjects, saveProject } from './project-store.js';

const form = document.querySelector('#project-form');
const fileInput = document.querySelector('#project-image');
const preview = document.querySelector('#image-preview');
const previewImage = preview.querySelector('img');
const projectList = document.querySelector('#admin-project-list');
const statusMessage = document.querySelector('#admin-status');
const submitButton = form.querySelector('button[type="submit"]');
let previewUrl = null;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('is-error', isError);
}

function releasePreview() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}

function createAdminProject(project) {
  const card = document.createElement('article');
  card.className = 'admin-project';

  const image = document.createElement('img');
  image.src = URL.createObjectURL(project.image);
  image.alt = '';
  image.addEventListener('load', () => URL.revokeObjectURL(image.src), { once: true });

  const details = document.createElement('div');
  details.className = 'admin-project-details';

  const category = document.createElement('span');
  category.className = 'admin-project-category';
  category.textContent = project.category;

  const title = document.createElement('h3');
  title.textContent = project.title;

  const description = document.createElement('p');
  description.textContent = project.description;

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

  details.append(category, title, description, removeButton);
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

  projects.forEach((project) => projectList.append(createAdminProject(project)));
}

fileInput.addEventListener('change', () => {
  releasePreview();
  const [file] = fileInput.files;
  preview.hidden = !file;
  if (!file) return;

  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  previewImage.alt = `ตัวอย่างรูปภาพ: ${file.name}`;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const [image] = fileInput.files;
  const title = form.elements.title.value.trim();
  const category = form.elements.category.value.trim();
  const description = form.elements.description.value.trim();

  if (!title || !category || !description) {
    setStatus('กรุณากรอกชื่อ หมวดหมู่ และรายละเอียดให้ครบ', true);
    return;
  }

  if (!image) {
    setStatus('กรุณาเลือกรูปภาพผลงาน', true);
    fileInput.focus();
    return;
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(image.type)) {
    setStatus('รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF', true);
    fileInput.focus();
    return;
  }

  if (image.size > 10 * 1024 * 1024) {
    setStatus('รูปภาพต้องมีขนาดไม่เกิน 10 MB', true);
    fileInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus('กำลังบันทึกผลงานในเบราว์เซอร์...');

  try {
    await saveProject({
      id: crypto.randomUUID(),
      title,
      category,
      description,
      image,
      createdAt: new Date().toISOString(),
    });
    form.reset();
    preview.hidden = true;
    previewImage.removeAttribute('src');
    releasePreview();
    await renderProjects();
    setStatus('เพิ่มผลงานเรียบร้อยแล้ว');
  } catch (error) {
    setStatus(`บันทึกผลงานไม่สำเร็จ: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

window.addEventListener('pagehide', releasePreview);

renderProjects().catch((error) => {
  setStatus(`โหลดรายการผลงานไม่สำเร็จ: ${error.message}`, true);
});
