import { getProjectImages, getProjects, getSafeProjectLink } from './project-store.js';

const section = document.querySelector('#uploaded-projects');
const projectGrid = document.querySelector('#uploaded-project-grid');
const statusMessage = document.querySelector('#uploaded-project-status');
const imageViewer = document.querySelector('#image-viewer');
const imageViewerImage = imageViewer.querySelector('.image-viewer-image');
const projectFileUrls = [];

function isValidDataUrl(value, mimeType) {
  return typeof value === 'string'
    && new RegExp(`^data:${mimeType};base64,[A-Za-z0-9+/]+={0,2}$`).test(value);
}

function validatePublishedProject(project, index) {
  if (!project || typeof project !== 'object'
    || typeof project.id !== 'string'
    || typeof project.title !== 'string'
    || typeof project.category !== 'string'
    || typeof project.description !== 'string'
    || !Array.isArray(project.images)
    || project.images.length === 0
    || !project.images.every((image) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      .some((mimeType) => isValidDataUrl(image, mimeType)))) {
    throw new Error(`ข้อมูลผลงานลำดับที่ ${index + 1} ใน published-projects.json ไม่ถูกต้อง`);
  }

  if (project.pdf !== null && project.pdf !== undefined && !isValidDataUrl(project.pdf, 'application/pdf')) {
    throw new Error(`ไฟล์ PDF ของผลงานลำดับที่ ${index + 1} ใน published-projects.json ไม่ถูกต้อง`);
  }

  return project;
}

async function getPublishedProjects() {
  const response = await fetch('./published-projects.json');
  if (!response.ok) {
    throw new Error(`อ่านไฟล์ published-projects.json ไม่สำเร็จ (HTTP ${response.status})`);
  }

  const projects = await response.json();
  if (!Array.isArray(projects)) {
    throw new Error('published-projects.json ต้องเป็นรายการผลงาน');
  }
  return projects.map(validatePublishedProject);
}

function createProjectCard(project, index) {
  const card = document.createElement('article');
  card.className = 'project-card uploaded-project-card';

  const preview = document.createElement('div');
  preview.className = 'project-preview uploaded-project-preview';

  const images = Array.isArray(project.images) && project.images.length > 0
    ? project.images
    : getProjectImages(project);
  const gallery = document.createElement('div');
  gallery.className = `uploaded-project-gallery${images.length === 1 ? ' single-image' : ''}`;

  images.forEach((imageFile, imageIndex) => {
    const image = document.createElement('img');
    image.src = imageFile instanceof Blob ? URL.createObjectURL(imageFile) : imageFile;
    image.alt = `${project.title} รูปที่ ${imageIndex + 1}`;
    if (imageFile instanceof Blob) projectFileUrls.push(image.src);

    const imageButton = document.createElement('button');
    imageButton.className = 'project-image-button';
    imageButton.type = 'button';
    imageButton.setAttribute('aria-label', `ดูรูปที่ ${imageIndex + 1}: ${project.title}`);
    imageButton.append(image);
    gallery.append(imageButton);
  });

  const number = document.createElement('span');
  number.className = 'project-number';
  number.textContent = String(index + 1).padStart(2, '0');

  preview.append(gallery, number);

  const info = document.createElement('div');
  info.className = 'project-info';

  const meta = document.createElement('div');
  meta.className = 'project-meta';

  const category = document.createElement('span');
  category.textContent = project.category;

  const metaNumber = document.createElement('span');
  metaNumber.textContent = String(index + 1).padStart(2, '0');

  const title = document.createElement('h2');
  title.textContent = project.title;

  const description = document.createElement('p');
  description.textContent = project.description;

  meta.append(category, metaNumber);

  const actions = document.createElement('div');
  actions.className = 'project-actions';

  const projectLink = getSafeProjectLink(project.link);
  if (projectLink) {
    const link = document.createElement('a');
    link.className = 'text-link project-link';
    link.href = projectLink;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'ดูผลงาน ↗';
    actions.append(link);
  }

  if ((project.pdf instanceof Blob && project.pdf.type === 'application/pdf')
    || isValidDataUrl(project.pdf, 'application/pdf')) {
    const pdfLink = document.createElement('a');
    pdfLink.className = 'text-link project-link';
    pdfLink.href = project.pdf instanceof Blob ? URL.createObjectURL(project.pdf) : project.pdf;
    pdfLink.target = '_blank';
    pdfLink.rel = 'noopener noreferrer';
    pdfLink.textContent = 'เปิดไฟล์ PDF ↗';
    if (project.pdf instanceof Blob) projectFileUrls.push(pdfLink.href);
    actions.append(pdfLink);
  }

  info.append(meta, title, description);
  if (actions.childElementCount > 0) info.append(actions);
  card.append(preview, info);
  return card;
}

projectGrid.addEventListener('click', (event) => {
  const imageButton = event.target.closest('.project-image-button');
  if (!imageButton) return;

  const image = imageButton.querySelector('img');
  imageViewerImage.src = image.src;
  imageViewerImage.alt = image.alt;
  imageViewer.hidden = false;
  document.body.classList.add('image-viewer-open');
  imageViewer.querySelector('.image-viewer-close').focus();
});

imageViewer.querySelector('.image-viewer-close').addEventListener('click', () => {
  imageViewer.hidden = true;
  document.body.classList.remove('image-viewer-open');
  imageViewerImage.removeAttribute('src');
  imageViewerImage.alt = '';
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || imageViewer.hidden) return;
  imageViewer.querySelector('.image-viewer-close').click();
});

imageViewer.addEventListener('click', (event) => {
  if (event.target === imageViewer) imageViewer.querySelector('.image-viewer-close').click();
});

async function renderProjects() {
  const [publishedProjects, localProjects] = await Promise.all([getPublishedProjects(), getProjects()]);
  const publishedIds = new Set(publishedProjects.map((project) => project.id));
  const projects = [...publishedProjects, ...localProjects.filter((project) => !publishedIds.has(project.id))];
  const staticProjects = document.querySelectorAll('main > .content-section > .project-grid > .project-card');
  staticProjects.forEach((card, index) => {
    const number = String(projects.length + index + 1).padStart(2, '0');
    card.querySelector('.project-number').textContent = number;
    card.querySelector('.project-meta span:last-child').textContent = number;
  });
  if (projects.length === 0) return;

  section.hidden = false;
  statusMessage.textContent = '';
  projects.forEach((project, index) => {
    projectGrid.append(createProjectCard(project, index));
  });
}

window.addEventListener('pagehide', () => {
  projectFileUrls.forEach((url) => URL.revokeObjectURL(url));
});

renderProjects().catch((error) => {
  section.hidden = false;
  statusMessage.textContent = `โหลดผลงานที่อัปโหลดไม่สำเร็จ: ${error.message}`;
  statusMessage.classList.add('is-error');
});
