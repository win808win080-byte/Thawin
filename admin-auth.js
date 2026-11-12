import { getCurrentUser, signIn, signOut } from './project-store.js';

const loginPanel = document.querySelector('#admin-login-panel');
const loginForm = document.querySelector('#admin-login-form');
const emailInput = document.querySelector('#admin-email');
const passwordInput = document.querySelector('#admin-password');
const loginStatus = document.querySelector('#admin-login-status');
const workspace = document.querySelector('#admin-workspace');
const logoutButton = document.querySelector('#admin-logout');
let adminModuleLoaded = false;

async function showLogin() {
  workspace.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
  loginStatus.textContent = '';
  emailInput.focus();
}

async function showWorkspace() {
  loginStatus.textContent = '';
  loginStatus.classList.remove('is-error');
  loginPanel.hidden = true;
  workspace.hidden = false;

  try {
    if (!adminModuleLoaded) {
      await import('./admin.js');
      adminModuleLoaded = true;
    }
  } catch (error) {
    loginPanel.hidden = false;
    workspace.hidden = true;
    loginStatus.textContent = `เปิดหน้าจัดการผลงานไม่สำเร็จ: ${error.message}`;
    loginStatus.classList.add('is-error');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  loginStatus.textContent = 'กำลังเข้าสู่ระบบ...';
  loginStatus.classList.remove('is-error');

  try {
    await signIn(emailInput.value.trim(), passwordInput.value);
    await showWorkspace();
  } catch (error) {
    loginStatus.textContent = `เข้าสู่ระบบไม่สำเร็จ: ${error.message}`;
    loginStatus.classList.add('is-error');
    passwordInput.select();
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await signOut();
    await showLogin();
  } catch (error) {
    loginStatus.textContent = `ออกจากระบบไม่สำเร็จ: ${error.message}`;
    loginStatus.classList.add('is-error');
  } finally {
    logoutButton.disabled = false;
  }
});

getCurrentUser()
  .then((user) => (user ? showWorkspace() : showLogin()))
  .catch((error) => {
    loginStatus.textContent = `ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ: ${error.message}`;
    loginStatus.classList.add('is-error');
  });
