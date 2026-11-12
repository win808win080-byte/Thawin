import { deleteProject, getProjectImages, getProjects, getSafeProjectLink, saveProject, saveProjectOrder } from './project-store.js';

const form = document.querySelector('#project-form');
const fileInput = document.querySelector('#project-image');
const pdfInput = document.querySelector('#project-pdf');
const preview = document.querySelector('#image-preview');
const projectList = document.querySelector('#admin-project-list');
const statusMessage = document.querySelector('#admin-status');
const publishButton = document.querySelector('#publish-projects');
const publishDownloads = document.querySelector('#publish-downloads');
const publishStatus = document.querySelector('#publish-status');
const submitButton = form.querySelector('button[type="submit"]');
const previewUrls = [];
const projectFileUrls = [];
const publishedFileUrls = [];

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
  image.src = URL.createObjectURL(coverImage);
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
  if (project.pdf instanceof Blob && project.pdf.type === 'application/pdf') {
    pdfLinkElement = document.createElement('a');
    pdfLinkElement.className = 'text-link project-link';
    pdfLinkElement.href = URL.createObjectURL(project.pdf);
    pdfLinkElement.target = '_blank';
    pdfLinkElement.rel = 'noopener noreferrer';
    pdfLinkElement.textContent = 'เปิดไฟล์ PDF ↗';
    projectFileUrls.push(pdfLinkElement.href);
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

function getAssetExtension(blob) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  const extension = extensions[blob.type];
  if (!extension) throw new Error(`ไม่รองรับชนิดไฟล์ ${blob.type || 'ที่ไม่ทราบชนิด'}`);
  return extension;
}

function createDownloadLink(filename, blob) {
  const url = URL.createObjectURL(blob);
  publishedFileUrls.push(url);
  const link = document.createElement('a');
  link.className = 'button button-primary';
  link.href = url;
  link.download = filename;
  link.textContent = `ดาวน์โหลด ${filename}`;
  publishDownloads.append(link);
}

publishButton.addEventListener('click', async () => {
  publishButton.disabled = true;
  publishStatus.textContent = 'กำลังเตรียมไฟล์สำหรับเผยแพร่...';
  publishStatus.classList.remove('is-error');
  publishDownloads.hidden = true;
  publishDownloads.replaceChildren();
  publishedFileUrls.forEach((url) => URL.revokeObjectURL(url));
  publishedFileUrls.length = 0;

  try {
    const projects = await getProjects();
    const publishedProjects = projects.map((project, index) => {
      const fileId = String(project.id).replace(/[^a-zA-Z0-9-]/g, '');
      if (!fileId) throw new Error(`รหัสผลงาน “${project.title}” ใช้ตั้งชื่อไฟล์ไม่ได้`);

      const images = getProjectImages(project);
      if (images.length === 0) throw new Error(`ผลงาน “${project.title}” ไม่มีรูปภาพ`);

      const imageFiles = images.map((image, imageIndex) => {
        const filename = `project-${fileId}-image-${imageIndex + 1}.${getAssetExtension(image)}`;
        createDownloadLink(filename, image);
        return filename;
      });

      let pdfFilename = null;
      if (project.pdf instanceof Blob) {
        pdfFilename = `project-${fileId}-document.${getAssetExtension(project.pdf)}`;
        createDownloadLink(pdfFilename, project.pdf);
      }

      return {
        id: project.id,
        title: project.title,
        category: project.category,
        description: project.description,
        link: project.link,
        createdAt: project.createdAt,
        order: index,
        images: imageFiles,
        pdf: pdfFilename,
      };
    });
    const manifest = new Blob([JSON.stringify(publishedProjects, null, 2)], { type: 'application/json' });
    createDownloadLink('published-projects.json', manifest);
    publishDownloads.hidden = false;
    publishStatus.textContent = `เตรียมไฟล์ ${publishedProjects.length} ผลงานเรียบร้อยแล้ว ดาวน์โหลดทุกลิงก์ด้านบน แล้วอัปโหลดทั้งหมดไว้โฟลเดอร์เดียวกับ work.html ใน GitHub`;
  } catch (error) {
    publishStatus.textContent = `ส่งออกไฟล์ไม่สำเร็จ: ${error.message}`;
    publishStatus.classList.add('is-error');
  } finally {
    publishButton.disabled = false;
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
  setStatus('กำลังบันทึกผลงานในเบราว์เซอร์...');

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
    setStatus('เพิ่มผลงานเรียบร้อยแล้ว');
  } catch (error) {
    setStatus(`บันทึกผลงานไม่สำเร็จ: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  releasePreview();
  projectFileUrls.forEach((url) => URL.revokeObjectURL(url));
  publishedFileUrls.forEach((url) => URL.revokeObjectURL(url));
});

renderProjects().catch((error) => {
  setStatus(`โหลดรายการผลงานไม่สำเร็จ: ${error.message}`, true);
});
