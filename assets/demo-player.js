/* Shared clock for narrated, illustrative walkthroughs. No customer data. */
(function (root) {
  'use strict';
  const CANCELLED = Symbol('cancelled scene');
  class DemoPlayer {
    constructor({ scenes, actions, reset = () => {}, captions = [] }) {
      this.scenes = scenes;
      this.actions = actions;
      this.reset = reset;
      const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
      this.captions = captions.length ? captions : (root.DemoNarration?.[slug] || []);
      this.embed = new URLSearchParams(location.search).has('embed');
      this.loop = this.embed && new URLSearchParams(location.search).has('loop');
      this.jobs = new Set();
      this.index = 0;
      this.generation = 0;
      this.running = false;
      this.muted = this.embed;
      this.finished = false;
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
      const play = document.getElementById('playBtn');
      if (play) play.onclick = () => this.toggle();
      const restart = document.getElementById('restartBtn') || document.querySelector('.ctrl-restart');
      if (restart) restart.onclick = () => this.restart();
      const mute = document.getElementById('muteBtn');
      if (mute) {
        mute.onclick = () => this.toggleMute();
        mute.hidden = this.clips.length === 0;
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.running) this.pause();
      });
      this.reset();
      this.scene(0);
      this.update();
      if (this.embed && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.play();
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
    }
    scene(index) {
      this.index = index;
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
      this.audioDone = false;
      const generation = this.generation;
      clip.play().then(() => {
        if (generation !== this.generation || !this.running || this.muted) clip.pause();
      }).catch(() => {
        if (generation !== this.generation) return;
        this.audioDone = true;
        this.status.textContent = 'Audio unavailable. Scene notes are shown below.';
        this.advance();
      });
    }
    play() {
      if (this.finished) { this.restart(); return; }
      this.running = true;
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
      const play = document.getElementById('playBtn');
      if (play) { play.textContent = this.finished ? '↻ Replay' : this.running ? '⏸ Pause' : '▶ Play'; play.setAttribute('aria-label', this.finished ? 'Replay' : this.running ? 'Pause' : 'Play'); }
      const mute = document.getElementById('muteBtn');
      if (mute) {
        mute.textContent = this.muted ? '🔇 Sound off' : '🔊 Sound on';
        mute.setAttribute('aria-label', this.muted ? 'Enable narration' : 'Mute narration');
        mute.title = this.muted ? 'Enable narration' : 'Mute narration';
        mute.setAttribute('aria-pressed', String(!this.muted));
      }
      const num = document.getElementById('stepNum');
      if (num) num.textContent = this.index + 1;
      const label = document.getElementById('stepLabel');
      if (label) label.textContent = this.finished ? 'Complete' : this.scenes[this.index].name;
      if (this.notes) this.notes.textContent = this.captions[this.index] || this.scenes[this.index].name;
      if (this.status) this.status.textContent = this.finished ? 'Illustrative demo complete' : this.clips.length ? 'Sample data · narration starts with Play' : 'Sample data · visual walkthrough';
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
