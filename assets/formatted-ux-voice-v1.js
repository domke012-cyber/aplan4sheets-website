/* Static, optional narration. No browser speech synthesis or visitor TTS calls. */
(function () {
  'use strict';
  const clips = window.FormattedUxNarration.clips;
  const audio = document.getElementById('fxNarrationAudio');
  audio.preload = 'none';
  let enabled = true, started = false, step = null, ticket = 0, error = '';
  function render() {
    document.querySelectorAll('[data-voice-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = enabled ? 'Voice on' : 'Voice off';
    });
    document.querySelectorAll('[data-voice-replay]').forEach(button => { button.disabled = !step; });
    document.querySelectorAll('[data-voice-status]').forEach(node => {
      node.textContent = error || (!enabled ? 'Silent walkthrough' : !started ? 'AI narration · starts when you begin' : 'AI narration');
    });
    document.querySelectorAll('[data-voice-transcript]').forEach(node => {
      node.textContent = clips[step]?.text || '';
      node.closest('details').hidden = !step;
    });
  }
  function stop() {
    ++ticket;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  function play() {
    stop(); error = '';
    if (!enabled || !started || !step) { render(); return; }
    const attempt = ticket;
    audio.src = clips[step].src;
    const onError = () => {
      if (attempt !== ticket) return;
      error = 'Audio unavailable. Read the step or select Replay.';
      render();
    };
    try { Promise.resolve(audio.play()).catch(onError); }
    catch (_) { onError(); }
    render();
  }
  document.querySelectorAll('[data-voice-toggle]').forEach(button => button.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled && step) started = true;
    play();
  }));
  document.querySelectorAll('[data-voice-replay]').forEach(button => button.addEventListener('click', () => {
    if (!step) return;
    enabled = true; started = true; play();
  }));
  // Leaving the tab silences narration; Replay resumes the current step.
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.FormattedUxVoice = {
    begin() { started = true; render(); },
    setStep(next) {
      next = Object.hasOwn(clips, next) ? next : null;
      if (next === step) return;
      step = next; play();
    },
    reset() { step = null; started = false; error = ''; stop(); render(); }
  };
  render();
})();
