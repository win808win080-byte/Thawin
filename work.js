import { getProjects, getSafeProjectLink } from './project-store.js';

const section = document.querySelector('#uploaded-projects');
const projectGrid = document.querySelector('#uploaded-project-grid');
const statusMessage = document.querySelector('#uploaded-project-status');
const imageViewer = document.querySelector('#image-viewer');
const imageViewerImage = imageViewer.querySelector('.image-viewer-image');
const projectFileUrls = [];

function createProjectCard(project, index) {
  const card = document.createElement('article');
  card.className = 'project-card uploaded-project-card';

  const preview = document.createElement('div');
  preview.className = 'project-preview uploaded-project-preview';

  const image = document.createElement('img');
  image.src = URL.createObjectURL(project.image);
  image.alt = project.title;
  projectFileUrls.push(image.src);

  const imageButton = document.createElement('button');
  imageButton.className = 'project-image-button';
  imageButton.type = 'button';
  imageButton.setAttribute('aria-label', `ขยายรูปภาพ: ${project.title}`);
  imageButton.append(image);

  const number = document.createElement('span');
  number.className = 'project-number';
  number.textContent = String(index + 1).padStart(2, '0');

  preview.append(imageButton, number);

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

  if (project.pdf instanceof Blob && project.pdf.type === 'application/pdf') {
    const pdfLink = document.createElement('a');
    pdfLink.className = 'text-link project-link';
    pdfLink.href = URL.createObjectURL(project.pdf);
    pdfLink.target = '_blank';
    pdfLink.rel = 'noopener noreferrer';
    pdfLink.textContent = 'เปิดไฟล์ PDF ↗';
    projectFileUrls.push(pdfLink.href);
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
  imageViewer.showModal();
});

imageViewer.querySelector('.image-viewer-close').addEventListener('click', () => {
  imageViewer.close();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !imageViewer.open) return;
  event.preventDefault();
  imageViewer.close();
});

imageViewer.addEventListener('click', (event) => {
  if (event.target === imageViewer) imageViewer.close();
});

imageViewer.addEventListener('close', () => {
  imageViewerImage.removeAttribute('src');
  imageViewerImage.alt = '';
});

async function renderProjects() {
  const projects = await getProjects();
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
