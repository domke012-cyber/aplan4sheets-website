/* Progressive enhancement for ordinary homepage navigation; no focus trap. */
(function () {
  'use strict';

  function initializeNavigation() {
    const nav = document.getElementById('homepageNav');
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    if (!nav || !toggle || !menu || nav.classList.contains('nav-enhanced') || typeof window.matchMedia !== 'function') return;

    const desktop = window.matchMedia('(min-width: 900px)');
    const desktopLinks = nav.querySelector('.home-nav-links');

    function setExpanded(open) {
      const expanded = Boolean(open && !desktop.matches);
      menu.hidden = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
    }

    function syncViewport() {
      const focused = document.activeElement;
      const mobileFocused = focused === toggle || menu.contains(focused);
      const desktopFocused = desktopLinks?.contains(focused);
      const matchingLink = menu.contains(focused) && focused.closest('a[href]');
      setExpanded(false);

      if (desktop.matches && mobileFocused) {
        const equivalent = matchingLink && [...(desktopLinks?.querySelectorAll('a[href]') || [])]
          .find(link => link.href === matchingLink.href);
        const fallback = nav.querySelector('#homeBrand') || desktopLinks?.querySelector('a[href]');
        (equivalent || fallback)?.focus();
      } else if (!desktop.matches && desktopFocused) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', () => setExpanded(menu.hidden));
    menu.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link) return;
      const newContext = link.target.toLowerCase() === '_blank' ||
        (event.button === 0 && (event.ctrlKey || event.metaKey || event.shiftKey));
      const returnFocus = newContext && menu.contains(document.activeElement);
      setExpanded(false);
      // A new tab/window leaves this document open: don't strand focus in its
      // now-hidden links. Same-tab navigation keeps the browser's normal focus.
      if (returnFocus) toggle.focus();
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target)) setExpanded(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || menu.hidden) return;
      const returnFocus = document.activeElement === toggle || menu.contains(document.activeElement);
      setExpanded(false);
      if (returnFocus) toggle.focus();
      event.preventDefault();
    });
    nav.addEventListener('focusout', event => {
      if (!nav.contains(event.relatedTarget)) setExpanded(false);
    });
    if (desktop.addEventListener) desktop.addEventListener('change', syncViewport);
    else desktop.addListener(syncViewport);

    toggle.hidden = false;
    setExpanded(false);
    nav.classList.add('nav-enhanced');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeNavigation, {once: true});
  else initializeNavigation();
})();
