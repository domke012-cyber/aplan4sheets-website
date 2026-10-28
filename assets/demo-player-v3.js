/* v3: preserve user-paced playback and offer the next walkthrough on completion. */
(function (root) {
  'use strict';
  const CANCELLED = Symbol('cancelled scene');
  class DemoPlayer {
    constructor({ scenes, actions, reset = () => {}, captions = [] }) {
      this.scenes = scenes;
      this.actions = actions;
      this.reset = reset;
      const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
      this.journey = root.WalkthroughJourney?.[slug];
      this.captions = captions.length ? captions : (root.DemoNarration?.[slug] || []);
      this.embed = new URLSearchParams(location.search).has('embed');
      this.loop = this.embed && new URLSearchParams(location.search).has('loop');
      this.jobs = new Set();
      this.index = 0;
      this.generation = 0;
      this.running = false;
      this.muted = this.embed;
      this.finished = false;
      this.started = false;
      this.awaitingNext = false;
      this.autoAdvance = this.embed;
      this.motionPaused = false;
      this.actionTarget = null;
      this.clips = Array.from(document.querySelectorAll('audio'));
      this.clips.forEach((clip, i) => {
        clip.addEventListener('loadedmetadata', () => {
          if (this.scenes[i] && Number.isFinite(clip.duration)) {
            this.scenes[i].duration = Math.max(this.scenes[i].duration, clip.duration * 1000 + 500);
          }
        });
        clip.addEventListener('ended', () => {
          if (i === this.index) { this.audioDone = true; this.advance(); }
        });
      });
    }
    mount() {
      const controls = document.querySelector('.demo-controls');
      this.status = document.createElement('span');
      this.status.className = 'demo-status';
      this.status.setAttribute('role', 'status');
      controls?.append(this.status);
      this.notes = document.createElement('div');
      this.notes.className = 'demo-notes';
      this.notes.setAttribute('aria-live', 'off');
      controls?.insertAdjacentElement('afterend', this.notes);
      this.mountJourney();
      const play = document.getElementById('playBtn');
      if (play) { play.dataset.tourPlay = ''; play.onclick = () => this.toggle(); }
      this.mountStepControls(controls);
      if (this.status) controls?.append(this.status);
      for (const dialog of document.querySelectorAll('dialog')) {
        const bar = document.createElement('div');
        bar.className = 'walkthrough-dialog-controls';
        dialog.querySelector('header, .dialog-header')?.insertAdjacentElement('afterend', bar);
        if (!bar.isConnected) dialog.prepend(bar);
        this.mountStepControls(bar, true);
      }
      const restart = document.getElementById('restartBtn') || document.querySelector('.ctrl-restart');
      if (restart) restart.onclick = () => this.restart();
      const mute = document.getElementById('muteBtn');
      if (mute) {
        mute.dataset.tourMute = '';
        mute.onclick = () => this.toggleMute();
        mute.hidden = this.clips.length === 0;
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.running) this.pause();
      });
      // Manual exploration can disable the tour's Play control after pausing it.
      for (const event of ['click', 'change', 'input']) document.addEventListener(event, () => this.updateCue());
      this.reset();
      this.scene(0);
      this.update();
      if (this.embed && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.play();
    }
    mountJourney() {
      if (!this.journey || this.embed) return;
      const card = document.createElement('section');
      card.className = 'walkthrough-journey'; card.hidden = true;
      card.setAttribute('aria-labelledby', 'journeyHeading');
      const copy = document.createElement('div'); copy.className = 'journey-copy';
      const heading = document.createElement('h2'); heading.id = 'journeyHeading';
      heading.textContent = this.journey.heading;
      const detail = document.createElement('p'); detail.textContent = this.journey.detail;
      copy.append(heading, detail);
      const actions = document.createElement('div'); actions.className = 'journey-actions';
      const next = document.createElement('a'); next.id = 'nextWalkthrough';
      next.className = 'journey-next'; next.href = this.journey.href;
      next.textContent = this.journey.label;
      const guide = document.createElement('a'); guide.className = 'journey-guide';
      guide.href = this.journey.guide || '/guide.html'; guide.textContent = 'Setup guide';
      actions.append(next, guide);
      if (this.journey.alternative) {
        const alternative = document.createElement('a');
        alternative.className = 'journey-alternative';
        alternative.href = this.journey.alternative.href;
        alternative.textContent = this.journey.alternative.label;
        actions.append(alternative);
      }
      card.append(copy, actions); this.notes.after(card);
      this.journeyCard = card; this.journeyLink = next;
    }
    mountStepControls(container, dialog = false) {
      if (!container) return;
      const button = (key, text, action) => {
        const node = document.createElement('button');
        node.type = 'button'; node.dataset[key] = ''; node.textContent = text;
        node.onclick = action; container.append(node); return node;
      };
      if (dialog) {
        const label = document.createElement('p');
        label.dataset.tourStep = ''; label.className = 'walkthrough-step-label';
        container.append(label);
        button('tourPlay', 'Resume step', () => this.toggle());
        button('tourMute', 'Voice on', () => this.toggleMute());
      }
      const next = button('tourNext', 'Next step →', () => this.nextStep());
      container.querySelector('[data-tour-play]')?.insertAdjacentElement('afterend', next);
      if (!dialog) next.id = 'nextStepBtn';
      button('tourReplay', 'Replay voice', () => this.replayNarration());
      const label = document.createElement('label');
      label.className = 'walkthrough-auto';
      const auto = document.createElement('input'); auto.type = 'checkbox'; auto.dataset.tourAuto = '';
      auto.checked = this.autoAdvance;
      auto.onchange = () => {
        this.autoAdvance = auto.checked; this.update();
        if (this.autoAdvance && this.awaitingNext) this.nextStep();
      };
      label.append(auto, document.createTextNode('Auto-play steps')); container.append(label);
      button('tourMotion', 'Pause animation', () => {
        this.motionPaused = !this.motionPaused;
        document.body.classList.toggle('walkthrough-motion-paused', this.motionPaused);
        this.update();
      });
      if (dialog) {
        const note = document.createElement('p'); note.dataset.tourNote = '';
        note.className = 'walkthrough-step-note'; container.append(note);
      }
    }
    setActionTarget(target) { this.actionTarget = target; this.updateCue(); }
    updateCue() {
      document.querySelectorAll('.walkthrough-next-action').forEach(node => node.classList.remove('walkthrough-next-action'));
      if (this.embed || this.running || (this.finished && !this.actionTarget && !this.journeyLink) || (this.manualExploration && !this.actionTarget)) return;
      const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      const container = dialog?.querySelector('.walkthrough-dialog-controls') || document.querySelector('.demo-controls');
      let target = this.actionTarget || (this.finished ? this.journeyLink : null) || container?.querySelector(this.awaitingNext ? '[data-tour-next]' : '[data-tour-play]');
      if (target?.disabled && target.hasAttribute('data-tour-play')) target = document.getElementById('restartBtn') || document.querySelector('.ctrl-restart');
      if (target && !target.disabled && !target.hidden && !target.closest('[hidden]') && !target.closest('dialog:not([open])')) target.classList.add('walkthrough-next-action');
    }
    nextStep() {
      if (!this.awaitingNext || this.index + 1 >= this.scenes.length) return;
      const next = this.index + 1;
      this.cancel(); this.scene(next); this.play();
    }
    replayNarration() {
      if (!this.started || !this.clips[this.index] || this.embed) return;
      this.muted = false; this.finished = false; this.awaitingNext = false;
      this.clips[this.index].currentTime = 0; this.audioDone = false;
      if (!this.running) this.play(); else this.narrate();
      this.update();
    }
    wait(ms) {
      return new Promise((resolve, reject) => {
        const job = { remaining: ms, resolve, reject, id: null, started: 0 };
        this.jobs.add(job);
        if (this.running) this.schedule(job);
      });
    }
    schedule(job) {
      job.started = performance.now();
      job.id = setTimeout(() => { this.jobs.delete(job); job.resolve(); }, job.remaining);
    }
    cancel() {
      clearTimeout(this.loopTimer);
      this.generation++;
      for (const job of this.jobs) { clearTimeout(job.id); job.reject(CANCELLED); }
      this.jobs.clear();
      cancelAnimationFrame(this.frame);
      this.clips.forEach(clip => { clip.pause(); clip.currentTime = 0; });
      this.awaitingNext = false; this.actionTarget = null; this.update();
    }
    scene(index) {
      this.index = index;
      this.awaitingNext = false; this.audioError = '';
      this.finished = false;
      this.actionDone = this.durationDone = false;
      this.audioDone = this.muted || !this.clips[index];
      this.sceneElapsed = 0;
      const generation = this.generation;
      this.update();
      Promise.resolve().then(() => this.actions[index]()).then(() => {
        if (generation !== this.generation) return;
        this.actionDone = true; this.advance();
      }).catch(error => {
        if (error === CANCELLED || generation !== this.generation) return;
        console.error('Demo scene failed', error);
        this.pause(); this.status.textContent = 'Please restart this walkthrough.';
      });
      this.wait(this.scenes[index].duration).then(() => {
        if (generation !== this.generation) return;
        this.durationDone = true; this.advance();
      }).catch(() => {});
      if (this.running) { this.narrate(); this.tick(); }
    }
    narrate() {
      const clip = this.clips[this.index];
      if (this.muted || !clip || !this.running || this.audioDone) return;
      this.audioError = '';
      this.audioDone = false;
      const generation = this.generation;
      clip.play().then(() => {
        if (generation !== this.generation || !this.running || this.muted) clip.pause();
      }).catch(() => {
        if (generation !== this.generation) return;
        this.audioDone = true;
        this.audioError = 'Audio unavailable. Read the scene notes or replay the voice.';
        this.update();
        this.advance();
      });
    }
    play() {
      if (this.finished) { this.restart(); return; }
      if (this.awaitingNext) { this.nextStep(); return; }
      this.started = true; this.actionTarget = null; this.running = true;
      for (const job of this.jobs) this.schedule(job);
      this.narrate(); this.tick(); this.update(); this.advance();
    }
    pause() {
      if (!this.running) return;
      this.running = false;
      for (const job of this.jobs) {
        clearTimeout(job.id);
        job.remaining = Math.max(0, job.remaining - (performance.now() - job.started));
      }
      this.clips.forEach(clip => clip.pause());
      cancelAnimationFrame(this.frame);
      this.update();
    }
    toggle() { this.running ? this.pause() : this.play(); }
    restart() {
      this.pause(); this.cancel(); this.reset(); this.scene(0); this.play();
    }
    toggleMute() {
      if (this.embed) return;
      this.muted = !this.muted;
      if (this.muted) {
        this.clips.forEach(clip => clip.pause());
        this.audioDone = true;
      } else {
        const clip = this.clips[this.index];
        if (clip) clip.currentTime = 0;
        this.audioDone = !clip;
        if (!this.running) this.play(); else this.narrate();
      }
      this.update(); this.advance();
    }
    advance() {
      if (!this.running || !this.actionDone || !this.durationDone || !this.audioDone) return;
      if (this.index + 1 < this.scenes.length && !this.autoAdvance) {
        this.awaitingNext = true; this.pause(); return;
      }
      this.cancel();
      if (this.index + 1 < this.scenes.length) { this.scene(this.index + 1); return; }
      this.finished = true; this.running = false; this.update();
      if (this.loop) {
        const generation = this.generation;
        this.loopTimer = setTimeout(() => { if (generation === this.generation) this.restart(); }, 2000);
      }
    }
    tick() {
      let previous = performance.now();
      cancelAnimationFrame(this.frame);
      const frame = now => {
        if (!this.running) return;
        this.sceneElapsed += now - previous; previous = now;
        this.progress(); this.frame = requestAnimationFrame(frame);
      };
      this.frame = requestAnimationFrame(frame);
    }
    progress() {
      const total = this.scenes.reduce((sum, s) => sum + s.duration, 0);
      const elapsed = this.scenes.slice(0, this.index).reduce((sum, s) => sum + s.duration, 0);
      const percent = this.finished ? 100 : Math.min(99, (elapsed + Math.min(this.sceneElapsed, this.scenes[this.index].duration)) / total * 100);
      const bar = document.getElementById('globalProgress');
      if (bar) bar.style.width = percent + '%';
    }
    update() {
      if (this.journeyCard) this.journeyCard.hidden = !this.finished;
      document.querySelectorAll('[data-tour-play]').forEach(play => {
        const label = this.finished ? '↻ Replay' : this.running ? '⏸ Pause' : this.started ? 'Resume step →' : 'Start walkthrough →';
        play.textContent = label; play.setAttribute('aria-label', label);
        play.hidden = this.awaitingNext;
      });
      document.querySelectorAll('[data-tour-next]').forEach(next => {
        next.hidden = !this.awaitingNext; next.disabled = !this.awaitingNext;
        next.setAttribute('aria-label', 'Next step: ' + (this.scenes[this.index + 1]?.name || 'Complete'));
      });
      document.querySelectorAll('[data-tour-mute]').forEach(mute => {
        mute.textContent = this.muted ? 'Voice off' : 'Voice on';
        mute.setAttribute('aria-label', this.muted ? 'Enable narration' : 'Mute narration');
        mute.setAttribute('aria-pressed', String(!this.muted));
      });
      document.querySelectorAll('[data-tour-replay]').forEach(button => { button.disabled = !this.started || !this.clips[this.index]; });
      document.querySelectorAll('[data-tour-auto]').forEach(input => { input.checked = this.autoAdvance; });
      document.querySelectorAll('[data-tour-motion]').forEach(button => { button.textContent = this.motionPaused ? 'Resume animation' : 'Pause animation'; });
      document.querySelectorAll('[data-tour-step]').forEach(node => { node.textContent = 'Step ' + (this.index + 1) + ' of ' + this.scenes.length + ' · ' + this.scenes[this.index].name; });
      document.querySelectorAll('[data-tour-note]').forEach(node => { node.textContent = this.awaitingNext ? 'Step complete. Choose Next step to continue.' : this.captions[this.index] || this.scenes[this.index].name; });
      const num = document.getElementById('stepNum');
      if (num) num.textContent = this.index + 1;
      const label = document.getElementById('stepLabel');
      if (label) label.textContent = this.finished ? 'Complete' : this.scenes[this.index].name;
      if (this.notes) this.notes.textContent = this.captions[this.index] || this.scenes[this.index].name;
      if (this.status) this.status.textContent = this.audioError || (this.finished ? 'Walkthrough complete' : this.awaitingNext ? 'Step complete · choose Next step' : this.running ? 'AI narration · ' + (this.autoAdvance ? 'automatic playback' : 'pauses after this step') : this.started ? 'Paused · resume when ready' : 'AI narration · starts when you begin');
      this.updateCue();
      this.progress();
    }
    async typeText(element, text, speed = 50) {
      element.classList.add('type-cursor');
      for (let i = 1; i <= text.length; i++) { await this.wait(speed); element.textContent = text.slice(0, i); }
      element.classList.remove('type-cursor');
    }
  }
  root.DemoPlayer = DemoPlayer;
  if (typeof module !== 'undefined') module.exports = DemoPlayer;
})(typeof window !== 'undefined' ? window : globalThis);
