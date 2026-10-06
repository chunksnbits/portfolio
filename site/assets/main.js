// Behavior for the portfolio page. Everything here is an enhancement: without it the page still reads and prints.

const root = document.documentElement;
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

setUpThemeToggle();
setUpPrintButtons();
setUpSpotlight();
setUpNavHighlight();
setUpPanelSlideIn();
setUpKeyvisuals();
setUpLanguageSwitch();

// The page follows the system theme until the visitor picks one, which is then remembered.
function setUpThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : prefersDark.matches);
  const sync = () => toggle.setAttribute('aria-pressed', String(isDark()));

  toggle.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark';
    root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage can be blocked. The choice then lasts until the page reloads.
    }
    sync();
  });
  prefersDark.addEventListener('change', sync);
  sync();
}

function setUpPrintButtons() {
  for (const button of document.querySelectorAll('[data-print]')) {
    button.addEventListener('click', () => print());
  }
}

function setUpSpotlight() {
  const spotlight = document.querySelector('.spotlight');
  if (!spotlight || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let frame = 0;
  let x = 0;
  let y = 0;
  addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        spotlight.style.setProperty('--x', `${x}px`);
        spotlight.style.setProperty('--y', `${y}px`);
        spotlight.classList.add('is-on');
      });
    },
    { passive: true },
  );
  root.addEventListener('pointerleave', () => spotlight.classList.remove('is-on'));
}

// Marks the nav link of the section that crosses the middle of the screen.
function setUpNavHighlight() {
  const links = new Map([...document.querySelectorAll('.nav__link')].map((link) => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links.values()) link.removeAttribute('aria-current');
        links.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  for (const section of document.querySelectorAll('[data-nav]')) observer.observe(section);
}

// Project panels slide in as they scroll into view, then stay in place when the page scrolls back up.
// CSS scroll-driven animations do the sliding where the browser supports them, otherwise this sets --enter.
// A panel that has arrived gets .is-entered, which ends its animation, and is no longer measured.
function setUpPanelSlideIn() {
  let panels = [...document.querySelectorAll('.panel')];
  if (panels.length === 0 || reducedMotion.matches) return;
  const slideInScript = !CSS.supports('animation-timeline: view()');

  let pending = false;
  const update = () => {
    pending = false;
    panels = panels.filter((panel) => {
      const { top, height } = panel.getBoundingClientRect();
      // Same range as animation-range in styles.css.
      const progress = Math.min(1, Math.max(0, (innerHeight - top) / Math.min(height, innerHeight)));
      if (slideInScript) panel.style.setProperty('--enter', String(progress));
      if (progress < 1) return true;
      panel.classList.add('is-entered');
      return false;
    });
    if (panels.length === 0) {
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}

// Shows the keyvisual of the project screen that crosses the middle of the window and hides the others.
// Projects of the same customer share a keyvisual, which then stays shown between their screens.
function setUpKeyvisuals() {
  const layers = new Map([...document.querySelectorAll('.keyvisual')].map((layer) => [layer.dataset.keyvisual, layer]));
  if (layers.size === 0) return;

  let current = null;
  let timer = 0;
  const show = (key) => {
    current = key;
    for (const [name, layer] of layers) {
      if (name !== key) layer.classList.remove('is-shown');
    }
    const layer = layers.get(key);
    // Waits for the image, so it doesn't pop in after its fade.
    layer
      ?.querySelector('img')
      .decode()
      .catch(() => {})
      .then(() => {
        if (current === key) layer.classList.add('is-shown');
      });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries.findLast((candidate) => candidate.isIntersecting);
      if (!entry) return;
      // Waits for the page to settle, so screens it only passes, like after a nav click, don't flash their keyvisual.
      clearTimeout(timer);
      timer = setTimeout(() => show(entry.target.dataset.keyvisual ?? null), 150);
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  for (const screen of document.querySelectorAll('.screen')) observer.observe(screen);
}

// Opens the other language at the screen the visitor is reading. Both pages share the same ids.
function setUpLanguageSwitch() {
  const link = document.querySelector('.language');
  if (!link) return;

  link.addEventListener('click', () => {
    const middle = innerHeight / 2;
    const current = [...document.querySelectorAll('.screen')].find((screen) => {
      const { top, bottom } = screen.getBoundingClientRect();
      return top <= middle && bottom >= middle;
    });
    link.hash = current ? current.id : '';
  });
}
