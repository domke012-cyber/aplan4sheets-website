/* Optional movement for already-visible content. Failure leaves content still. */
(function () {
  'use strict';

  function enhanceContent() {
    const elements = [...document.querySelectorAll('.fade-in')];
    if (!elements.length || typeof window.matchMedia !== 'function' || typeof window.IntersectionObserver !== 'function') return;

    let motion;
    try { motion = window.matchMedia('(prefers-reduced-motion: reduce)'); }
    catch (_) { return; }
    if (motion.matches) return;

    let observer;
    let stopped = false;
    const pending = new Set(elements);
    function stop() {
      stopped = true;
      try { observer?.disconnect(); } catch (_) { /* Static content remains usable. */ }
      for (const element of elements) element.classList.remove('content-reveal-enter');
      pending.clear();
    }

    try {
      observer = new window.IntersectionObserver(entries => {
        if (stopped) return;
        try {
          for (const entry of entries) {
            if (!entry.isIntersecting || !pending.has(entry.target)) continue;
            const element = entry.target;
            pending.delete(element);
            observer.unobserve(element);
            if (motion.matches || element.contains(document.activeElement)) continue;
            element.classList.add('content-reveal-enter');
            element.addEventListener('animationend', event => {
              if (event.target === element && event.animationName === 'content-reveal-v1') {
                element.classList.remove('content-reveal-enter');
              }
            });
          }
          if (!pending.size) observer.disconnect();
        } catch (_) { stop(); }
      }, {threshold: 0.1});
      for (const element of elements) observer.observe(element);
      const onMotionChange = () => { if (motion.matches) stop(); };
      if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
      else if (motion.addListener) motion.addListener(onMotionChange);
    } catch (_) { stop(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceContent, {once: true});
  else enhanceContent();
})();
