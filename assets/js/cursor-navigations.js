(() => {
  const SELECTOR = '.app-cursor';
  const DEFAULT_ROTATION = -30;
  const ROTATION_RANGE = 15;   

  let cursor = null;
  let baseRotation = DEFAULT_ROTATION;
  let rotation = DEFAULT_ROTATION;
  let pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let animToken = 0;

  const setStyle = (prop, value) => cursor.style.setProperty(prop, value, 'important');


  const getWidth = () =>
    cursor.offsetWidth ||
    parseFloat(getComputedStyle(cursor).width) ||
    cursor.getBoundingClientRect().width ||
    0;

  function bind(el, keepPos) {
    cursor = el;

    if (!keepPos) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) pos = { x: r.left + r.width / 2, y: r.top };
    }

    setStyle('position', 'fixed');
    setStyle('right', 'auto');
    setStyle('bottom', 'auto');
    setStyle('margin', '0');
    setStyle('transform-origin', '50% 0');
    setStyle('pointer-events', 'none');
    setStyle('z-index', '9999');
  }

  function render(x, y) {
    if (!cursor || !cursor.isConnected) {
      const el = document.querySelector(SELECTOR);
      if (!el) return;
      bind(el, true);
    }

    const width = getWidth();

    setStyle('left', `${x - width / 2}px`);
    setStyle('top', `${y}px`);
    setStyle('transform', `rotate(${rotation}deg)`);
    pos = { x, y };
  }

  const ready = new Promise((resolve) => {
    const tryInit = () => {
      const el = document.querySelector(SELECTOR);
      if (!el) return false;
      bind(el, false);
      render(pos.x, pos.y);
      console.log('[cursor] prêt', { width: getWidth(), pivot: pos });
      resolve(el);
      return true;
    };

    if (tryInit()) return;
    console.log('[cursor] .app-cursor pas encore là, j\'attends...');
    const obs = new MutationObserver(() => {
      if (tryInit()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });

  const easeIn = (u) => u * u;                        
  const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3); 
  const smooth = (u) => u * u * (3 - 2 * u);          


  function moveTo(x, y, opts = {}) {
    return ready.then(
      () =>
        new Promise((resolve) => {
          const token = ++animToken; 

          const start = { ...pos };
          const vx = start.x - x;
          const vy = start.y - y;
          const dist = Math.hypot(vx, vy);

          if (dist < 1) {
            rotation = baseRotation;
            render(x, y);
            return resolve(true);
          }

          const {
            spiralRadius = 350,
            turns = 0.5,
            spiralDuration = 800,
            wobble = ROTATION_RANGE,
            side = Math.random() < 0.5 ? 1 : -1,
          } = opts;

          const amp =
            Math.min(wobble, ROTATION_RANGE) *
            (0.35 + 0.65 * Math.random()) *
            (Math.random() < 0.5 ? 1 : -1);

          const R = Math.min(spiralRadius, dist);
          const a0 = Math.atan2(vy, vx);

          const S = { x: x + Math.cos(a0) * R, y: y + Math.sin(a0) * R };

          const straightLen = dist - R;
          const {
            straightDuration = straightLen > 0
              ? Math.min(1200, Math.max(300, 300 + straightLen * 0.6))
              : 0,
          } = opts;

          const total = straightDuration + spiralDuration;
          const t0 = performance.now();

          function frame(now) {
            if (token !== animToken) return resolve(false);

            const elapsed = now - t0;

            if (elapsed >= total) {
              rotation = baseRotation;
              render(x, y);            
              return resolve(true);
            }

            rotation = baseRotation + amp * Math.sin((2 * Math.PI * elapsed) / total);

            if (elapsed < straightDuration) {
              const p = easeIn(elapsed / straightDuration);
              render(
                start.x + (S.x - start.x) * p,
                start.y + (S.y - start.y) * p
              );
            } else {
              const u = (elapsed - straightDuration) / spiralDuration;
              const r = R * (1 - easeOutCubic(u)); 
              const a = a0 + side * turns * 2 * Math.PI * smooth(u); 
              render(x + r * Math.cos(a), y + r * Math.sin(a));
            }

            requestAnimationFrame(frame);
          }

          requestAnimationFrame(frame);
        })
    );
  }


  function moveToElement(target, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return Promise.resolve(false);

    const r = el.getBoundingClientRect();
    const x = opts.anchor === 'center' ? r.left + r.width / 2 : r.left;
    const y = opts.anchor === 'center' ? r.top + r.height / 2 : r.top;
    return moveTo(x, y, opts);
  }

  function setRotation(deg) {
    baseRotation = deg;
    rotation = deg;
    render(pos.x, pos.y);
  }

  window.AppCursor = {
    ready,
    moveTo,
    moveToElement,
    setRotation,
    getPosition: () => ({ ...pos }),
    DEFAULT_ROTATION,
  };
})();