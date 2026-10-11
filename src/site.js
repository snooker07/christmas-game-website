// Keep inbound links to the original one-page Christmas Breaker website working.
const legacyLinks = {
  '#game': '/christmas-breaker/',
  '#gallery': '/christmas-breaker/#gallery',
  '#privacy': '/christmas-breaker/privacy/'
};
function followLegacyLink() {
  if (window.location.pathname === '/' && legacyLinks[window.location.hash]) {
    window.location.replace(legacyLinks[window.location.hash]);
  }
}
followLegacyLink();
window.addEventListener('hashchange', followLegacyLink);

const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
if (toggle && navigation) {
  toggle.hidden = false;
  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close(); toggle.focus();
    }
  });
  window.matchMedia('(min-width: 701px)').addEventListener('change', close);
}
