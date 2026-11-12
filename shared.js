(function () {
  'use strict';

  try {
    if (!(localStorage.getItem('lendit_session') || sessionStorage.getItem('lendit_session'))) {
      window.location.replace('login.html');
      return;
    }
  } catch (e) { }

  var path = location.pathname.split('/');
  var page = (path.pop() || 'home.html').toLowerCase();
  var currentFolder = path.pop() || '';

  if (page === 'index.html') page = 'home.html';

  // Solid / Filled icons
  var I = {
    home:  '<path d="M12 3l9 8h-3v9h-5v-6h-4v6H6v-9H3z"/>',
    box:   '<path d="M3 4h18l1 5H2zm0 6h18v10H3zm7 2v2h4v-2z"/>',
    bell:  '<path d="M12 2a6 6 0 00-6 6v4l-2 3v1h16v-1l-2-3V8a6 6 0 00-6-6zm-2 17a2 2 0 004 0z"/>',
    star:  '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/>',
    user:  '<circle cx="12" cy="7.5" r="4.5"/><path d="M3.5 21c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z"/>'
  };

  var LINKS = [
    { href: '../home/home.html',    label: 'Home',       icon: I.home, match: ['home.html', 'homeitems.html'] },
    { href: '../borrows/borrows.html', label: 'My Borrows', icon: I.box,  match: ['borrows.html'] },
    { href: '../alerts/alerts.html',  label: 'Alerts',     icon: I.bell, match: ['alerts.html'] },
    { href: '../ratings/ratings.html', label: 'Ratings',    icon: I.star, match: ['ratings.html'] },
    { href: '../profile/profile.html', label: 'Profile',    icon: I.user, match: ['profile.html'] }
  ];

  var nav = LINKS.map(function (l) {
    var on = l.match.indexOf(page) !== -1;
    var targetHref = l.href;
    
    if (currentFolder === 'home') {
      if (l.label === 'Home') targetHref = 'home.html';
    } else if (currentFolder === 'borrows') {
      if (l.label === 'My Borrows') targetHref = 'borrows.html';
    } else if (currentFolder === 'profile') {
      if (l.label === 'Profile') targetHref = 'profile.html';
    } else if (currentFolder === 'ratings') {
      if (l.label === 'Ratings') targetHref = 'ratings.html';
    } else if (currentFolder === '') {
      targetHref = l.href.replace('../', '');
    }

    return '<a href="' + targetHref + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + l.icon + '</svg><span>' + l.label + '</span></a>';
  }).join('');

  var logoSrc = currentFolder ? '../images/logo.png' : 'images/logo.png';
  var homeLink = currentFolder === 'home' ? 'home.html' : (currentFolder ? '../home/home.html' : 'home/home.html');

  var html =
    '<header class="lx-header" id="lxHeader">' +
      '<div class="lx-left">' +
        '<a href="' + homeLink + '" class="lx-brand" aria-label="LendIT home">' +
          '<img class="lx-logo" src="' + logoSrc + '" alt="">' +
          '<span class="lx-brand-name">LendIT</span>' +
        '</a>' +
      '</div>' +
      '<form class="lx-search" role="search" action="' + homeLink + '" method="get">' +
        '<input type="search" id="searchInput" name="q" placeholder="Search" aria-label="Search" autocomplete="off">' +
      '</form>' +
      '<div class="lx-right">' +
        '<nav class="lx-nav" id="lxNav" aria-label="Main">' + nav + '</nav>' +
        '<button class="lx-toggle" id="lxToggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="lxNav">&#9776;</button>' +
      '</div>' +
    '</header>';

  document.body.insertAdjacentHTML('afterbegin', html);

  // ---------- Uniform footer (same on every page) ----------
  var aboutLink = currentFolder ? '../about/about.html' : 'about/about.html';
  var footerHtml = '<div class="lx-connect"><h2 class="lx-connect-title">STAY CONNECTED WITH LENDIT</h2></div><footer class="lx-footer" id="lxFooter"><p>Copyright © 2026. All rights reserved.</p><p class="lx-links"><a href="https://mail.google.com/mail/u/0/?view=cm&amp;fs=1&amp;tf=1" target="_blank" rel="noopener noreferrer">Contact Us</a><a href="' + aboutLink + '">About Us</a></p><div class="lx-socials"><a href="https://www.facebook.com/profile.php?id=61595795940042" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z"/></svg></a> <a href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=lendforit@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="Gmail"><svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg></a> <a href="tel:+630000000000" aria-label="Phone"><svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z"/></svg></a> <a href="https://github.com/lendforit-here" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><svg viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg></a></div></footer>';
  function addFooter() {
    if (document.getElementById('lxFooter')) return;
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFooter);
  else addFooter();

  var header = document.getElementById('lxHeader');
  var navEl = document.getElementById('lxNav');
  var toggle = document.getElementById('lxToggle');
  var form = header.querySelector('.lx-search');

  function setMenu(open) {
    navEl.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function (e) { e.stopPropagation(); setMenu(!navEl.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!navEl.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) setMenu(false); });

  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  if (page === 'home.html' || page === 'borrows.html') {
      form.addEventListener('submit', function (e) { e.preventDefault(); });
  }
})();