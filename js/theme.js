/* Runs before the page paints. Picks light or dark: the choice saved by the sun / moon button,
   otherwise the phone's own setting. */
(function () {
  var t = null;
  try { t = localStorage.getItem('card-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
})();
