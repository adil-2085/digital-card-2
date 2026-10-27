/* Card behaviour: fills the text from data/content.js, runs the loading screen,
   reveals sections as they scroll into view, and drives the countdown. */
(function () {
  var C = window.CARD, root = document.documentElement;
  var loader = document.getElementById('loader');

  if (!C) {
    root.classList.remove('lock');
    if (loader) loader.remove();
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:24px;font:16px sans-serif">data/content.js could not be loaded.</p>');
    return;
  }

  /* 1. fill the page from data/content.js */
  function get(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, C);
  }
  [].forEach.call(document.querySelectorAll('[data-t]'), function (el) {
    var v = get(el.getAttribute('data-t'));
    if (v != null) el.textContent = v;
  });
  [].forEach.call(document.querySelectorAll('[data-href]'), function (el) {
    var v = get(el.getAttribute('data-href'));
    if (v) el.href = v;
  });
  if (C.pageTitle) document.title = C.pageTitle;

  /* 2. loading screen, then the card */
  var t0 = Date.now(), fired = false;
  var MIN = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches ? 900 : 3000;
  var cue = document.getElementById('cue');

  function reveal() {
    var els = [].slice.call(document.querySelectorAll('[data-r]'));
    function on(e) { e.classList.add('in'); }
    if (!('IntersectionObserver' in window)) { els.forEach(on); return; }
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (x) {
        if (x.isIntersecting) { on(x.target); io.unobserve(x.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function hideCue() {
    cue.classList.add('gone');
    window.removeEventListener('scroll', hideCue);
  }

  function finish() {
    if (fired) return;
    fired = true;
    setTimeout(function () {
      window.scrollTo(0, 0);
      root.classList.remove('lock');
      root.classList.add('ready');
      loader.classList.add('out');
      requestAnimationFrame(function () { requestAnimationFrame(reveal); });
      window.addEventListener('scroll', hideCue, { passive: true });
      setTimeout(function () { loader.remove(); }, 1000);
    }, Math.max(0, MIN - (Date.now() - t0)));
  }

  /* wait for the fonts so text never jumps after the loading screen has gone */
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('1em "Great Vibes"'),
      document.fonts.load('600 1em "Cormorant Garamond"'),
      document.fonts.load('italic 500 1em "Cormorant Garamond"'),
      document.fonts.load('700 1em "Aref Ruqaa"', C.bismillah || 'ب')
    ]);
  }
  var loaded = new Promise(function (r) {
    if (document.readyState === 'complete') r(); else window.addEventListener('load', r);
  });
  loaded.then(fontsReady).then(finish, finish);
  setTimeout(finish, 6000);

  cue.addEventListener('click', function () {
    document.getElementById('blessing').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* 3. countdown (only writes to the page when a number changes) */
  var T = new Date(C.eventStart).getTime();
  var box = document.getElementById('cd'), lead = document.getElementById('cd-lead');
  var nodes = {
    d: document.getElementById('cd-d'), h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'), s: document.getElementById('cd-s')
  };
  var shown = {};
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function put(k, v) { if (shown[k] !== v) { shown[k] = v; nodes[k].textContent = v; } }
  function tick() {
    var d = T - Date.now();
    if (!(d > 0)) { box.hidden = true; lead.hidden = true; return false; }
    var s = Math.floor(d / 1000);
    put('d', pad(Math.floor(s / 86400)));
    put('h', pad(Math.floor(s % 86400 / 3600)));
    put('m', pad(Math.floor(s % 3600 / 60)));
    put('s', pad(s % 60));
    return true;
  }
  if (tick()) {
    var iv = setInterval(function () {
      if (document.hidden) return;
      if (!tick()) clearInterval(iv);
    }, 1000);
  }

  /* 4. light / dark button: a sun in light mode, a moon in dark mode */
  var tgl = document.getElementById('theme-toggle');
  var busy = false;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var L = C.labels || {};

  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function relabel() {
    var text = isDark() ? (L.toLight || 'Switch to light mode') : (L.toDark || 'Switch to dark mode');
    tgl.setAttribute('aria-label', text);
    tgl.setAttribute('title', text);
  }
  function apply(next) { root.setAttribute('data-theme', next); relabel(); }
  function finishSwitch() { root.classList.remove('vt'); root.classList.remove('theme-anim'); busy = false; }
  relabel();

  tgl.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    var next = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('card-theme', next); } catch (e) {}
    tgl.classList.remove('pulse'); void tgl.offsetWidth; tgl.classList.add('pulse');

    if (reduce) { apply(next); finishSwitch(); return; }

    if (document.startViewTransition) {
      /* a circle grows from the button and reveals the new look */
      var rect = tgl.getBoundingClientRect();
      var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('vt');
      var vt = document.startViewTransition(function () { apply(next); });
      vt.ready.then(function () {
        try {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
          );
        } catch (err) { root.classList.remove('vt'); }
      }, function () {});
      vt.finished.then(finishSwitch, finishSwitch);
    } else {
      /* other browsers: every colour fades smoothly */
      root.classList.add('theme-anim');
      apply(next);
      setTimeout(finishSwitch, 700);
    }
  });
  tgl.addEventListener('animationend', function () { tgl.classList.remove('pulse'); });

  /* follow the phone's own light / dark setting until the visitor has used the button */
  if (window.matchMedia) {
    var sys = matchMedia('(prefers-color-scheme: dark)');
    var onSystem = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('card-theme'); } catch (err) {}
      if (saved !== 'light' && saved !== 'dark') apply(e.matches ? 'dark' : 'light');
    };
    if (sys.addEventListener) sys.addEventListener('change', onSystem);
    else if (sys.addListener) sys.addListener(onSystem);
  }
})();
