// Behavior for the portfolio page. Everything here is an enhancement: without it the page still reads and prints.

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

setUpThemeToggle();
setUpCvPrinting();
setUpSpotlight();
setUpNavHighlight();
setUpShowMore();
setUpPanelSlideIn();
setUpKeyvisuals();
setUpLanguageSwitch();

// The page starts dark, whatever the system prefers.
// The theme the visitor picks is remembered.
function setUpThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  const isDark = () => root.dataset.theme !== 'light';
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
  sync();
}

// "Save as PDF" links to the one-page CV. Here it prints the CV from a hidden frame, so the visitor stays on the page.
// Touch screens follow the link instead, since some mobile browsers print the page around a frame.
function setUpCvPrinting() {
  const links = document.querySelectorAll('[data-print]');
  if (links.length === 0 || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  // The CV loads once, as soon as the pointer or the keyboard reaches a link, so it is ready by the click.
  let cv = null;
  const load = (url) => (cv ??= loadFrame(url));
  for (const link of links) {
    link.addEventListener('pointerenter', () => load(link.href));
    link.addEventListener('focus', () => load(link.href));
    link.addEventListener('click', (event) => {
      event.preventDefault();
      load(link.href)
        .then((view) => view.print())
        .catch(() => location.assign(link.href));
    });
  }
}

// Resolves with the window of a hidden frame showing `url`, once the fonts it uses have loaded.
// The frame stays rendered, only transparent and 1px wide, since browsers print a frame without layout blank.
function loadFrame(url) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position: fixed; top: 0; left: 0; width: 1px; height: 1px; border: 0; opacity: 0; pointer-events: none';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.addEventListener(
      'load',
      () => {
        const view = frame.contentWindow;
        Promise.all([...view.document.fonts].map((font) => font.load())).then(() => resolve(view), reject);
      },
      { once: true },
    );
    frame.addEventListener('error', reject, { once: true });
    frame.src = url;
    document.body.append(frame);
  });
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

// Hides a project's text after its [show more] marker behind a button that shows the rest.
// styles.css hides it while the text column has data-collapsed, so without this script the whole text shows.
// A text the visitor opened stays open, and its button goes away.
function setUpShowMore() {
  for (const button of document.querySelectorAll('.more')) {
    const column = button.closest('.panel__text');
    const rest = column.querySelector('.panel__rest');
    column.toggleAttribute('data-collapsed', true);
    button.addEventListener('click', () => {
      const focused = document.activeElement === button;
      column.removeAttribute('data-collapsed');
      // The button disappears, so keyboard focus moves on to the text it opened.
      if (focused) {
        rest.tabIndex = -1;
        rest.focus({ preventScroll: true });
      }
    });
  }
}

// Shows the keyvisual of the project screen that crosses the middle of the window and hides the others.
// Projects of the same customer share a keyvisual, which then stays shown between their screens.
function setUpKeyvisuals() {
  const layers = new Map([...document.querySelectorAll('.keyvisual')].map((layer) => [layer.dataset.keyvisual, layer]));
  if (layers.size === 0) return;
  const screens = [...document.querySelectorAll('.screen')];
  const asciiDrawings = new Map(
    [...layers]
      .filter(([, layer]) => layer.classList.contains('keyvisual--ascii'))
      .map(([key, layer]) => [key, setUpAsciiKeyvisual(layer)]),
  );

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
        if (current !== key) return;
        asciiDrawings.get(key)?.();
        layer.classList.add('is-shown');
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
  for (const screen of screens) observer.observe(screen);
}

// Draws an ASCII keyvisual: its photo as colored dots on a canvas, after https://ascii.rest/storm-plains/.
// Flashes go off in the photo every second or so while the keyvisual is shown, wherever the page is scrolled.
// Returns a function that paints the canvas for the current window size and theme, and starts the flashes.
function setUpAsciiKeyvisual(layer) {
  // Width and height of a cell, in CSS pixels.
  const CELL = 6;
  // Dot radius of each step, as a fraction of the cell: none, ·, • and ●.
  // Dots on a light page are ink, and most of the photo is darker than the page, so they stay smaller.
  const RADIUS = { dark: [0, 0.18, 0.32, 0.48], light: [0, 0.14, 0.27, 0.43] };
  // Brightness each step stands for. A cell darker than its step gets a dimmer dot.
  const COVER = [0, 0.3, 0.6, 1];
  // Lowest step level, so dark parts of the photo keep a faint grid of dots.
  const FLOOR = 0.05;
  // Ordered 4×4 dither, which spreads the steps of a gradient across neighboring cells.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((value) => value / 16 - 0.47);
  // Where flashes go off in each photo: an area as fractions of its width and height, left, top, right and bottom,
  // and the cells they pick there. A photo without an entry gets no flashes.
  // - dark: grey, unlit cells, like a crowd in the stands
  // - bright: white highlights, like lamps and lenses
  const FLASH_AREAS = {
    'assets/img/zeiss-keyvisual.webp': { area: [0.64, 0, 0.98, 0.72], cells: 'bright' },
    'assets/img/adac-keyvisual.webp': { area: [0.15, 0.12, 1, 0.22], cells: 'dark' },
    'assets/img/fcbayern-keyvisual.webp': { area: [0, 0.02, 1, 0.2], cells: 'dark' },
    'assets/img/mms-keyvisual.webp': { area: [0.45, 0.17, 0.95, 0.44], cells: 'bright' },
  };
  // Times in milliseconds: between bursts of flashes on average, at most between two cameras of a burst,
  // and over which a flash fades to a third.
  const FLASH_SPACING = 2200;
  const FLASH_SPREAD = 400;
  const FLASH_FADE = 120;
  // Cells a flash lights in each direction, and the cool white it adds.
  const FLASH_REACH = 16;
  const FLASH_COLOR = [0.92, 0.95, 1];
  // How much a flash at full strength brightens the whole picture, as a CSS brightness() step.
  // It keeps a flash visible while the panel covers the stands.
  const FLASH_LIFT = 0.15;

  const canvas = layer.querySelector('canvas');
  const image = layer.querySelector('img');
  const context = canvas.getContext('2d');
  const channels = new Float32Array(3);
  // Light a flash at full strength adds to each cell of the square it reaches.
  const side = 2 * FLASH_REACH + 1;
  const kernel = Float32Array.from({ length: side * side }, (_, i) => glow((i % side) - FLASH_REACH, Math.floor(i / side) - FLASH_REACH));
  // The grid on the canvas. A resize or a theme switch drops it, and the next draw rebuilds it.
  let art = null;
  let burstTimer = 0;
  let frame = 0;

  const draw = () => {
    // A broken image leaves the canvas empty, and so does a canvas without a size, like in print.
    if (!image.naturalWidth || !canvas.clientWidth) return;
    if (!art) {
      art = sample();
      for (let cell = 0; cell < art.drawn.length; cell++) paint(cell, 0);
    }
    if (!reducedMotion.matches) burstTimer ||= setTimeout(burst, FLASH_SPACING);
  };

  // Reads the photo at one pixel per cell, placed as object-fit: cover would place it, and clears the canvas.
  const sample = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const scale = devicePixelRatio || 1;
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.filter = '';

    const fit = Math.max(width / image.naturalWidth, height / image.naturalHeight) / CELL;
    const photoWidth = image.naturalWidth * fit;
    const photoHeight = image.naturalHeight * fit;
    const photoLeft = (width / CELL - photoWidth) / 2;
    const photoTop = (height / CELL - photoHeight) / 2;
    const sampler = document.createElement('canvas');
    sampler.width = cols;
    sampler.height = rows;
    const samplerContext = sampler.getContext('2d', { willReadFrequently: true });
    samplerContext.imageSmoothingQuality = 'high';
    samplerContext.drawImage(image, photoLeft, photoTop, photoWidth, photoHeight);
    const pixels = samplerContext.getImageData(0, 0, cols, rows).data;
    const photo = new Float32Array(cols * rows * 3);
    for (let cell = 0; cell < cols * rows; cell++) {
      for (let i = 0; i < 3; i++) photo[cell * 3 + i] = pixels[cell * 4 + i] / 255;
    }

    // The layer reaches past the window, so flashes only go off in cells the window shows, two cells in from its edges.
    const spots = [];
    const place = FLASH_AREAS[layer.dataset.keyvisual];
    if (place) {
      const [left, top, right, bottom] = place.area;
      const firstRow = Math.max(0, Math.ceil(-layer.offsetTop / CELL) + 2, Math.floor(photoTop + top * photoHeight));
      const endRow = Math.min(rows, Math.floor((innerHeight - layer.offsetTop) / CELL) - 2, Math.ceil(photoTop + bottom * photoHeight));
      const firstCol = Math.max(0, Math.ceil(-layer.offsetLeft / CELL) + 2, Math.floor(photoLeft + left * photoWidth));
      const endCol = Math.min(cols, Math.floor((innerWidth - layer.offsetLeft) / CELL) - 2, Math.ceil(photoLeft + right * photoWidth));
      for (let y = firstRow; y < endRow; y++) {
        for (let x = firstCol; x < endCol; x++) {
          const i = (y * cols + x) * 4;
          const brightest = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
          const grey = brightest - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 32;
          if (grey && (place.cells === 'dark' ? brightest < 128 : brightest > 220)) spots.push(y * cols + x);
        }
      }
    }

    const ground = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).slice(0, 3).map((value) => value / 255);
    // On a light page the dots are ink, so the dark parts of the photo get the large dots.
    const paper = ground[0] + ground[1] + ground[2] > 1.5;
    return {
      width,
      height,
      scale,
      cols,
      rows,
      size: CELL * scale,
      radius: paper ? RADIUS.light : RADIUS.dark,
      photo,
      spots,
      ground,
      paper,
      // The dot on the canvas per cell, as dotOf() packs it.
      drawn: new Int32Array(cols * rows),
      // Flash light per cell in the last frame.
      lit: new Map(),
      // Flashes of the bursts so far that haven't faded, each with the cell it lights and when it goes off.
      flashes: [],
    };
  };

  // Turns a cell into a dot: its step from how far the cell stands out from the page, plus its color.
  // Returns the step in the top byte and the color in the three below, or 0 for an empty cell.
  const dotOf = (cell, light) => {
    const { photo, ground, paper, cols } = art;
    let peak = 1e-4;
    for (let i = 0; i < 3; i++) {
      const color = Math.min(1, photo[cell * 3 + i] + light * FLASH_COLOR[i]);
      // 0 is the page, 1 is white on a dark page and black on a light one.
      channels[i] = Math.max(0, paper ? (ground[i] - color) / ground[i] : (color - ground[i]) / (1 - ground[i]));
      peak = Math.max(peak, channels[i]);
    }
    const x = cell % cols;
    const y = (cell - x) / cols;
    // Per-cell jitter keeps flat areas from breaking into contour lines.
    const level = Math.min(1, Math.max(0, FLOOR + (1 - FLOOR) * 0.97 * peak + 0.12 * (hash(x, y + 517) - 0.5)));
    const step = Math.min(3, Math.max(0, Math.round(3 * level + BAYER[(y & 3) * 4 + (x & 3)])));
    if (step === 0) return 0;
    // Small dots are drawn brighter and large ones dimmer, so gradients stay smooth across the steps.
    // The darkest cells stay dark.
    const strength = Math.min(0.14 + 0.86 * Math.min(1, (level + 0.04) / COVER[step]), 0.45 + 0.8 * level) / peak;
    let dot = step;
    for (let i = 0; i < 3; i++) {
      const away = Math.min(1, channels[i] * strength);
      dot = (dot << 8) | Math.round(255 * (paper ? ground[i] * (1 - away) : ground[i] + away * (1 - ground[i])));
    }
    return dot;
  };

  // Draws a cell with the given flash light, unless the canvas already shows its dot.
  const paint = (cell, light) => {
    const dot = dotOf(cell, light);
    if (dot === art.drawn[cell]) return;
    const { cols, size } = art;
    const x = cell % cols;
    const y = (cell - x) / cols;
    if (art.drawn[cell] !== 0) {
      const left = Math.floor(x * size);
      const top = Math.floor(y * size);
      context.clearRect(left, top, Math.floor((x + 1) * size) - left, Math.floor((y + 1) * size) - top);
    }
    art.drawn[cell] = dot;
    if (dot === 0) return;
    context.fillStyle = `rgb(${(dot >> 16) & 255} ${(dot >> 8) & 255} ${dot & 255})`;
    context.beginPath();
    context.arc((x + 0.5) * size, (y + 0.5) * size, art.radius[dot >>> 24] * size, 0, 2 * Math.PI);
    context.fill();
  };

  // Lights the cells around the flashes still going off, and restores the cells earlier flashes lit.
  const flash = (now) => {
    const { cols, rows } = art;
    const lit = new Map();
    let lift = 0;
    for (const { spot, start } of art.flashes) {
      if (now < start) continue;
      const strength = Math.exp(-(now - start) / FLASH_FADE);
      lift += FLASH_LIFT * strength;
      if (spot === null) continue;
      const spotX = spot % cols;
      const spotY = (spot - spotX) / cols;
      for (let y = Math.max(0, spotY - FLASH_REACH); y <= Math.min(rows - 1, spotY + FLASH_REACH); y++) {
        for (let x = Math.max(0, spotX - FLASH_REACH); x <= Math.min(cols - 1, spotX + FLASH_REACH); x++) {
          const light = strength * kernel[(y - spotY + FLASH_REACH) * side + x - spotX + FLASH_REACH];
          // Too faint to see, which spares the cell a redraw.
          if (light < 0.03) continue;
          const cell = y * cols + x;
          lit.set(cell, (lit.get(cell) ?? 0) + light);
        }
      }
    }
    for (const cell of art.lit.keys()) {
      if (!lit.has(cell)) paint(cell, 0);
    }
    for (const [cell, light] of lit) paint(cell, light);
    art.lit = lit;
    canvas.style.filter = lift > 0.01 ? `brightness(${(1 + lift).toFixed(3)})` : '';
  };

  // Sets off a burst of one to three cameras, and schedules the next burst.
  // A flash with a spot of null has no visible stands to go off in, and only brightens the picture.
  const burst = () => {
    burstTimer = setTimeout(burst, FLASH_SPACING * (0.4 + 1.2 * Math.random()));
    // A background tab skips its bursts, since it draws no frames and its flashes would only pile up.
    if (!art || art.spots.length === 0 || document.hidden) return;
    const open = openSpots();
    const cameras = 1 + Math.floor(3 * Math.random());
    let start = performance.now();
    for (let camera = 0; camera < cameras; camera++) {
      const spot = open.length > 0 ? open[Math.floor(Math.random() * open.length)] : null;
      art.flashes.push({ spot, start });
      start += FLASH_SPREAD * (0.3 + 0.7 * Math.random());
    }
    frame ||= requestAnimationFrame(animate);
  };

  // Draws a frame of the flashes, until the last one has faded.
  const animate = (now) => {
    frame = 0;
    // A hidden layer drops its grid when it repaints or frees its canvas.
    if (!art) return;
    art.flashes = art.flashes.filter(({ start }) => now - start <= 5 * FLASH_FADE);
    flash(now);
    if (art.flashes.length > 0) frame = requestAnimationFrame(animate);
  };

  // Lists the spots a burst can be seen in.
  // The burst keeps these spots, so its flashes stay put while the panels move.
  const openSpots = () => {
    // The rail's side of the picture is dimmed, so flashes keep to the right of the content's left edge.
    const contentLeft = document.querySelector('.content')?.getBoundingClientRect().left ?? 0;
    // The screens hold their panels without the slide-in, so flashes also keep clear of a panel still sliding in.
    const panels = [...document.querySelectorAll('.screen--project .screen__inner')]
      .map((inner) => inner.getBoundingClientRect())
      .filter((rect) => rect.bottom > 0 && rect.top < innerHeight);
    const { offsetLeft, offsetTop } = layer;
    return art.spots.filter((spot) => {
      const x = offsetLeft + ((spot % art.cols) + 0.5) * CELL;
      const y = offsetTop + (Math.floor(spot / art.cols) + 0.5) * CELL;
      return x >= contentLeft && !panels.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    });
  };

  const repaint = () => {
    art = null;
    if (layer.classList.contains('is-shown')) draw();
  };
  // A resize repaints once the size settles, since a full paint takes tens of milliseconds.
  // Until then the canvas stretches its old dots.
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (art && art.width === canvas.clientWidth && art.height === canvas.clientHeight && art.scale === devicePixelRatio) return;
      repaint();
    }, 150);
  }).observe(canvas);
  new MutationObserver(repaint).observe(root, { attributeFilter: ['data-theme'] });

  // A hidden layer stops its bursts, and frees its canvas after its fade-out in styles.css,
  // so only the keyvisual on show holds a full-window bitmap.
  let releaseTimer = 0;
  new MutationObserver(() => {
    clearTimeout(releaseTimer);
    if (layer.classList.contains('is-shown')) return;
    clearTimeout(burstTimer);
    burstTimer = 0;
    releaseTimer = setTimeout(() => {
      art = null;
      canvas.width = 0;
      canvas.height = 0;
    }, 1000);
  }).observe(layer, { attributeFilter: ['class'] });

  return draw;
}

// Light a flash adds to a cell (dx, dy) cells away from it: a white core, a halo and a cross of glints.
function glow(dx, dy) {
  const distance = Math.hypot(dx, dy);
  const cross = dx === 0 || dy === 0 ? 0.9 * Math.exp(-(Math.abs(dx) + Math.abs(dy)) / 3.2) : 0;
  return Math.exp(-distance / 1.1) + 0.5 * Math.exp(-distance / 2.6) + 0.3 * Math.exp(-distance / 8) + cross;
}

// Noise between 0 and 1 for a pair of integers, the same on every visit.
function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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
