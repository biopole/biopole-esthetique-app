/* Biopole Esthétique — site de distribution.
   1. Détection de l'appareil → bonne méthode d'installation.
   2. Installation en un geste (Chrome / Edge) via `beforeinstallprompt`.
   3. Démo réelle : l'application Flutter web dans un cadre téléphone / tablette. */
(function () {
  'use strict';

  var APP_URL = 'app/';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------------------------------------------------------- Plateforme
  var ua = navigator.userAgent || '';
  var isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPad récents = « Mac » tactile
  var platform = /Android/i.test(ua) ? 'android'
    : (/iPhone|iPad|iPod/i.test(ua) || isIPadOS) ? 'ios'
    : 'desktop';
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var deferredPrompt = null;

  var deviceLabel = { android: 'Android détecté', ios: isIPadOS || /iPad/.test(ua) ? 'iPad détecté' : 'iPhone détecté', desktop: 'Ordinateur détecté' };

  // ----------------------------------------------------- Onglets d'installation
  function selectPlatform(p) {
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.platform === p)); });
    $$('.panel').forEach(function (panel) { panel.hidden = panel.dataset.panel !== p; });
    if (p === 'ios') startIosGuide(); else stopIosGuide();
    if (p === 'desktop') renderQr();
  }
  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { selectPlatform(b.dataset.platform); });
    if (b.dataset.platform === platform) $('.tabs__badge', b).hidden = false;
  });

  // ------------------------------------------------- Installation en un geste
  function refreshOneClick() {
    $$('[data-oneclick]').forEach(function (el) { el.hidden = !deferredPrompt; });
    $$('[data-manual]').forEach(function (el) { el.hidden = !!deferredPrompt; });
    updateHeroCta();
  }
  function promptInstall() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () { deferredPrompt = null; refreshOneClick(); });
    return true;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    refreshOneClick();
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    showInstalled();
  });
  $$('[data-install]').forEach(function (b) { b.addEventListener('click', promptInstall); });

  function showInstalled() {
    $('#installed-state').hidden = false;
    $$('.panel').forEach(function (p) { p.hidden = true; });
    $('.tabs').hidden = true;
    updateHeroCta(true);
  }

  // ------------------------------------------------------ Bouton principal
  function updateHeroCta(installed) {
    var label = $('#cta-primary-label');
    if (installed || isStandalone) { label.textContent = "Ouvrir l'application"; return; }
    if (deferredPrompt) { label.textContent = platform === 'desktop' ? 'Installer sur cet ordinateur' : "Installer l'application"; return; }
    label.textContent = {
      android: 'Installer sur Android',
      ios: platform === 'ios' && (isIPadOS || /iPad/.test(ua)) ? "Installer sur l'iPad" : "Installer sur l'iPhone",
      desktop: 'Installer sur mon téléphone'
    }[platform];
  }
  $('#cta-primary').addEventListener('click', function () {
    if (isStandalone) { window.location.href = APP_URL; return; }
    if (promptInstall()) return;
    $('#installer').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  // ------------------------------------------------------- Guide iPhone animé
  var iosTimer = null;
  var iosStart = 0;
  function startIosGuide() {
    if (iosTimer || reducedMotion) return;
    var steps = $$('#ios-steps li');
    // Recale les animations CSS sur le surlignage des étapes (cycle de 12 s).
    $$('.panel__side--anim *').forEach(function (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
    iosStart = performance.now();
    var tick = function () {
      var t = ((performance.now() - iosStart) / 1000) % 12;
      var active = Math.min(3, Math.floor(t / 3));
      steps.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
    };
    tick();
    iosTimer = setInterval(tick, 250);
  }
  function stopIosGuide() {
    clearInterval(iosTimer);
    iosTimer = null;
  }

  // ------------------------------------------------------------------ QR code
  var qrDone = false;
  function renderQr() {
    if (qrDone || typeof window.qrcode !== 'function') return;
    var url = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    var qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    var path = $('#qr path');
    if (path) path.setAttribute('fill', '#0F172A');
    $('#qr-url').textContent = url.replace(/^https?:\/\//, '');
    qrDone = true;
  }
  window.addEventListener('load', function () { if (!$('[data-panel="desktop"]').hidden) renderQr(); });

  // ---------------------------------------------------------- Démo réelle
  var DESIGN = { phone: { w: 390, h: 844 }, tablet: { w: 1194, h: 834 } };
  var device = $('#device');
  var screen = $('#device-screen');
  var poster = $('#device-poster');
  var currentDevice = 'phone';
  var iframe = null;

  function fitIframe() {
    if (!iframe) return;
    var d = DESIGN[currentDevice];
    var scale = screen.clientWidth / d.w;
    iframe.style.width = d.w + 'px';
    iframe.style.height = (screen.clientHeight / scale) + 'px';
    iframe.style.transform = 'scale(' + scale + ')';
  }
  if ('ResizeObserver' in window) new ResizeObserver(fitIframe).observe(screen);

  function setDevice(kind) {
    currentDevice = kind;
    device.classList.toggle('device--phone', kind === 'phone');
    device.classList.toggle('device--tablet', kind === 'tablet');
    poster.src = poster.dataset[kind];
    $$('.segmented button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.device === kind)); });
    setTimeout(fitIframe, 480); // après la transition de taille du cadre
  }
  $$('.segmented button').forEach(function (b) { b.addEventListener('click', function () { setDevice(b.dataset.device); }); });

  function launchDemo() {
    // Sur un téléphone, la démo s'ouvre en plein écran : un cadre dans l'écran serait illisible.
    if (window.innerWidth < 700) { window.location.href = APP_URL; return; }
    if (iframe) return;
    $('#demo-loading').hidden = false;
    $('#launch-demo').hidden = true;
    iframe = document.createElement('iframe');
    iframe.title = 'Démo de Biopole Esthétique';
    iframe.src = APP_URL;
    iframe.setAttribute('allow', 'clipboard-write; web-share');
    iframe.addEventListener('load', function () {
      setTimeout(function () { $('#demo-loading').hidden = true; poster.hidden = true; }, 600);
    });
    screen.appendChild(iframe);
    fitIframe();
  }
  $('#launch-demo').addEventListener('click', launchDemo);
  $('#cta-demo').addEventListener('click', function () { setTimeout(launchDemo, reducedMotion ? 0 : 450); });

  // --------------------------------------------------------------- Démarrage
  if (platform !== 'desktop' || !window.matchMedia('(min-width: 1000px)').matches) {
    // Sur tablette, proposer d'emblée le format tablette.
    if (isIPadOS || /iPad|Tablet/.test(ua) || (platform === 'android' && !/Mobile/.test(ua))) setDevice('tablet');
  }
  var detected = $('#detected-device');
  detected.textContent = deviceLabel[platform];
  detected.hidden = false;
  if (isStandalone) showInstalled(); else selectPlatform(platform);
  updateHeroCta();
  $('#year').textContent = String(new Date().getFullYear());
  if (/[?&]demo\b/.test(window.location.search)) launchDemo();
})();
