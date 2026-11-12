
(function () {
  'use strict';

  var FADE_MS = 280;

  var supportsVT = 'onpagereveal' in window;
  var css;

  if (supportsVT) {
    css =
      '@view-transition{navigation:auto}' +
      '::view-transition-group(root){animation-duration:' + FADE_MS + 'ms}' +
      '::view-transition-old(root),::view-transition-new(root){animation-duration:' + FADE_MS + 'ms;animation-timing-function:ease-in-out}' +
      /* header is identical on every page: keep it still while the rest fades */
      '.lx-header{view-transition-name:lx-header}' +
      '::view-transition-group(lx-header){animation-duration:0s}' +
      '::view-transition-old(lx-header){display:none}' +
      '::view-transition-new(lx-header){animation:none}';
  } else {
    // fallback: hide until the page is built, then fade in
    css =
      'html.lx-wait body{opacity:0}' +
      'body{transition:opacity ' + FADE_MS + 'ms ease-in-out}' +
      'html.lx-leaving body{opacity:0;transition-duration:150ms}';
    document.documentElement.classList.add('lx-wait');
    var reveal = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { document.documentElement.classList.remove('lx-wait'); });
      });
    };
    var ready = false;
    var show = function () { if (!ready) { ready = true; reveal(); } };
    window.addEventListener('load', show);
    setTimeout(show, 1200); // never leave the page hidden
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) document.documentElement.classList.remove('lx-wait', 'lx-leaving');
    });
  }

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var going = false;
  function go(url) {
    if (going) return;
    if (supportsVT) { window.location.href = url; return; }
    going = true;
    document.documentElement.classList.add('lx-leaving');
    setTimeout(function () { window.location.href = url; }, 150);
  }
  window.lxGo = go;

  if (!supportsVT) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin && url.protocol !== 'file:') return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      go(a.href);
    });
  }
})();
