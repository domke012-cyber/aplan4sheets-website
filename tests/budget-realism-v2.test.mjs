import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root=path.resolve(import.meta.dirname,'..');
const dataContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/budget-review-data-v2.js'),'utf8'),dataContext);
const D=dataContext.window.BudgetReviewData;
const plain=value=>JSON.parse(JSON.stringify(value));
const config=(owner='all',version=D.versions[0])=>({owner,version,rows:D.categories.map(row=>row.id),columns:D.columns.map(column=>column.id),merge:true});

function fixture(){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'demo/budget-review.html'),'utf8'),{
    url:'https://example.test/demo/budget-review.html',runScripts:'outside-only',pretendToBeVisual:true
  });
  const {window}=dom,errors=[];
  window.matchMedia=()=>({matches:false});
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  window.console.error=(...args)=>errors.push(args.join(' '));
  window.fetch=()=>{throw new Error('The fictional snapshot must not query a service.');};
  window.HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
  window.HTMLMediaElement.prototype.pause=function(){};
  const clock=FakeTimers.withGlobal(window).install({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});
  for(const script of window.document.querySelectorAll('script')){
    window.eval(script.src?fs.readFileSync(path.resolve(root,'demo',script.getAttribute('src')),'utf8'):script.textContent+'\nwindow.testPlayer=demoPlayer;');
  }
  const el=id=>window.document.getElementById(id),click=id=>el(id).click();
  const state=()=>plain(window.BudgetReviewDemo.app.getState());
  const set=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new window.Event('change'));};
  const selectOwner=id=>{click('ownerBtn');el('ownerChoices').querySelector('input[value="'+id+'"]').click();click('applyOwner');};
  const prepare=async()=>{await clock.tickAsync(0);click('configureBtn');click('recommendedBtn');click('applySelections');click('executeBtn');await clock.tickAsync(800);click('chartBtn');};
  const comments=()=>Array.from(el('reportTable').querySelectorAll('.category-row .comment-cell'),node=>node.textContent);
  return{window,clock,errors,el,click,state,set,selectOwner,prepare,comments,close(){clock.uninstall();window.close();}};
}

test('Every executive owner child rolls into the root by category, scenario and additive measure',()=>{
  assert.equal(D.owners.filter(owner=>owner.parent==='all').length,3);
  for(const version of D.versions){
    const aggregate=D.buildReport(config('all',version));
    const children=D.owners.filter(owner=>owner.parent==='all').map(owner=>D.buildReport(config(owner.id,version)));
    aggregate.columns.forEach((column,index)=>{
      if(column.measure==='percent')return;
      aggregate.rows.forEach(row=>{
        assert.equal(children.reduce((sum,child)=>sum+child.rows.find(candidate=>candidate.id===row.id).values[index],0),row.values[index],version+' / '+row.id+' / '+column.id);
      });
      assert.equal(children.reduce((sum,child)=>sum+child.total.values[index],0),aggregate.total.values[index],version+' / total / '+column.id);
    });
  }
});

test('Account detail sums each parent exactly and percentages use each account denominator',()=>{
  for(const owner of D.owners)for(const version of D.versions){
    const report=D.buildReport(config(owner.id,version));
    for(const row of report.rows){
      const details=D.detailRows(report,row);
      assert.equal(new Set(details.map(detail=>detail.code)).size,details.length);
      report.columns.forEach((column,index)=>{
        if(column.measure!=='percent')assert.equal(details.reduce((sum,detail)=>sum+detail.values[index],0),row.values[index],owner.id+' / '+version+' / '+row.id+' / '+column.id);
      });
      for(const year of ['FY26','FY27']){
        const selected=report.columns.findIndex(column=>column.id===year+'|version');
        const delta=report.columns.findIndex(column=>column.id===year+'|yoy');
        const pct=report.columns.findIndex(column=>column.id===year+'|percent');
        for(const detail of details){
          const base=detail.values[selected]-detail.values[delta];
          const expected=base===0?null:detail.values[delta]/base;
          assert.equal(detail.values[pct],expected,owner.id+' / '+version+' / '+detail.code+' / '+year);
        }
        const parentBase=row.values[selected]-row.values[delta];
        assert.equal(row.values[pct],parentBase===0?null:row.values[delta]/parentBase);
      }
    }
  }
});

test('The FY27 scenario selector cannot change any FY26 reference values or account detail',()=>{
  for(const owner of D.owners){
    const first=D.buildReport(config(owner.id,D.versions[0]));
    const second=D.buildReport(config(owner.id,D.versions[1]));
    first.columns.forEach((column,index)=>{
      if(column.year!=='FY26')return;
      assert.equal(first.total.values[index],second.total.values[index]);
      first.rows.forEach((row,rowIndex)=>{
        assert.equal(row.values[index],second.rows[rowIndex].values[index]);
        const before=D.detailRows(first,row),after=D.detailRows(second,second.rows[rowIndex]);
        before.forEach((detail,detailIndex)=>assert.equal(detail.values[index],after[detailIndex].values[index]));
      });
    });
    const selected=first.columns.findIndex(column=>column.id==='FY27|version');
    assert.notEqual(first.total.values[selected],second.total.values[selected]);
  }
  for(const owner of ['unknown','all,product','executive-owner-999'])assert.throws(()=>D.buildReport({...config(),owner}),/Unknown executive owner/);
});

test('Owner and scenario changes stage both financials and commentary until explicit refresh',async()=>{
  const f=fixture();try{
    await f.prepare();
    const original=f.state().report,table=f.el('reportTable').innerHTML,comments=f.comments(),chart=f.el('chartBars').innerHTML;
    f.selectOwner('product');
    assert.equal(f.state().config.owner,'product');
    assert.equal(f.state().dirty,true);
    assert.deepEqual(f.state().report,original);
    assert.equal(f.el('reportTable').innerHTML,table);
    assert.deepEqual(f.comments(),comments);
    f.set('versionSelect',D.versions[1]);
    assert.deepEqual(f.state().report,original);
    assert.equal(f.el('reportTable').innerHTML,table);
    assert.equal(f.el('chartBars').innerHTML,chart);
    f.click('refreshBtn');await f.clock.tickAsync(500);
    assert.deepEqual(f.state().report,original,'Pending retrieval keeps the committed snapshot');
    await f.clock.tickAsync(300);
    const current=f.state(),expected=plain(D.buildReport(current.config));
    assert.deepEqual(current.report,expected);
    assert.equal(current.report.owner,'product');
    assert.equal(current.report.version,D.versions[1]);
    assert.equal(current.dirty,false);
    assert.deepEqual(f.comments(),expected.rows.map(row=>row.comment));
    assert.notDeepEqual(f.comments(),comments);
    assert.notEqual(f.el('chartBars').innerHTML,chart);
    assert.match(f.el('reportTable').textContent,/Alex Morgan/);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Hierarchy expansion and collapse only changes presentation, not totals or committed state',async()=>{
  const f=fixture();try{
    await f.prepare();
    const original=f.state(),total=f.el('reportTable').querySelector('.total-row').textContent.replace(/^\d+/,''),comments=f.comments();
    const initialCount=f.el('reportTable').querySelectorAll('.account-row').length;
    const toggle=()=>f.el('reportTable').querySelector('[data-category="people"]');
    assert.equal(toggle().getAttribute('aria-expanded'),'true');
    toggle().click();
    assert.equal(toggle().getAttribute('aria-expanded'),'false');
    assert.equal(f.el('reportTable').querySelectorAll('.account-row').length,initialCount-D.accounts.people.length);
    assert.equal(f.el('reportTable').querySelector('[data-category="software"]').closest('tr').querySelector('.row-number').textContent,'13');
    assert.equal(f.el('reportTable').querySelector('.total-row .row-number').textContent,'27');
    assert.deepEqual(f.state(),original);
    assert.equal(f.el('reportTable').querySelector('.total-row').textContent.replace(/^\d+/,''),total);
    assert.deepEqual(f.comments(),comments);
    toggle().click();
    assert.equal(f.el('reportTable').querySelectorAll('.account-row').length,initialCount);
    assert.deepEqual(f.state(),original);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Native owner picker represents one root and three exclusive children; cancellation is safe',async()=>{
  const f=fixture();try{
    await f.clock.tickAsync(0);f.click('ownerBtn');
    assert.equal(f.el('ownerDialog').tagName,'DIALOG');
    assert.equal(f.el('ownerDialog').open,true);
    assert.equal(f.el('ownerChoices').querySelectorAll('.owner-parent').length,1);
    assert.equal(f.el('ownerChoices').querySelectorAll('.owner-child').length,3);
    const radios=Array.from(f.el('ownerChoices').querySelectorAll('input[type="radio"]'));
    assert.equal(radios.length,4);assert.ok(radios.every(radio=>radio.name==='sampleOwner'));
    assert.equal(radios.find(radio=>radio.checked).value,'all');
    radios.find(radio=>radio.value==='product').click();
    assert.equal(radios.filter(radio=>radio.checked).length,1);
    f.click('closeOwner');assert.equal(f.state().config.owner,'all');
    f.click('ownerBtn');assert.equal(f.el('ownerChoices').querySelector('input:checked').value,'all');
    f.el('ownerChoices').querySelector('input[value="operations"]').click();f.click('applyOwner');
    assert.equal(f.el('ownerDialog').open,false);
    assert.equal(f.state().config.owner,'operations');
    assert.match(f.el('ownerBtn').textContent,/Casey Rivera/);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Browse UX selects one combined grid with financial and commentary module regions',async()=>{
  const f=fixture();try{
    await f.clock.tickAsync(0);const original=f.state();f.click('browseUx');
    assert.equal(f.el('uxDialog').open,true);
    assert.equal(f.el('uxDialog').querySelectorAll('.ux-combined-grid').length,1);
    assert.match(f.el('uxDialog').textContent,/One grid · two module regions/);
    assert.match(f.el('uxDialog').textContent,/MODULE 1 · FINANCIALS/);
    assert.match(f.el('uxDialog').textContent,/MODULE 2 · COMMENTARY/);
    assert.equal(f.el('useUxGrid').textContent,'Export selected grid →');
    assert.match(f.el('uxDialog').textContent,/Shared Owner and Version/);
    assert.equal(f.el('uxFinancialPreview').querySelectorAll('tbody tr').length,5);
    const source=D.buildReport({...original.config,columns:D.recommendedColumns});
    const commentRows=Array.from(f.el('uxCommentsPreview').querySelectorAll('tbody tr'));
    assert.equal(commentRows.length,source.rows.length);
    source.rows.forEach((row,index)=>{
      assert.equal(commentRows[index].cells[0].textContent,row.label);
      assert.equal(commentRows[index].cells[1].textContent,row.comment);
    });
    f.click('useUxGrid');
    assert.equal(f.el('uxDialog').open,false);
    assert.equal(f.el('layoutDialog').open,true);
    assert.deepEqual(f.state(),original);
    assert.equal(f.state().report,null);
    assert.equal(f.state().busy,false);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Browse UX previews the staged owner and scenario that will enter configuration',async()=>{
  const f=fixture();try{
    await f.prepare();const committed=f.state().report;
    f.selectOwner('product');f.set('versionSelect','Q4 Forecast');
    const staged=f.state().config,expected=D.buildReport({...staged,columns:D.recommendedColumns});
    f.click('browseUx');
    const filters=f.el('uxDialog').querySelector('.ux-filter-strip').textContent;
    assert.match(filters,/Alex Morgan/);assert.match(filters,/Q4 Forecast/);
    assert.match(f.el('uxFinancialPreview').querySelector('thead').textContent,/FY27 Q4 Forecast/);
    const visibleRows=Array.from(f.el('uxFinancialPreview').querySelectorAll('tbody tr'));
    assert.equal(visibleRows.length,expected.rows.length);
    expected.rows.forEach((row,index)=>{
      const cells=visibleRows[index].querySelectorAll('td');
      assert.equal(cells[0].textContent,row.label);
      assert.equal(cells[1].textContent,D.format(row.values[0]));
      assert.equal(cells[2].textContent,D.format(row.values[1]));
      assert.equal(f.el('uxCommentsPreview').querySelectorAll('tbody tr')[index].cells[1].textContent,row.comment);
    });
    f.click('useUxGrid');
    assert.match(f.el('dialogVersion').textContent,/Q4 Forecast/);
    assert.match(f.el('dialogVersion').textContent,/Alex Morgan/);
    assert.deepEqual(f.state().config,staged);
    assert.deepEqual(f.state().report,committed,'UX preview does not commit a pending report');
    assert.equal(f.el('layoutDialog').open,true);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Guided first chapter shows UX discovery before configuration, without exporting',async()=>{
  const f=fixture();try{
    await f.clock.tickAsync(0);
    assert.equal(f.el('uxDialog').open,false,'Paused initial page does not open a dialog');
    f.click('playBtn');await f.clock.tickAsync(1000);
    assert.equal(f.el('uxDialog').open,true);
    assert.equal(f.el('uxDialog').querySelectorAll('.ux-combined-grid').length,1);
    assert.equal(f.el('uxCommentsPreview').querySelectorAll('tbody tr').length,5);
    assert.equal(f.state().report,null);
    await f.clock.tickAsync(5500);
    assert.equal(f.el('uxDialog').open,false);
    assert.ok(f.el('configureBtn').classList.contains('tour-focus'));
    assert.equal(f.state().report,null);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('Focus mode changes only the viewport presentation and retains financial state',async()=>{
  const f=fixture();try{
    await f.prepare();const original=f.state(),table=f.el('reportTable').innerHTML,chart=f.el('chartBars').innerHTML;
    f.click('focusBtn');
    assert.equal(f.window.document.body.classList.contains('focus-demo'),true);
    assert.equal(f.el('focusBtn').getAttribute('aria-pressed'),'true');
    assert.deepEqual(f.state(),original);assert.equal(f.el('reportTable').innerHTML,table);assert.equal(f.el('chartBars').innerHTML,chart);
    f.click('focusBtn');
    assert.equal(f.window.document.body.classList.contains('focus-demo'),false);
    assert.equal(f.el('focusBtn').getAttribute('aria-pressed'),'false');
    assert.deepEqual(f.state(),original);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});

test('V3 guidance is wired with V2 data and preserved V1 source checkpoints',()=>{
  const expected={
    'budget-review-data-v1.js':'6a5987f7d3b47f5a82674b54969a938cf2d5eec4fef0598eb686ec8bc53a8da7',
    'budget-review-v1.js':'4180a03b683a452e84ffa97b42d1bffcd8bcf01dece00b9b3e4da8d39e0fd6f6',
    'budget-review-v1.css':'960e5eb3daf2a5433a2035d9c4252cb0f63dc451d297837390a7745046b3414d'
  };
  for(const [name,sha]of Object.entries(expected))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'assets',name))).digest('hex'),sha,name+' remains unchanged');
  const html=fs.readFileSync(path.join(root,'demo/budget-review.html'),'utf8');
  for(const asset of ['budget-review-data-v2.js','budget-review-v3.js','budget-review-v2.css'])assert.ok(html.includes('../assets/'+asset));
});
