/* ============================================
   SCHOOL APP (PWA) — pwa.js
   Royal Crystal Academy — loaded on every page
   ============================================
   • Registers the service worker (/sw.js — public files only, never
     API data; see that file).
   • "📱 Install School App" button on the start screen, homepage, parent
     login, parent portal and staff login:
       - Android/Chrome/Edge: opens the browser's own install prompt
       - iPhone/iPad Safari: shows Share → "Add to Home Screen" steps
       - other browsers: shows where to find "Install / Add to Home screen"
     Shown on every public page; hidden when already running as the
     installed app or after install. "Not now" hides it only until the
     next page opens. Nothing is stored on the phone.
   • A bar while offline ("live information needs internet").
   • When a new version is deployed, a small "Refresh" bar — never a
     forced reload, so nobody loses what they're doing.
*/
(function () {
  // Every public page of the website, plus the app start screen, parent
  // portal and logins.
  const INSTALL_PAGES = ['/', '/index.html', '/app.html', '/parent-login.html', '/admin/parent-portal.html', '/admin/login.html',
    '/about.html', '/admissions.html', '/news-events.html', '/gallery.html', '/ict-department.html',
    '/academic-calendar.html', '/contact.html'];
  const DISMISS_KEY = 'rca_pwa_install_dismissed_until';  // old 3-day hide; cleared below
  const COLOR = '#6B0F1A';

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;
  const path = location.pathname.replace(/\/+$/, '') || '/';

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(reg => {
        // Look for a newer version on every page load and every 30 minutes.
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) showBar('update', '🔄 A new version of the school app is ready.', 'Refresh', () => location.reload());
      });
    });
  }

  /* ---------- styles (injected once) ---------- */
  function css() {
    if (document.getElementById('rcaPwaCss')) return;
    const s = document.createElement('style');
    s.id = 'rcaPwaCss';
    s.textContent = `
      .rca-pwa-btn{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9000;display:flex;align-items:center;gap:8px;
        background:${COLOR};color:#fff;border:0;border-radius:999px;padding:12px 16px 12px 14px;font:700 15px Arial,sans-serif;
        box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;min-height:48px}
      .rca-pwa-btn .x{margin-left:4px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;font-size:14px}
      .rca-pwa-bar{position:fixed;left:0;right:0;top:0;z-index:9500;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;
        padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top));font:600 14px Arial,sans-serif;text-align:center}
      .rca-pwa-bar.offline{background:#92400e;color:#fff}
      .rca-pwa-bar.update{background:#065f46;color:#fff;top:auto;bottom:0;padding-bottom:calc(10px + env(safe-area-inset-bottom))}
      .rca-pwa-bar button{background:#fff;color:#111827;border:0;border-radius:8px;padding:8px 14px;font:700 14px Arial,sans-serif;min-height:40px;cursor:pointer}
      .rca-pwa-modal{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px}
      @media(min-width:600px){.rca-pwa-modal{align-items:center}}
      .rca-pwa-sheet{background:#fff;color:#1f2937;border-radius:18px;max-width:440px;width:100%;padding:22px 20px calc(20px + env(safe-area-inset-bottom));font:16px/1.5 Arial,sans-serif;max-height:90vh;overflow:auto}
      .rca-pwa-sheet h3{margin:0 0 6px;color:${COLOR};font-size:19px;display:flex;align-items:center;gap:10px}
      .rca-pwa-sheet h3 img{width:40px;height:40px;object-fit:contain}
      .rca-pwa-sheet ol{padding-left:22px;margin:12px 0}.rca-pwa-sheet li{margin-bottom:10px}
      .rca-pwa-sheet .ok{width:100%;min-height:50px;border:0;border-radius:12px;background:${COLOR};color:#fff;font:700 16px Arial,sans-serif;cursor:pointer;margin-top:6px}
      .rca-pwa-sheet .soft{width:100%;min-height:44px;border:0;background:none;color:#6b7280;font:600 15px Arial,sans-serif;cursor:pointer}
      .rca-pwa-sheet .why{background:#f5eef0;border-radius:10px;padding:10px 12px;font-size:14px;color:#4b5563}
      .rca-pwa-ico{display:inline-flex;vertical-align:middle;background:#eef2ff;border-radius:6px;padding:2px 6px;font-weight:700}`;
    document.head.appendChild(s);
  }

  function showBar(kind, text, actionLabel, action) {
    css();
    let bar = document.querySelector(`.rca-pwa-bar.${kind}`);
    if (!bar) { bar = document.createElement('div'); bar.className = `rca-pwa-bar ${kind}`; document.body.appendChild(bar); }
    bar.innerHTML = `<span>${text}</span>`;
    if (actionLabel) { const b = document.createElement('button'); b.textContent = actionLabel; b.onclick = action; bar.appendChild(b); }
  }
  const hideBar = kind => document.querySelector(`.rca-pwa-bar.${kind}`)?.remove();

  /* ---------- offline / online ---------- */
  function offlineBar() {
    showBar('offline', "📡 You're offline. Results, fees and signing in need an internet connection.");
  }
  window.addEventListener('offline', offlineBar);
  window.addEventListener('online', () => hideBar('offline'));
  document.addEventListener('DOMContentLoaded', () => { if (!navigator.onLine) offlineBar(); });

  /* ---------- install button ---------- */
  let deferredPrompt = null;
  // "Not now" / ✕ only hides the button until the next page opens, so it is
  // never lost on a phone where someone closed it by mistake.
  let dismissedThisPage = false;
  try { localStorage.removeItem(DISMISS_KEY); } catch (e) {}
  const canShowHere = () => INSTALL_PAGES.includes(path) && !isStandalone() && !dismissedThisPage;

  function sheet(html) {
    css();
    const m = document.createElement('div');
    m.className = 'rca-pwa-modal';
    m.innerHTML = `<div class="rca-pwa-sheet">${html}</div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
  }
  const header = `<h3><img src="/assets/icons/icon-192.png" alt="">Install the School App</h3>`;
  const why = `<p class="why">📱 Put Royal Crystal Academy on your phone's home screen and open it like any other app.
     It's free, uses very little space, and <strong>doesn't need the Play Store or App Store</strong>.</p>`;

  function showInstructions() {
    const steps = isIOS
      ? `<ol><li>Tap the <span class="rca-pwa-ico">Share ⬆</span> button at the bottom of Safari (on iPad it's at the top).</li>
           <li>Scroll down and tap <strong>“Add to Home Screen”</strong> <span class="rca-pwa-ico">＋</span>.</li>
           <li>Tap <strong>Add</strong>. The school badge appears on your home screen.</li></ol>
         <p style="font-size:14px;color:#6b7280">Use <strong>Safari</strong> — on iPhone other browsers can't add apps to the home screen.</p>`
      : `<ol><li>Tap the browser menu <span class="rca-pwa-ico">⋮</span> (top-right corner).</li>
           <li>Tap <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.</li>
           <li>Tap <strong>Install</strong> / <strong>Add</strong>. The school badge appears on your home screen.</li></ol>`;
    const m = sheet(`${header}${why}${steps}<button class="ok">OK, got it</button><button class="soft">Not now</button>`);
    m.querySelector('.ok').onclick = () => m.remove();
    m.querySelector('.soft').onclick = () => { dismiss(); m.remove(); };
  }

  function dismiss() {
    dismissedThisPage = true;
    document.querySelector('.rca-pwa-btn')?.remove();
  }

  async function onInstallClick() {
    // iPhone/iPad have no install prompt — always show the Safari steps.
    if (deferredPrompt && !isIOS) {
      const m = sheet(`${header}${why}<button class="ok">Install now</button><button class="soft">Not now</button>`);
      m.querySelector('.soft').onclick = () => { dismiss(); m.remove(); };
      m.querySelector('.ok').onclick = async () => {
        m.remove();
        const p = deferredPrompt; deferredPrompt = null;
        p.prompt();
        const choice = await p.userChoice.catch(() => null);
        if (choice && choice.outcome === 'accepted') document.querySelector('.rca-pwa-btn')?.remove();
      };
      return;
    }
    showInstructions();
  }

  function showButton() {
    if (!canShowHere() || document.querySelector('.rca-pwa-btn')) return;
    css();
    const b = document.createElement('button');
    b.className = 'rca-pwa-btn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Install the school app');
    b.innerHTML = `<span>📱 Install School App</span><span class="x" role="button" aria-label="Not now" title="Not now">✕</span>`;
    b.addEventListener('click', e => {
      if (e.target.classList.contains('x')) { e.stopPropagation(); dismiss(); return; }
      onInstallClick();
    });
    document.body.appendChild(b);
  }

  // Chrome/Edge/Samsung Internet: the browser says the site is installable.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (document.body) showButton(); else document.addEventListener('DOMContentLoaded', showButton);
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.querySelector('.rca-pwa-btn')?.remove();
    // (No long "dismissed" timer here: if the app is later removed, the
    // browser offers it again and so do we.)
  });
  // iPhone/iPad (no install prompt exists) and other mobile browsers:
  // offer the step-by-step instructions instead.
  document.addEventListener('DOMContentLoaded', () => {
    if (isIOS) showButton();
    else if (isMobile) setTimeout(() => { if (!deferredPrompt) showButton(); }, 3000);
  });

  /* ---------- printable documents inside the app ----------
     Statements, reports and the school calendar are built by writing a
     full HTML document into a new window. Installed apps and phone
     browsers handle pop-up windows badly (blank page, or nothing at all),
     so there the document opens in a full-screen viewer (an iframe) on
     top of the page instead. Returns an object with the same shape the
     print modules use — .document, .print(), .close() — or a real
     window on desktop browsers. */
  function openDocWindow() {
    if (!(isStandalone() || isMobile)) return window.open('', '_blank');
    css();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9900;background:#e5e7eb;display:flex;flex-direction:column';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close');
    close.style.cssText = 'position:absolute;top:calc(8px + env(safe-area-inset-top));right:10px;z-index:2;width:44px;height:44px;border-radius:50%;border:0;background:rgba(17,24,39,.8);color:#fff;font:700 18px Arial;cursor:pointer';
    const frame = document.createElement('iframe');
    frame.title = 'Document';
    frame.style.cssText = 'flex:1;width:100%;border:0;background:#fff;padding-top:env(safe-area-inset-top)';
    ov.appendChild(frame); ov.appendChild(close);
    document.body.appendChild(ov);
    document.documentElement.style.overflow = 'hidden';
    const handle = {
      get document() { return frame.contentDocument; },
      get closed() { return !ov.isConnected; },
      print() { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { window.print(); } },
      close() { ov.remove(); document.documentElement.style.overflow = ''; },
      focus() {}
    };
    close.onclick = () => handle.close();
    // The document's own Close / Print buttons call window.close()/print()
    // inside the frame — point them at the viewer each time it's rewritten.
    const patch = () => { try { frame.contentWindow.close = handle.close; } catch (e) {} };
    frame.addEventListener('load', patch);
    patch();
    return handle;
  }

  /* ---------- Refresh button inside the installed app ----------
     An installed app has no browser refresh button, so add one to the
     top bar. It checks for a new version first, then reloads. */
  async function refreshApp(btn) {
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
    } catch (e) { /* offline or no worker — just reload */ }
    location.reload();
  }
  function addRefreshButton() {
    if (!isStandalone() || document.getElementById('rcaRefreshBtn')) return;
    const b = document.createElement('button');
    b.id = 'rcaRefreshBtn';
    b.type = 'button';
    b.title = 'Refresh — get the latest information and app update';
    b.setAttribute('aria-label', 'Refresh');
    b.innerHTML = '&#x21bb;';
    b.style.cssText = `width:40px;height:40px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;color:${COLOR};font:700 22px Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1`;
    b.onclick = () => refreshApp(b);
    const bar = document.querySelector('.pp-topbar-right, .topbar-user, .admin-topbar');
    if (bar) {
      bar.insertBefore(b, bar.firstChild);
    } else {
      b.style.cssText += `;position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9000;box-shadow:0 4px 14px rgba(0,0,0,.2)`;
      document.body.appendChild(b);
    }
  }
  document.addEventListener('DOMContentLoaded', addRefreshButton);

  // Permanent "Install the School App" links (class rca-install-link) on
  // the parent login and start screen: always work, even after "Not now",
  // and are hidden only when already running as the installed app.
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".rca-install-link").forEach(a => {
      if (isStandalone()) { a.style.display = "none"; return; }
      a.addEventListener("click", e => { e.preventDefault(); onInstallClick(); });
    });
  });

  window.RCA_PWA = { showInstructions, isStandalone, openDocWindow, refreshApp, install: onInstallClick };
})();
