import { getProjects } from './project-store.js';

const section = document.querySelector('#uploaded-projects');
const projectGrid = document.querySelector('#uploaded-project-grid');
const statusMessage = document.querySelector('#uploaded-project-status');
const imageUrls = [];

function createProjectCard(project, index) {
  const card = document.createElement('article');
  card.className = 'project-card uploaded-project-card';

  const preview = document.createElement('div');
  preview.className = 'project-preview uploaded-project-preview';

  const image = document.createElement('img');
  image.src = URL.createObjectURL(project.image);
  image.alt = project.title;
  imageUrls.push(image.src);

  const number = document.createElement('span');
  number.className = 'project-number';
  number.textContent = String(index + 1).padStart(2, '0');

  preview.append(image, number);

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
  info.append(meta, title, description);
  card.append(preview, info);
  return card;
}

async function renderProjects() {
  const projects = await getProjects();
  if (projects.length === 0) return;

  section.hidden = false;
  statusMessage.textContent = '';
  projects.forEach((project, index) => {
    projectGrid.append(createProjectCard(project, index));
  });
}

window.addEventListener('pagehide', () => {
  imageUrls.forEach((url) => URL.revokeObjectURL(url));
});

renderProjects().catch((error) => {
  section.hidden = false;
  statusMessage.textContent = `โหลดผลงานที่อัปโหลดไม่สำเร็จ: ${error.message}`;
  statusMessage.classList.add('is-error');
});
