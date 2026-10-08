import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';
const root=path.resolve(import.meta.dirname,'..');
const demos=fs.readdirSync(path.join(root,'demo')).filter(name=>name.endsWith('.html'));
function createDemo(file,query='') {
  const html=fs.readFileSync(path.join(root,'demo',file),'utf8');
  const dom=new JSDOM(html,{url:`https://example.test/demo/${file}${query}`,runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  const errors=[];
  window.console.error=(...args)=>errors.push(args.join(' '));
  window.matchMedia=()=>({matches:false});
  const clock=FakeTimers.withGlobal(window).install({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});
  window.HTMLMediaElement.prototype.play=function(){
    this._paused=false;
    this._timer=window.setTimeout(()=>{this._paused=true;this.dispatchEvent(new window.Event('ended'))},500);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause=function(){this._paused=true;window.clearTimeout(this._timer)};
  Object.defineProperty(window.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false}});
  for(const script of window.document.querySelectorAll('script')){
    if(script.src){window.eval(fs.readFileSync(path.resolve(root,'demo',script.getAttribute('src')),'utf8'));}
    else window.eval(script.textContent+(script.textContent.includes('demoPlayer.mount()')?'\nwindow.testPlayer=demoPlayer;':''));
  }
  return {window,clock,errors,player:window.testPlayer,close(){clock.uninstall();window.close()}};
}
for(const file of demos){
  test(`${file}: paused start, narration, pause/resume, restart and complete`,async()=>{
    const demo=createDemo(file); const {player,window,clock,errors}=demo;
    try{
      assert.ok(player,'Shared player mounted');
      await clock.tickAsync(0);
      assert.equal(player.running,false);
      assert.equal(window.document.getElementById('playBtn').textContent,'▶ Play');
      window.document.getElementById('playBtn').click();
      await clock.tickAsync(1200);
      window.document.getElementById('playBtn').click();
      const paused=window.document.body.innerHTML;
      await clock.tickAsync(40000);
      assert.equal(window.document.body.innerHTML,paused,'Animations and scene clock freeze on pause');
      window.document.getElementById('playBtn').click();
      await clock.tickAsync(1500);
      player.restart(); await clock.tickAsync(0);
      assert.equal(player.index,0);
      await clock.tickAsync(300000);
      assert.deepEqual(errors,[],'No asynchronous scene failures');
      assert.equal(player.finished,true,'Every scene reaches completion');
      assert.equal(window.document.getElementById('globalProgress').style.width,'100%');
      assert.equal(window.document.getElementById('playBtn').textContent,'↻ Replay');
      assert.equal(player.jobs.size,0,'No orphan animation jobs');
    }finally{demo.close()}
  });
}
test('Audio longer than scene holds the scene until ended',async()=>{
  const d=createDemo('nested-selections.html');try{
    await d.clock.tickAsync(0);d.player.scenes[0].duration=1000;
    d.player.clips[0].play=function(){this._paused=false;return Promise.resolve()};
    d.player.restart();await d.clock.tickAsync(5000);
    assert.equal(d.player.index,0);
    d.player.clips[0].dispatchEvent(new d.window.Event('ended'));
    await d.clock.tickAsync(0);assert.equal(d.player.index,1);
  }finally{d.close()}
});
test('Audio rejection falls back to visible notes without blocking completion',async()=>{
  const d=createDemo('discovery.html');try{
    d.player.clips.forEach(a=>a.play=()=>Promise.reject(new Error('blocked')));
    d.player.play();await d.clock.tickAsync(0);assert.match(d.player.status.textContent,/Audio unavailable/);
    await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.deepEqual(d.errors,[]);
  }finally{d.close()}
});
test('Resuming after narration ends does not replay the finished clip',async()=>{
  const d=createDemo('nested-selections.html');try{
    await d.clock.tickAsync(0);let calls=0;
    const play=d.player.clips[0].play;d.player.clips[0].play=function(){calls++;return play.call(this)};
    d.player.play();await d.clock.tickAsync(900);d.player.pause();d.player.play();
    assert.equal(calls,1);
  }finally{d.close()}
});
test('Embedded loop is muted, and restart invalidates pending loop timers',async()=>{
  const d=createDemo('nested-selections.html','?embed&loop');try{
    await d.clock.tickAsync(0);assert.equal(d.player.running,true);assert.equal(d.player.muted,true);
    await d.clock.tickAsync(35000);assert.equal(d.player.finished,true);
    d.player.restart();await d.clock.tickAsync(3000);assert.equal(d.player.index,0);
    assert.equal(d.player.clips.every(a=>a.paused),true);
  }finally{d.close()}
});
test('Nested preview: exact tuples, third dimension, merge and percentage semantics',async()=>{
  const d=createDemo('nested-selections.html');try{
    await d.clock.tickAsync(0);
    const depth=d.window.document.getElementById('depth');depth.value='3';depth.dispatchEvent(new d.window.Event('change'));
    assert.equal(d.window.document.querySelectorAll('#choices input').length,16);
    const checkbox=d.window.document.querySelector('#choices input');checkbox.click();
    assert.match(d.window.document.getElementById('layoutSummary').textContent,/15 of 16/);
    d.window.document.getElementById('merge').click();
    assert.equal(d.window.document.querySelector('#previewTable th[colspan="7"]')?.textContent,'North America');
    assert.match(d.window.document.getElementById('previewTable').textContent,/33.3%/);
  }finally{d.close()}
});
test('HTML scripts, structured data, and local assets are valid',()=>{
  const files=['index.html','demos.html','demo.html','privacy.html',...demos.map(f=>'demo/'+f)];
  for(const file of files){
    const html=fs.readFileSync(path.join(root,file),'utf8'),dom=new JSDOM(html);
    for(const script of dom.window.document.querySelectorAll('script:not([src])')){
      if(script.type==='application/ld+json')JSON.parse(script.textContent);else new vm.Script(script.textContent,{filename:file});
    }
    for(const element of dom.window.document.querySelectorAll('[src],a[href],link[href]')){
      const url=element.getAttribute('src')||element.getAttribute('href');
      if(!url||/^(?:[a-z]+:|#|\/\/)/i.test(url))continue;
      const local=url.split(/[?#]/)[0];
      const target=local.startsWith('/')?path.join(root,local):path.resolve(root,path.dirname(file),local);
      assert.ok(fs.existsSync(target),`${file}: missing ${local}`);
    }
    dom.window.close();
  }
});
