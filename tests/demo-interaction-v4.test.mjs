import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root=path.resolve(import.meta.dirname,'..');
function fixture(name){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'demo',name+'.html'),'utf8'),{url:'https://example.test/demo/'+name+'.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,errors=[];
  window.matchMedia=()=>({matches:false});
  window.console.error=(...args)=>errors.push(args.join(' '));
  const clock=FakeTimers.withGlobal(window).install({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});
  window.HTMLMediaElement.prototype.play=function(){this._timer=window.setTimeout(()=>this.dispatchEvent(new window.Event('ended')),500);return Promise.resolve();};
  window.HTMLMediaElement.prototype.pause=function(){window.clearTimeout(this._timer);};
  for(const script of window.document.querySelectorAll('script')){
    window.eval(script.src?fs.readFileSync(path.resolve(root,'demo',script.getAttribute('src')),'utf8'):script.textContent+(script.textContent.includes('demoPlayer.mount()')?'\nwindow.testPlayer=demoPlayer;':''));
  }
  window.document.querySelector('.demo-controls [data-tour-auto]:not(:checked)')?.click();
  return{
    window,document:window.document,clock,errors,player:window.testPlayer,
    async until(condition){for(let i=0;i<240;i++){if(condition())return;await clock.tickAsync(250);}assert.fail('Expected walkthrough state was not reached');},
    close(){clock.uninstall();window.close();}
  };
}

test('UX formatting honors the unchecked option, pauses for review, and restores the default on restart',async()=>{
  const d=fixture('ux-formatting');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.getElementById('applyBoardFormatting'));
    const choice=d.document.getElementById('applyBoardFormatting');choice.click();
    assert.equal(choice.checked,false);assert.equal(d.player.running,false);
    assert.match(d.document.getElementById('formattingChoiceNote').textContent,/Plain output selected.*on-screen notes instead of formatting narration/);
    assert.equal(d.player.clips[4],undefined);assert.equal(d.player.clips[5],undefined);
    assert.match(d.player.captions[4],/formatting is skipped/);
    await d.clock.tickAsync(30000);assert.equal(d.player.index,2,'Manual choice pauses the tour');
    d.player.play();await d.clock.tickAsync(300000);
    assert.equal(d.player.finished,true);assert.equal(choice.disabled,true);
    assert.equal(d.document.querySelectorAll('#gridTable [class*="ux-"]').length,0);
    assert.match(d.document.getElementById('execLabel').textContent,/Plain sample output ready/);
    assert.match(d.document.getElementById('widgetConfig').textContent,/Source formatting was not applied/);
    assert.doesNotMatch(d.document.getElementById('widgetConfig').textContent,/Supported sample styles preserved/);
    d.player.restart();await d.clock.tickAsync(300000);
    assert.ok(d.document.querySelector('#gridTable .ux-total'));
    assert.equal(d.document.getElementById('applyBoardFormatting').checked,true);
    assert.ok(d.player.clips[4]);assert.ok(d.player.clips[5]);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Discovery search filters app names and preloaded pages, supports no results and clearing',async()=>{
  const d=fixture('discovery');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.querySelectorAll('#moduleTree .mod-tree-item').length===6);
    const search=d.document.getElementById('discSearchInput');
    assert.equal(search.disabled,false);
    const query=value=>{search.value=value;search.dispatchEvent(new d.window.Event('input',{bubbles:true}));};
    const visibleApps=()=>[...d.document.querySelectorAll('#moduleTree .mod-tree-item')].filter(app=>app.style.display!=='none');
    query('avery');assert.equal(d.player.running,false);assert.equal(visibleApps().length,1);
    const app=visibleApps()[0];assert.match(app.textContent,/Budget & Forecasts/);assert.equal(app.classList.contains('open'),true);
    assert.equal(app.querySelector('button').getAttribute('aria-expanded'),'true');
    const pages=[...app.querySelectorAll('.li-item')].filter(row=>row.style.display!=='none');
    assert.equal(pages.length,1);assert.match(pages[0].textContent,/Avery Morgan/);
    query('p&l');assert.equal(visibleApps().length,1);assert.match(visibleApps()[0].textContent,/P&L Statement/);
    query('not-a-sample-page');assert.equal(visibleApps().length,0);assert.match(d.document.getElementById('discSearchStatus').textContent,/No matching/);
    query('');assert.equal(visibleApps().length,6);assert.match(d.document.getElementById('discSearchStatus').textContent,/10 included page previews/);
    assert.equal(d.document.querySelectorAll('#moduleTree .li-item').length,10);
    const heading=d.document.querySelector('#mt-BudgetForecasts [data-toggle-ux-app]');heading.click();
    assert.equal(heading.getAttribute('aria-expanded'),'true');heading.click();assert.equal(heading.getAttribute('aria-expanded'),'false');
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Discovery Close cancels pending scenes, restores focus, and Escape closes a reopened preview',async()=>{
  const d=fixture('discovery');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.querySelectorAll('#moduleTree .mod-tree-item').length===6);
    d.document.querySelector('#discFooter [data-close-discovery]').click();
    assert.equal(d.document.getElementById('discOverlay').classList.contains('visible'),false);
    assert.equal(d.player.running,false);assert.equal(d.player.jobs.size,0);
    assert.equal(d.document.activeElement.id,'exploreBtn');
    assert.equal(d.document.getElementById('playBtn').disabled,true);
    d.player.play();await d.clock.tickAsync(300000);
    assert.equal(d.document.getElementById('discOverlay').classList.contains('visible'),false,'A stopped tour cannot reopen the dialog later');
    d.document.getElementById('exploreBtn').click();
    assert.equal(d.document.getElementById('discOverlay').classList.contains('visible'),true);
    d.document.querySelector('#discOverlay .disc-modal').dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(d.document.getElementById('discOverlay').classList.contains('visible'),false);
    assert.equal(d.document.activeElement.id,'exploreBtn');
    d.player.restart();await d.clock.tickAsync(300000);
    assert.equal(d.player.finished,true);assert.equal(d.document.getElementById('playBtn').disabled,false);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Nested manual checkbox, dimension and merge changes survive timers and Play until explicit Restart',async()=>{
  for(const control of ['checkbox','depth','merge']){
    const d=fixture('nested-selections');try{
      await d.clock.tickAsync(0);d.player.play();await d.clock.tickAsync(500);
      if(control==='checkbox')d.document.querySelector('#choices input').click();
      if(control==='depth'){const select=d.document.getElementById('depth');select.value='3';select.dispatchEvent(new d.window.Event('change'));}
      if(control==='merge')d.document.getElementById('merge').click();
      const table=d.document.getElementById('previewTable').innerHTML,choices=d.document.getElementById('layoutSummary').textContent;
      assert.equal(d.player.running,false);assert.equal(d.player.jobs.size,0);assert.equal(d.document.getElementById('playBtn').disabled,true);
      assert.match(d.document.getElementById('interactionStatus').textContent,/tour is stopped/);
      d.player.play();await d.clock.tickAsync(300000);
      assert.equal(d.document.getElementById('previewTable').innerHTML,table,control+' selection remains stable');
      assert.equal(d.document.getElementById('layoutSummary').textContent,choices);
      d.player.restart();await d.clock.tickAsync(0);
      assert.equal(d.document.getElementById('playBtn').disabled,false);
      assert.equal(d.document.getElementById('depth').value,'2');
      assert.match(d.document.getElementById('layoutSummary').textContent,/8 of 8/);
      await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);assert.deepEqual(d.errors,[]);
    }finally{d.close();}
  }
});

test('Nested YoY derives from its explicit prior-year baseline and regional amounts reconcile',async()=>{
  const d=fixture('nested-selections');try{
    await d.clock.tickAsync(0);
    const {source,build}=d.window.NestedFinancials,data=build();
    for(const [name,record]of Object.entries(source)){
      assert.equal(data[name].FY26[2],record.FY26.Forecast-record.priorActual);
      assert.equal(data[name].FY26[3],(record.FY26.Forecast-record.priorActual)/record.priorActual*100);
      assert.equal(data[name].FY27[2],record.FY27.Budget-record.FY26.Forecast);
      assert.equal(data[name].FY27[3],(record.FY27.Budget-record.FY26.Forecast)/record.FY26.Forecast*100);
    }
    const zero=JSON.parse(JSON.stringify(source));zero.Revenue.priorActual=0;zero.Revenue.FY26.Forecast=0;
    assert.equal(build(zero).Revenue.FY26[3],null);assert.equal(build(zero).Revenue.FY27[3],null);
    const select=d.document.getElementById('depth');select.value='3';select.dispatchEvent(new d.window.Event('change'));
    for(const [index,row]of [...d.document.querySelectorAll('#previewTable tbody tr')].entries()){
      const cells=[...row.querySelectorAll('td')].map(cell=>Number(cell.textContent.replace(/[^0-9.-]/g,'')));
      const name=Object.keys(data)[index];
      for(const [year,offset]of [['FY26',0],['FY27',4]])for(let measure=0;measure<3;measure++){
        assert.ok(Math.abs(cells[offset+measure]+cells[8+offset+measure]-data[name][year][measure])<.00001);
      }
    }
    assert.match(d.document.body.textContent,/FY26 YoY = FY26 Forecast − FY25 Actual/);
    assert.match(d.document.body.textContent,/FY27 YoY = FY27 Budget − FY26 Forecast/);
  }finally{d.close();}
});

test('Schedule fields are explicitly read-only throughout the guided sample',async()=>{
  const d=fixture('schedule');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.querySelectorAll('#sheetSelect input').length===3);
    assert.match(d.document.getElementById('schedulePreviewNote').textContent,/Guided, read-only preview/);
    assert.equal(d.document.getElementById('schedForm').tagName,'FIELDSET');
    assert.equal(d.document.getElementById('schedForm').disabled,true);
    for(const control of d.document.querySelectorAll('#schedForm input,#schedForm select,#schedForm button'))assert.equal(control.matches(':disabled'),true,control.id||control.textContent);
    await d.clock.tickAsync(300000);
    assert.equal(d.player.finished,true);assert.equal(d.document.getElementById('addSchedBtn2').disabled,true);assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Marketplace simulation omits fabricated reputation counters and links to current listing details',async()=>{
  const d=fixture('marketplace-install');try{
    await d.clock.tickAsync(0);
    assert.equal(d.document.querySelector('.rating-meta'),null);
    assert.equal(d.document.querySelector('.stars'),null);
    assert.doesNotMatch(d.document.body.textContent,/★★★★★|⇩\s*20|1\s*ⓘ/);
    const link=[...d.document.querySelectorAll('a')].find(a=>a.textContent.includes('View current Marketplace details'));
    assert.ok(link);assert.equal(link.rel,'noopener');assert.match(link.href,/workspace\.google\.com\/marketplace\/app\/anaplan_connector_for_sheets\/751768451107/);
  }finally{d.close();}
});

test('OAuth help targets an existing relevant guide and setup controls are explicitly guided',async()=>{
  const d=fixture('oauth-setup');try{
    await d.clock.tickAsync(0);d.player.play();await d.until(()=>d.document.getElementById('oauthGuideLink'));
    const link=d.document.getElementById('oauthGuideLink'),url=new URL(link.href);
    assert.equal(url.pathname,'/guide.html');assert.equal(url.hash,'#step-3');assert.equal(link.rel,'noopener');
    const guide=new JSDOM(fs.readFileSync(path.join(root,url.pathname.slice(1)),'utf8'));
    try{assert.match(guide.window.document.getElementById(url.hash.slice(1)).textContent,/Connect to Anaplan[\s\S]*OAuth\/SSO/);}finally{guide.window.close();}
    assert.match(d.document.getElementById('oauthPreviewNote').textContent,/Guided, read-only setup preview.*no credentials are collected, copied, validated or saved/);
    assert.equal(d.document.getElementById('sidebarContent').tagName,'FIELDSET');
    assert.equal(d.document.getElementById('continueBtn1').matches(':disabled'),true);
    await d.until(()=>d.document.getElementById('copyExampleUri'));
    const copy=d.document.getElementById('copyExampleUri');
    assert.equal(copy.disabled,true);assert.match(copy.textContent,/Preview only/);
    assert.match(d.document.querySelector('.copy-uri-box code').textContent,/https:\/\/connector\.example\.invalid\/oauth\/callback/);
    assert.match(d.document.getElementById(copy.getAttribute('aria-describedby')).textContent,/Example URI only.*actual callback URL.*Copy is unavailable/);
    for(const control of d.document.querySelectorAll('#sidebarContent input,#sidebarContent select,#sidebarContent button'))assert.equal(control.matches(':disabled'),true);
    assert.equal(d.document.getElementById('clientIdInput').readOnly,true);assert.equal(d.document.getElementById('clientSecretInput').readOnly,true);
    await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.match(d.document.getElementById('postLoginArea').textContent,/Sample connection ready/);
    assert.equal(d.document.querySelector('#postLoginArea button').matches(':disabled'),true);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Pivot guided preview prevents fake edits while scripted selections and playback still complete',async()=>{
  const d=fixture('pivot');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.querySelectorAll('#lineItemsList input').length===12);
    for(const id of ['sidebarContent','pivotContent']){
      const preview=d.document.getElementById(id);
      assert.equal(preview.tagName,'FIELDSET');assert.equal(preview.disabled,true);
      assert.match(d.document.getElementById(preview.getAttribute('aria-describedby')).textContent,/Guided preview.*read-only.*Start walkthrough \/ Next step \/ Restart/);
      for(const control of preview.querySelectorAll('input,button,select'))assert.equal(control.matches(':disabled'),true);
    }
    const checkbox=d.document.querySelector('#li0 input'),before=checkbox.checked;
    checkbox.click();assert.equal(checkbox.checked,before,'A visitor cannot change the scripted choice');
    assert.equal(d.document.getElementById('playBtn').matches(':disabled'),false);
    d.document.getElementById('playBtn').click();assert.equal(d.player.running,false);
    d.document.getElementById('playBtn').click();assert.equal(d.player.running,true);
    await d.until(()=>d.document.querySelectorAll('#timeList input:checked').length===5||d.document.getElementById('execBtn')?.disabled===false);
    assert.equal(d.document.querySelectorAll('#itemPanel input:checked').length,5);
    assert.equal(d.document.getElementById('execBtn').matches(':disabled'),true,'Scene enablement cannot turn the preview into a live action');
    await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.match(d.document.getElementById('gridTable').textContent,/Gross Profit[\s\S]*EBITDA/);
    assert.match(d.document.getElementById('sheetTabs').textContent,/\[P\] P&L Statement/);
    d.player.restart();await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.equal(d.document.getElementById('pivotContent').disabled,true);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Multi-module guided preview keeps module and item choices read-only through completion and restart',async()=>{
  const d=fixture('multi-module');try{
    await d.clock.tickAsync(0);d.player.play();
    await d.until(()=>d.document.querySelectorAll('#compatList .compat-module').length===7);
    const picker=d.document.getElementById('pickerContent');
    assert.equal(picker.tagName,'FIELDSET');assert.equal(picker.disabled,true);
    assert.match(d.document.getElementById(picker.getAttribute('aria-describedby')).textContent,/Guided preview.*read-only.*Start walkthrough \/ Next step \/ Restart/);
    assert.equal(d.document.getElementById('addModuleBtn').matches(':disabled'),true);
    await d.until(()=>d.document.querySelectorAll('#secLineItems input').length===5);
    const checkbox=d.document.querySelector('#sli3 input'),before=checkbox.checked;
    assert.equal(checkbox.matches(':disabled'),true);checkbox.click();assert.equal(checkbox.checked,before);
    await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.equal(d.document.querySelector('#sli3 input').checked,true,'The guided selection still runs');
    assert.equal(d.document.getElementById('execBtn').matches(':disabled'),true);
    assert.match(d.document.getElementById('gridTable').textContent,/Ending HC Δ/);
    assert.match(d.document.getElementById('multiModulePreviewNote').textContent,/Guided preview.*read-only.*Start walkthrough \/ Next step \/ Restart/);
    assert.equal(d.document.getElementById('playBtn').matches(':disabled'),false);
    d.player.restart();await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.equal(d.document.getElementById('sidebarContent').disabled,true);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});

test('Setup guided preview has no editable credentials or fake sign-in actions and preserves the walkthrough',async()=>{
  const d=fixture('setup');try{
    await d.clock.tickAsync(0);d.player.play();await d.until(()=>d.document.getElementById('loginBtn'));
    const preview=d.document.getElementById('sidebarContent');
    assert.equal(preview.tagName,'FIELDSET');assert.equal(preview.disabled,true);
    assert.match(d.document.getElementById('setupPreviewNote').textContent,/Guided preview.*read-only.*No sign-in or model configuration is performed/);
    assert.equal(preview.querySelectorAll('input,select,[contenteditable="true"]').length,0);
    assert.equal(d.document.getElementById('loginBtn').matches(':disabled'),true);
    assert.equal(preview.querySelector('[onclick]'),null);
    const toggle=d.document.getElementById('authToggle'),before=toggle.className;
    toggle.querySelector('.ios-toggle-header').click();assert.equal(toggle.className,before);
    await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.match(d.document.getElementById('modelStatus').textContent,/Model saved/);
    for(const button of preview.querySelectorAll('button'))assert.equal(button.matches(':disabled'),true);
    assert.equal(d.document.getElementById('playBtn').matches(':disabled'),false);
    d.player.restart();await d.clock.tickAsync(300000);assert.equal(d.player.finished,true);
    assert.match(d.document.getElementById('setupPreviewNote').textContent,/Guided preview/);
    assert.deepEqual(d.errors,[]);
  }finally{d.close();}
});
