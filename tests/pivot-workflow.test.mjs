import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html=readFileSync(new URL('../demo/pivot-workflow.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../assets/pivot-workflow-v1.js',import.meta.url),'utf8');
function demo(t){
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://aplan4sheets.com/demo/pivot-workflow.html'});
  t.after(() => dom.window.close());
  dom.window.eval(js);
  const {document}=dom.window;
  const $=selector => document.querySelector(selector);
  const all=selector => [...document.querySelectorAll(selector)];
  const click=selector => $(selector).click();
  const change=(selector,value,event='change') => {
    const node=$(selector);node.value=value;
    node.dispatchEvent(new dom.window.Event(event,{bubbles:true}));
  };
  const configure=() => {
    click('[data-module="Operating Expenses"]');
    click('[data-view="Department Forecast"]');
    click('#configure');
  };
  const levelTwo=() => {
    click('[data-dimension="center"] .card-select');
    click('#level-toggle');
    click('[aria-label="Only This · Level 2"]');
  };
  return {dom,$,all,click,change,configure,levelTwo};
}

test('module search finds a view; default workflow produces a scoped monthly report', t => {
  const {$,all,click,change,levelTwo}=demo(t);
  assert.equal($('#configure').disabled,true);
  change('#view-search','sales','input');
  assert.match($('#modules').textContent,/No matching/);
  change('#view-search','department','input');
  assert.equal(all('.view').length,1);
  click('[data-view="Department Forecast"]');
  click('#configure');
  assert.equal($('#pivot-dialog').hidden,false);
  assert.match($('#view-name').textContent,/Operating Expenses \/ Department Forecast/);
  change('[aria-label="Move Time"]','Columns');
  assert.equal($('[data-axis=Columns] [data-dimension=time]')!==null,true);
  levelTwo();
  assert.equal($('#selected-count').textContent,'Cost Center · 6/28');
  assert.equal($('#items input:checked').value,'on');
  assert.equal(all('#items input:checked').length,6);
  click('#create');
  assert.equal($('#pivot-dialog').hidden,true);
  assert.match($('#sheet-tab').textContent,/\[P\] Department Forecast/);
  assert.deepEqual(all('#sheet tbody .row-label').map(node => node.textContent),['Finance','People','Sales','Marketing','Engineering','Operations']);
  assert.deepEqual(all('#sheet .grid-header.group').map(node => node.textContent),['Jan 26','Feb 26','Mar 26']);
  assert.equal(all('#sheet .num').length,36);
  assert.equal($('#sheet .num').textContent,'$197,280');
  assert.match($('#saved-view').textContent,/6 rows × 6 columns/);
});

test('native drag swaps axes and drop-before reorders cards; saved positions shape the output',t => {
  const {dom,$,all,click,configure,levelTwo}=demo(t);
  configure();
  const drag=(from,to) => {
    const source=$(from),target=$(to);
    source.dispatchEvent(new dom.window.Event('dragstart',{bubbles:true,cancelable:true}));
    const over=new dom.window.Event('dragover',{bubbles:true,cancelable:true});
    target.dispatchEvent(over);
    assert.equal(over.defaultPrevented,true);
    target.dispatchEvent(new dom.window.Event('drop',{bubbles:true,cancelable:true}));
  };
  drag('[data-dimension=time]','[data-axis=Columns] [data-dimension=measures]');
  drag('[data-dimension=measures]','[data-axis=Columns] [data-dimension=time]');
  assert.deepEqual(all('[data-axis=Columns] .card').map(node => node.dataset.dimension),['measures','time']);
  levelTwo();
  click('#create');
  assert.deepEqual(all('#sheet .grid-header.group').map(node => node.textContent),['Personnel','Non-personnel']);
  assert.equal($('#sheet .num').textContent,'$197,280');
});

test('hierarchy level actions and tree search update counts; no empty axis or selection can be saved',t => {
  const {$,all,click,change,configure,levelTwo}=demo(t);
  configure();levelTwo();
  click('[aria-label="Select All · Level 1"]');
  assert.match($('#selected-count').textContent,/9\/28/);
  click('[aria-label="Deselect All · Level 1"]');
  assert.match($('#selected-count').textContent,/6\/28/);
  click('[aria-label="Expand Sales"]');
  assert.equal($('#items [data-item-focus=item-sales-0]')!==null,true);
  change('#item-search','west','input');
  assert.equal(all('#items input').length,1);
  click('#items input');
  assert.match($('#selected-count').textContent,/7\/28/);
  change('#item-search','','input');
  click('#selector-body .item-toolbar button:last-child');
  assert.equal($('#create').disabled,true);
  assert.match($('#layout-status').textContent,/at least one Cost Center/);
  click('#selector-body .item-toolbar button:first-child');
  change('[aria-label="Move Cost Center"]','Pages');
  assert.equal($('#create').disabled,true);
  change('[aria-label="Move Cost Center"]','Rows');
  assert.equal($('#create').disabled,false);
});

test('repivot restores saved selections, cancel is non-destructive, and changing version changes amounts',t => {
  const {$,click,change,configure,levelTwo}=demo(t);
  configure();levelTwo();
  change('[aria-label="Move Time"]','Columns');
  click('#create');
  const forecast=$('#sheet .num').textContent;
  click('#repivot');
  click('[data-dimension=versions] .card-select');
  click('[data-item-focus=item-Forecast]');
  click('[data-item-focus=item-Budget]');
  click('#cancel');
  assert.equal($('#sheet .num').textContent,forecast);
  click('#repivot');
  click('[data-dimension=versions] .card-select');
  assert.equal($('[data-item-focus=item-Forecast]').checked,true);
  click('[data-item-focus=item-Forecast]');
  click('[data-item-focus=item-Budget]');
  click('#create');
  assert.notEqual($('#sheet .num').textContent,forecast);
  assert.match($('#saved-view').textContent,/Versions: Budget/);
  click('#reset');
  assert.equal($('#saved-view').hidden,true);
  assert.equal($('#configure').disabled,true);
  assert.equal($('#sheet-tab').textContent,'Sheet1');
});
