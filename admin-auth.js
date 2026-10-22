const ADMIN_PASSWORD = '1234';

const loginPanel = document.querySelector('#admin-login-panel');
const loginForm = document.querySelector('#admin-login-form');
const passwordInput = document.querySelector('#admin-password');
const loginStatus = document.querySelector('#admin-login-status');
const workspace = document.querySelector('#admin-workspace');
const logoutButton = document.querySelector('#admin-logout');
let adminModuleLoaded = false;

function lockAdmin() {
  workspace.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
  loginStatus.textContent = '';
  passwordInput.focus();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (passwordInput.value !== ADMIN_PASSWORD) {
    loginStatus.textContent = 'รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง';
    loginStatus.classList.add('is-error');
    passwordInput.select();
    return;
  }

  loginStatus.textContent = '';
  loginStatus.classList.remove('is-error');
  loginPanel.hidden = true;
  workspace.hidden = false;

  if (adminModuleLoaded) return;

  try {
    await import('./admin.js');
    adminModuleLoaded = true;
  } catch (error) {
    loginPanel.hidden = false;
    workspace.hidden = true;
    loginStatus.textContent = `เปิดหน้าจัดการผลงานไม่สำเร็จ: ${error.message}`;
    loginStatus.classList.add('is-error');
  }
});

logoutButton.addEventListener('click', lockAdmin);
