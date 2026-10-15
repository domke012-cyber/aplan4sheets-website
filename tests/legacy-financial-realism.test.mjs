import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root=path.resolve(import.meta.dirname,'..');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(file){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'demo',file),'utf8'),{url:'https://example.test/demo/'+file,runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,errors=[];
  window.matchMedia=()=>({matches:false});
  window.console.error=(...args)=>errors.push(args.join(' '));
  const clock=FakeTimers.withGlobal(window).install({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});
  window.HTMLMediaElement.prototype.play=function(){this._timer=window.setTimeout(()=>this.dispatchEvent(new window.Event('ended')),500);return Promise.resolve();};
  window.HTMLMediaElement.prototype.pause=function(){window.clearTimeout(this._timer);};
  for(const script of window.document.querySelectorAll('script'))window.eval(script.src?fs.readFileSync(path.resolve(root,'demo',script.getAttribute('src')),'utf8'):script.textContent+(script.textContent.includes('demoPlayer.mount()')?'\nwindow.testPlayer=demoPlayer;':''));
  return{window,clock,errors,player:window.testPlayer,close(){clock.uninstall();window.close();}};
}

test('Discovery Sep26 QTD and YTD values derive from Q3 and Q1–Q3 rather than annualizing QTD',async()=>{
  const f=fixture('discovery.html');try{
    await f.clock.tickAsync(0);
    const {source,build}=f.window.DiscoveryFinancials,rows=build();
    assert.equal(rows.length,8);assert.equal(rows.filter(row=>row.total).length,2);
    for(const leaf of source){
      const row=rows.find(candidate=>candidate.label===leaf.label);
      assert.equal(leaf.actual.length,3);assert.equal(leaf.budget.length,3);
      assert.equal(row.qtdActual,leaf.actual[2]);assert.equal(row.qtdForecast,leaf.forecast[2]);
      assert.equal(row.ytdActual,leaf.actual.reduce((sum,value)=>sum+value,0));
      assert.equal(row.ytdBudget,leaf.budget.reduce((sum,value)=>sum+value,0));
      assert.notEqual(row.ytdActual,row.qtdActual*4);
      assert.ok(row.ytdActual>row.qtdActual*2&&row.ytdActual<row.qtdActual*3.2,'Plausible Q1–Q3 spending pattern for '+row.label);
    }
    const salary=rows.find(row=>row.label==='Salaries');
    assert.equal(salary.ytdActual,2740435);
    assert.equal(salary.qtdVariance,43215);
    assert.equal((salary.qtdVariancePercent*100).toFixed(1),'4.4');
  }finally{f.close();}
});

test('Discovery expense variance uses the comparison denominator and aggregate ratios, never summed percentages',async()=>{
  const f=fixture('discovery.html');try{
    await f.clock.tickAsync(0);const {source,build}=f.window.DiscoveryFinancials,rows=build();
    for(const row of rows){
      assert.equal(row.qtdVariance,row.qtdForecast-row.qtdActual);
      assert.equal(row.qtdVariancePercent,row.qtdVariance/row.qtdForecast);
      assert.equal(row.qtdYoYPercent,(row.qtdActual-row.priorQ3)/row.priorQ3);
      assert.equal(row.ytdVariance,row.ytdBudget-row.ytdActual);
    }
    for(const [group,totalName]of [['headcount','Headcount Expense Total'],['controllable','Controllable Total']]){
      const labels=source.filter(row=>row.group===group).map(row=>row.label),leaves=rows.filter(row=>labels.includes(row.label)),total=rows.find(row=>row.label===totalName);
      for(const key of ['qtdActual','qtdForecast','qtdVariance','priorQ3','ytdActual','ytdBudget','ytdVariance'])assert.equal(total[key],leaves.reduce((sum,row)=>sum+row[key],0));
      assert.notEqual(total.qtdVariancePercent,leaves.reduce((sum,row)=>sum+row.qtdVariancePercent,0));
      assert.notEqual(total.qtdYoYPercent,leaves.reduce((sum,row)=>sum+row.qtdYoYPercent,0));
    }
    const zero=plain(source);zero[0].forecast[2]=0;zero[0].priorQ3=0;
    const undefinedRates=build(zero).find(row=>row.label==='Salaries');
    assert.equal(undefinedRates.qtdVariancePercent,null);assert.equal(undefinedRates.qtdYoYPercent,null);
  }finally{f.close();}
});

test('UX recognized subscription revenue, cost components and annual amounts reconcile exactly',async()=>{
  const f=fixture('ux-formatting.html');try{
    await f.clock.tickAsync(0);const {build}=f.window.UXFinancials,a=build();
    for(let period=0;period<5;period++){
      assert.equal(a.saas[period],a.existing[period]+a.newSubscriptions[period]+a.expansion[period]);
      assert.equal(a.revenue[period],a.saas[period]+a.services[period]);
      assert.equal(a.cogs[period],a.hosting[period]+a.support[period]+a.onboarding[period]);
      assert.equal(a.grossProfit[period],a.revenue[period]-a.cogs[period]);
      assert.equal(a.grossMargin[period],a.grossProfit[period]/a.revenue[period]);
    }
    for(const [key,periods]of Object.entries(a))if(key!=='grossMargin')assert.equal(periods[4],periods.slice(0,4).reduce((sum,value)=>sum+value,0),key+' annual rollup');
    assert.equal(a.revenue[4],58800000);assert.equal(a.grossProfit[4],41160000);
  }finally{f.close();}
});

test('Annual gross margin is weighted by revenue even when quarter margins differ',async()=>{
  const f=fixture('ux-formatting.html');try{
    await f.clock.tickAsync(0);const {source,build}=f.window.UXFinancials,changed=plain(source);
    changed.hosting[0]+=500000;
    const a=build(changed),rates=a.grossMargin.slice(0,4);
    assert.equal(a.grossMargin[4],a.grossProfit[4]/a.revenue[4]);
    assert.notEqual(a.grossMargin[4],rates.reduce((sum,value)=>sum+value,0));
    assert.notEqual(a.grossMargin[4],rates.reduce((sum,value)=>sum+value,0)/4);
    for(const key of ['existing','newSubscriptions','expansion','services'])changed[key][0]=0;
    assert.equal(build(changed).grossMargin[0],null);
  }finally{f.close();}
});

test('Pivot and UX reports use consistent P&L values and pivot EBITDA derives from gross profit less Opex',async()=>{
  const ux=fixture('ux-formatting.html'),pivot=fixture('pivot.html');try{
    await ux.clock.tickAsync(0);await pivot.clock.tickAsync(0);
    const a=ux.window.UXFinancials.build(),b=pivot.window.PivotFinancials.build();
    for(const key of ['saas','services','revenue','cogs','grossProfit'])assert.deepEqual(plain(a[key]),plain(b[key]));
    for(let period=0;period<5;period++)assert.equal(b.ebitda[period],b.grossProfit[period]-b.opex[period]);
    for(const [key,values]of Object.entries(b))assert.equal(values[4],values.slice(0,4).reduce((sum,value)=>sum+value,0),key+' annual rollup');
  }finally{ux.close();pivot.close();}
});

test('Financial walkthroughs retain their final flow, row counts and clearly labeled semantics',async()=>{
  for(const file of ['discovery.html','ux-formatting.html','pivot.html']){
    const f=fixture(file);try{
      await f.clock.tickAsync(0);f.player.play();await f.clock.tickAsync(300000);
      assert.equal(f.player.finished,true,file+' finishes');assert.deepEqual(f.errors,[],file+' has no scene failures');
      const table=f.window.document.getElementById('gridTable').textContent;
      if(file==='discovery.html'){
        assert.match(table,/2,740,435/);assert.match(table,/4\.4%/);assert.ok(!table.includes('3,782,940'));
        const receipt=f.window.document.getElementById('sidebarContent').textContent;
        assert.match(receipt,/8 rows × 9 data columns/);assert.match(receipt,/QTD = Jul–Sep; YTD = Jan–Sep/);
        assert.match(receipt,/positive is favorable/);assert.match(receipt,/divides by the comparison amount/);
      }else if(file==='ux-formatting.html'){
        assert.equal(f.window.document.querySelectorAll('#gridBody > tr[id^="row"]').length,17);
        assert.match(table,/Existing subscriptions/);assert.ok(!table.includes('New ARR'));
        assert.ok(!table.includes('Churn'));assert.match(table,/Gross Margin %/);
        assert.match(f.window.document.getElementById('widgetConfig').textContent,/annual gross profit ÷ annual revenue/);
      }else{
        assert.equal(f.window.document.querySelectorAll('#gridBody > tr').length,12);
        assert.match(table,/Gross Profit/);assert.ok(!table.includes('Gross Margin'));
        assert.match(table,/13,635,000/);
      }
    }finally{f.close();}
  }
});
