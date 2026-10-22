const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.main-nav');

menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'ปิดเมนู' : 'เปิดเมนู');
  menuButton.textContent = isOpen ? '×' : '☰';
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !navigation.classList.contains('open')) return;
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'เปิดเมนู');
  menuButton.textContent = '☰';
  menuButton.focus();
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'เปิดเมนู');
    menuButton.textContent = '☰';
  });
});
