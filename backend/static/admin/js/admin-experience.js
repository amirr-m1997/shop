/* Premium, dependency-free enhancements for Django's stock admin markup. */
(function () {
  'use strict';

  var RECENT_KEY = 'shop-admin:recent-models';
  var FAVORITES_KEY = 'shop-admin:favorite-models';
  var MAX_RECENT = 7;
  var scrollFrame = null;

  function readJson(key, fallback) {
    try { return JSON.parse(window.localStorage.getItem(key)) || fallback; }
    catch (error) { return fallback; }
  }

  function writeJson(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { /* Storage being unavailable must not affect the admin. */ }
  }

  function cleanLabel(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function modelUrl() {
    var match = window.location.pathname.match(/^(\/admin\/[^/]+\/[^/]+)\//);
    return match ? match[1] + '/' : null;
  }

  function isChangeList() {
    return /^\/admin\/[^/]+\/[^/]+\/$/.test(window.location.pathname);
  }

  function stateKey(path) {
    return 'shop-admin:list-state:' + path;
  }

  function rememberListState() {
    if (!isChangeList()) return;
    var state = {
      url: window.location.pathname + window.location.search,
      scrollY: window.scrollY,
      savedAt: Date.now()
    };
    try { window.sessionStorage.setItem(stateKey(window.location.pathname), JSON.stringify(state)); }
    catch (error) { /* Keep normal navigation if session storage is unavailable. */ }
  }

  function readListState(path) {
    try { return JSON.parse(window.sessionStorage.getItem(stateKey(path))); }
    catch (error) { return null; }
  }

  function markReturnToList() {
    if (!isChangeList()) return;
    rememberListState();
    try { window.sessionStorage.setItem('shop-admin:pending-return', window.location.pathname); }
    catch (error) { /* no-op */ }
  }

  function requestListRestore() {
    var target = modelUrl();
    if (!target) return;
    try {
      if (window.sessionStorage.getItem('shop-admin:pending-return') === target) {
        window.sessionStorage.setItem('shop-admin:restore-list', target);
      }
    } catch (error) { /* no-op */ }
  }

  function restoreListState() {
    if (!isChangeList()) return;
    var path = window.location.pathname;
    try {
      if (window.sessionStorage.getItem('shop-admin:restore-list') !== path) return;
      window.sessionStorage.removeItem('shop-admin:restore-list');
      window.sessionStorage.removeItem('shop-admin:pending-return');
    } catch (error) { return; }

    var state = readListState(path);
    if (!state || typeof state.scrollY !== 'number') return;

    // Django already preserves filters/search/order in its redirect URL. If a
    // custom admin redirect drops them, restore the exact original list URL.
    if (state.url && state.url !== window.location.pathname + window.location.search) {
      try { window.sessionStorage.setItem('shop-admin:restore-list', path); }
      catch (error) { /* The redirect still preserves Django's normal flow. */ }
      window.location.replace(state.url);
      return;
    }

    var tries = 0;
    var restore = function () {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= state.scrollY || tries >= 30) {
        window.scrollTo({ top: Math.min(state.scrollY, Math.max(0, maxScroll)), behavior: 'auto' });
        return;
      }
      tries += 1;
      window.requestAnimationFrame(restore);
    };
    window.requestAnimationFrame(function () { window.requestAnimationFrame(restore); });
  }

  function updateRecentModels() {
    var url = modelUrl();
    if (!url) return;
    var currentLink = document.querySelector('#nav-sidebar a[href="' + CSS.escape(url) + '"]');
    if (!currentLink) return;
    var item = { url: url, label: cleanLabel(currentLink.textContent) };
    var recent = readJson(RECENT_KEY, []).filter(function (entry) { return entry.url !== url; });
    recent.unshift(item);
    writeJson(RECENT_KEY, recent.slice(0, MAX_RECENT));
  }

  function makeQuickList(entries, emptyText) {
    var list = document.createElement('div');
    list.className = 'admin-quick-list';
    if (!entries.length) {
      list.innerHTML = '<p class="admin-sidebar-empty">' + emptyText + '</p>';
      return list;
    }
    entries.forEach(function (entry) {
      var link = document.createElement('a');
      link.href = entry.url;
      link.textContent = entry.label;
      list.appendChild(link);
    });
    return list;
  }

  function setupSidebar() {
    var sidebar = document.getElementById('nav-sidebar');
    if (!sidebar) return;
    var search = document.getElementById('admin-sidebar-search');
    var dynamic = document.getElementById('admin-sidebar-dynamic');
    var modules = Array.prototype.slice.call(sidebar.querySelectorAll('.module'));
    var currentUrl = modelUrl();

    modules.forEach(function (module, index) {
      module.classList.add('admin-app-group');
      var appTitle = module.querySelector('caption');
      if (!appTitle) return;
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'admin-app-toggle';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = '<span class="admin-app-icon" aria-hidden="true">◈</span><span>' + appTitle.textContent + '</span><span class="admin-chevron" aria-hidden="true">⌄</span>';
      appTitle.replaceWith(toggle);
      toggle.addEventListener('click', function () {
        var collapsed = module.classList.toggle('is-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });

      module.querySelectorAll('a').forEach(function (link) {
        if (link.getAttribute('href') === currentUrl) link.classList.add('is-current');
        var pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'admin-model-pin';
        pin.title = 'افزودن به نشان‌شده‌ها';
        pin.setAttribute('aria-label', 'افزودن به نشان‌شده‌ها');
        pin.textContent = '☆';
        link.parentNode.insertBefore(pin, link.nextSibling);
        pin.addEventListener('click', function (event) {
          event.preventDefault();
          var favorites = readJson(FAVORITES_KEY, []);
          var url = link.getAttribute('href');
          var exists = favorites.some(function (entry) { return entry.url === url; });
          favorites = exists ? favorites.filter(function (entry) { return entry.url !== url; }) : favorites.concat([{ url: url, label: cleanLabel(link.textContent) }]);
          writeJson(FAVORITES_KEY, favorites);
          pin.classList.toggle('is-pinned', !exists);
          pin.textContent = exists ? '☆' : '★';
          pin.title = exists ? 'افزودن به نشان‌شده‌ها' : 'حذف از نشان‌شده‌ها';
        });
        if (readJson(FAVORITES_KEY, []).some(function (entry) { return entry.url === link.getAttribute('href'); })) {
          pin.classList.add('is-pinned');
          pin.textContent = '★';
          pin.title = 'حذف از نشان‌شده‌ها';
        }
      });
    });

    function showQuickList(kind) {
      dynamic.innerHTML = '';
      modules.forEach(function (module) { module.hidden = kind !== 'all'; });
      if (kind === 'all') return;
      dynamic.appendChild(makeQuickList(readJson(kind === 'favorites' ? FAVORITES_KEY : RECENT_KEY, []), kind === 'favorites' ? 'هنوز مدلی نشان نشده است.' : 'هنوز مدلی باز نشده است.'));
    }

    sidebar.querySelectorAll('[data-sidebar-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        sidebar.querySelectorAll('[data-sidebar-view]').forEach(function (item) { item.classList.remove('is-active'); });
        button.classList.add('is-active');
        showQuickList(button.dataset.sidebarView);
      });
    });

    search.addEventListener('input', function () {
      var query = cleanLabel(search.value).toLocaleLowerCase('fa');
      sidebar.querySelectorAll('[data-sidebar-view]').forEach(function (button) { button.classList.toggle('is-active', false); });
      dynamic.innerHTML = '';
      modules.forEach(function (module) {
        var matches = !query || cleanLabel(module.textContent).toLocaleLowerCase('fa').indexOf(query) !== -1;
        module.hidden = !matches;
        if (query && matches) module.classList.remove('is-collapsed');
      });
    });
  }

  function setupNavigationAndScroll() {
    if (isChangeList()) {
      restoreListState();
      document.addEventListener('click', function (event) {
        var link = event.target.closest('a');
        if (link && link.href && !link.target && !event.ctrlKey && !event.metaKey) markReturnToList();
      });
      window.addEventListener('scroll', function () {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(function () { scrollFrame = null; rememberListState(); });
      }, { passive: true });
      window.addEventListener('pagehide', rememberListState);
    } else {
      document.querySelectorAll('form').forEach(function (form) {
        form.addEventListener('submit', function (event) {
          var submitter = event.submitter;
          if (submitter && (submitter.name === '_continue' || submitter.name === '_addanother')) return;
          requestListRestore();
        });
      });
    }
  }

  function setupDashboard() {
    var dashboard = document.querySelector('.admin-dashboard');
    if (!dashboard) return;
    var sidebar = document.getElementById('nav-sidebar');
    var modelCount = sidebar ? sidebar.querySelectorAll('tbody a').length : 0;
    var favorites = readJson(FAVORITES_KEY, []);
    var recent = readJson(RECENT_KEY, []);
    dashboard.querySelector('[data-dashboard-stat="models"]').textContent = modelCount.toLocaleString('fa-IR');
    dashboard.querySelector('[data-dashboard-stat="favorites"]').textContent = favorites.length.toLocaleString('fa-IR');
    dashboard.querySelector('[data-dashboard-stat="recent"]').textContent = recent.length.toLocaleString('fa-IR');
    dashboard.querySelector('[data-dashboard-favorites]').appendChild(makeQuickList(favorites, 'برای ساخت میانبر، ستارهٔ کنار یک مدل را انتخاب کنید.'));
    dashboard.querySelector('[data-dashboard-recent]').appendChild(makeQuickList(recent, 'با باز کردن مدل‌ها، میانبر آن‌ها اینجا نمایش داده می‌شود.'));
    dashboard.querySelector('[data-dashboard-search]').addEventListener('click', function () {
      var search = document.getElementById('admin-sidebar-search');
      if (search) search.focus();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateRecentModels();
    setupSidebar();
    setupNavigationAndScroll();
    setupDashboard();
  });
}());
