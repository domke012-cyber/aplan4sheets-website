(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = {id:'all', name:'All Cost Centers', level:0, children:[
    {id:'corporate',name:'Corporate',children:[
      {id:'finance',name:'Finance',teams:['Accounting','FP&A','Treasury']},
      {id:'people',name:'People',teams:['Talent','People Operations','Learning']}
    ]},
    {id:'commercial',name:'Commercial',children:[
      {id:'sales',name:'Sales',teams:['Field Sales West','Field Sales East','Sales Operations']},
      {id:'marketing',name:'Marketing',teams:['Growth','Brand','Events']}
    ]},
    {id:'product-ops',name:'Product & Operations',children:[
      {id:'engineering',name:'Engineering',teams:['Platform','Applications','Quality']},
      {id:'operations',name:'Operations',teams:['Supply Chain','Business Operations','Support']}
    ]}
  ]};
  const flatten = (node, parent = null, level = 0) => {
    const children = node.children || (node.teams || []).map((name, i) => ({id:node.id+'-'+i,name}));
    return [{id:node.id,name:node.name,parent,level,children:children.map(child => child.id)},...children.flatMap(child => flatten(child,node.id,level+1))];
  };
  const centers=flatten(root);
  const byCenter=new Map(centers.map(item => [item.id,item]));
  const baseLeafValues = [112,97,65,72,88,51,234,202,95,150,83,67,288,258,129,120,114,96];
  const leaves=centers.filter(item => !item.children.length);
  const leafValues=new Map(leaves.map((item,i) => [item.id,baseLeafValues[i]]));
  const costBase=id => {
    const item=byCenter.get(id);
    return item.children.length ? item.children.reduce((sum,child) => sum+costBase(child),0) : leafValues.get(id);
  };
  const choices=(...names) => names.map(name => ({id:name,name}));
  const dimensions={
    center:{label:'Cost Center',items:centers,initial:centers.map(({id}) => id)},
    time:{label:'Time',items:choices('Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26'),initial:['Jan 26','Feb 26','Mar 26']},
    measures:{label:'Line Items',items:choices('Personnel','Non-personnel','Total Expense'),initial:['Personnel','Non-personnel']},
    basis:{label:'GAAP Basis',items:choices('GAAP','Management'),initial:['GAAP']},
    versions:{label:'Versions',items:choices('Forecast','Budget','Actual'),initial:['Forecast']}
  };
  const catalog=[
    {name:'Operating Expenses',views:['Department Forecast','Expense by Cost Center','Default View']},
    {name:'Workforce Planning',views:['Headcount Review']},
    {name:'Revenue Planning',views:['Revenue by Segment']}
  ];
  const supported=catalog[0].views;
  const axes=['Rows','Columns','Pages'];
  const freshLayout=(view=null) => {
    const layout={
      Rows:['center'],
      Columns:['measures'],
      Pages:['time','basis','versions'],
      picks:Object.fromEntries(Object.entries(dimensions).map(([id,value]) => [id,new Set(value.initial)]))
    };
    if(view==='Expense by Cost Center'){
      layout.picks.measures=new Set(['Total Expense']);
      layout.picks.center=new Set(centers.filter(item => item.level===2).map(item => item.id));
    }else if(view==='Default View'){
      layout.picks.time=new Set(['Jan 26']);
      layout.picks.measures=new Set(['Total Expense']);
    }
    return layout;
  };
  const copyLayout=layout => ({
    ...Object.fromEntries(axes.map(axis => [axis,[...layout[axis]]])),
    picks:Object.fromEntries(Object.entries(layout.picks).map(([id,values]) => [id,new Set(values)]))
  });
  let state;
  const makeState=() => ({opened:new Set(), view:null, dialog:false, layout:freshLayout(), saved:null, selected:null, hierarchy:false, expanded:new Set(['all','corporate','commercial','product-ops']), itemSearch:'', drag:null});
  const el=(tag,cls,text) => {
    const element=document.createElement(tag);
    if(cls) element.className=cls;
    if(text!==undefined) element.textContent=text;
    return element;
  };
  const button=(text,cls,handler) => {
    const element=el('button',cls,text);
    element.type='button';
    element.addEventListener('click',handler);
    return element;
  };
  const chosen=key => dimensions[key].items.filter(item => state.layout.picks[key].has(item.id));
  const inHierarchy=() => state.selected==='center'&&state.hierarchy;
  const sameSet=(left,right) => left.size===right.size&&[...left].every(item => right.has(item));
  const stepHints=[
    'Open <strong>Operating Expenses</strong>, choose <strong>Department Forecast</strong>, then select <strong>Configure Pivot</strong>.',
    'Drag <strong>Time</strong> from <strong>Pages</strong> to <strong>Columns</strong>, or use the move dropdown on its card.',
    'Select <strong>Cost Center</strong>, open <strong>Show Hierarchy Selectors</strong>, then choose <strong>Only This</strong> on <strong>Level 2</strong>.',
    'Select <strong>Create Pivot</strong> to see your choices in the Sheet.'
  ];
  function guidance(){
    const hasLevelTwo=sameSet(state.layout.picks.center,new Set(centers.filter(item => item.level===2).map(item => item.id)));
    const step=state.dialog ? (!state.layout.Columns.includes('time') ? 1 : !hasLevelTwo ? 2 : 3) : state.saved ? 4 : 0;
    [...$('steps').children].forEach((item,index) => {
      item.classList.toggle('visited',index<step);
      if(index===step) item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
    });
    const message=step===4 ? 'Your pivot is ready. Select <strong>Repivot</strong> to change the layout and compare the result.' : stepHints[step];
    if($('guide').innerHTML!==message) $('guide').innerHTML=message;
  }
  function source(){
    const host=$('modules');
    const q=$('view-search').value.trim().toLowerCase();
    host.replaceChildren();
    for(const module of catalog){
      const matching=module.views.filter(view => !q||module.name.toLowerCase().includes(q)||view.toLowerCase().includes(q));
      if(!matching.length) continue;
      const opened=Boolean(q)||state.opened.has(module.name);
      const header=button('', 'module', () => {
        if(q){ $('view-search').value=''; state.opened.add(module.name); }
        else if(opened) state.opened.delete(module.name);
        else state.opened.add(module.name);
        source();
        [...host.querySelectorAll('.module')].find(node => node.dataset.module===module.name)?.focus();
      });
      header.dataset.module=module.name;
      header.append(el('span','',opened?'▾':'▸'),document.createTextNode(module.name));
      header.firstChild.setAttribute('aria-hidden','true');
      header.setAttribute('aria-expanded',String(opened));
      host.append(header);
      if(!opened) continue;
      const views=el('div','views');
      for(const name of matching){
        const available=supported.includes(name);
        const node=button('', 'view', () => {
          state.view=name;
          source();
          [...host.querySelectorAll('.view')].find(node => node.dataset.view===name)?.focus();
        });
        node.dataset.view=name;
        node.disabled=!available;
        node.setAttribute('aria-pressed',String(state.view===name));
        node.append(el('span','','▤'),document.createTextNode(available ? name : name+' · not in demo'));
        node.firstChild.setAttribute('aria-hidden','true');
        views.append(node);
      }
      host.append(views);
    }
    if(!host.children.length) host.append(el('p','empty','No matching modules or views.'));
    $('configure').disabled=!state.view;
  }
  function setSelection(key, values){
    state.layout.picks[key]=new Set(values);
    drawLayout();
    selector(false);
    status();
    guidance();
  }
  function selector(full=true){
    const key=state.selected;
    const host=$('selector-body');
    if(!key){
      $('selected-count').textContent='';
      host.replaceChildren(el('p','selector-lead','Click on a dimension to select items.'));
      return;
    }
    const dim=dimensions[key];
    $('selected-count').textContent=dim.label+' · '+chosen(key).length+'/'+dim.items.length;
    if(full){
      const field=el('input'); field.type='search'; field.id='item-search'; field.placeholder='Search items…';
      field.setAttribute('aria-label','Search '+dim.label+' items');
      field.value=state.itemSearch;
      field.addEventListener('input',() => {state.itemSearch=field.value;drawItems();});
      const toolbar=el('div','item-toolbar');
      for(const [label,values] of [['Default',dim.initial],['All',dim.items.map(({id}) => id)],['None',[]]]){
        toolbar.append(button(label,'',() => setSelection(key,values)));
      }
      host.replaceChildren(field,toolbar);
      if(key==='center'){
        const toggle=button(state.hierarchy?'Hide Hierarchy Selectors':'Show Hierarchy Selectors','hierarchy-toggle',() => {
          state.hierarchy=!state.hierarchy; selector(false); $('level-toggle').focus();
        });
        toggle.id='level-toggle'; toggle.setAttribute('aria-expanded',String(state.hierarchy));toggle.setAttribute('aria-controls','levels');
        host.append(toggle,el('div'));
        host.lastChild.id='levels';
      }
      const list=el('ul','item-list'); list.id='items'; list.setAttribute('aria-label',dim.label+' items');
      host.append(list);
    }
    if(key==='center'){
      const toggle=$('level-toggle');
      toggle.textContent=state.hierarchy?'Hide Hierarchy Selectors':'Show Hierarchy Selectors';
      toggle.setAttribute('aria-expanded',String(state.hierarchy));
      const levels=$('levels');
      const oldAction=document.activeElement?.dataset.levelAction;
      levels.replaceChildren();
      levels.hidden=!state.hierarchy;
      if(state.hierarchy){
        levels.className='hierarchy-levels';
        for(const [level,name] of ['All Cost Centers','Level 1','Level 2','Cost Center'].entries()){
          const ids=centers.filter(item => item.level===level).map(item => item.id);
          const row=el('div','hierarchy-level');
          row.append(el('strong','',name+' ('+ids.length+')'));
          const actions=el('div','level-actions');
          for(const label of ['Select All','Deselect All','Only This']){
            const action=button(label,'',() => {
              const current=state.layout.picks.center;
              setSelection('center',label==='Only This'?ids:label==='Select All'?[...current,...ids]:[...current].filter(id => !ids.includes(id)));
            });
            action.dataset.levelAction=level+'-'+label;
            action.setAttribute('aria-label',label+' · '+name);
            if(label==='Only This') action.setAttribute('aria-pressed',String(sameSet(state.layout.picks.center,new Set(ids))));
            actions.append(action);
          }
          row.append(actions); levels.append(row);
        }
      }
      if(oldAction) [...levels.querySelectorAll('button')].find(node => node.dataset.levelAction===oldAction)?.focus();
    }
    drawItems();
  }
  function drawItems(){
    const list=$('items');
    const q=state.itemSearch.trim().toLowerCase();
    const key=state.selected;
    const items=dimensions[key].items;
    const selection=state.layout.picks[key];
    const focus=document.activeElement?.dataset.itemFocus;
    const scroll=list.scrollTop;
    list.classList.toggle('has-levels',inHierarchy());
    list.replaceChildren();
    for(const item of items){
      if(q && !item.name.toLowerCase().includes(q)) continue;
      if(!q && key==='center'){
        let parent=item.parent;
        let visible=true;
        while(parent){
          if(!state.expanded.has(parent)){visible=false;break;}
          parent=byCenter.get(parent).parent;
        }
        if(!visible) continue;
      }
      const li=el('li');
      if(!q&&item.level) li.style.setProperty('--depth',String(item.level));
      if(key==='center'){
        if(item.children.length&&!q){
          const open=state.expanded.has(item.id);
          const expand=button(open?'▾':'▸','tree-expand',() => {
            if(open) state.expanded.delete(item.id);
            else state.expanded.add(item.id);
            drawItems();
          });
          expand.dataset.itemFocus='tree-'+item.id;
          expand.setAttribute('aria-label',(open?'Collapse ':'Expand ')+item.name);
          expand.setAttribute('aria-expanded',String(open));
          li.append(expand);
        }else li.append(el('span','tree-placeholder'));
      }
      const check=el('input'); check.type='checkbox';check.checked=selection.has(item.id);
      check.dataset.itemFocus='item-'+item.id;
      check.addEventListener('change',() => {
        const next=new Set(selection);
        if(check.checked) next.add(item.id);else next.delete(item.id);
        setSelection(key,next);
      });
      const label=el('label');label.append(check,document.createTextNode(item.name));li.append(label);
      list.append(li);
    }
    if(!list.children.length) list.append(el('li','empty','No matching items.'));
    list.scrollTop=scroll;
    if(focus) [...list.querySelectorAll('[data-item-focus]')].find(node => node.dataset.itemFocus===focus)?.focus({preventScroll:true});
  }
  function chooseDimension(key){
    if(state.selected!==key){
      state.selected=key;state.itemSearch='';
    }
    drawLayout();selector();focusCard(key);
  }
  function focusCard(key,control='.card-select'){
    [...$('layout').querySelectorAll('[data-dimension]')].find(node => node.dataset.dimension===key)?.querySelector(control)?.focus();
  }
  function move(key,axis,before=null){
    if(!dimensions[key]||!axes.includes(axis)||key===before) return;
    for(const name of axes) state.layout[name]=state.layout[name].filter(id => id!==key);
    const next=state.layout[axis];
    const index=next.indexOf(before);
    next.splice(index<0?(axis==='Columns'&&key==='time'?0:next.length):index,0,key);
    drawLayout();status();guidance();
  }
  function drawLayout(){
    const host=$('layout');
    host.replaceChildren();
    for(const axis of axes){
      const zone=el('section','zone');zone.dataset.axis=axis;
      zone.setAttribute('aria-label',axis+' drop zone');
      const head=el('div','zone-head');
      head.append(el('strong','',axis),el('span','',state.layout[axis].length+' dimensions'));
      zone.append(head);
      const cards=el('div','cards');
      for(const key of state.layout[axis]){
        const dim=dimensions[key];
        const card=el('div','card'+(state.selected===key?' active':'')); card.dataset.dimension=key;card.draggable=true;
        card.addEventListener('dragstart',event => {
          state.drag=key;
          if(event.dataTransfer){event.dataTransfer.setData('text/plain',key);event.dataTransfer.effectAllowed='move';}
        });
        card.addEventListener('dragend',() => {state.drag=null;clearDropTarget();});
        const select=button('','card-select',() => chooseDimension(key));
        select.setAttribute('aria-pressed',String(state.selected===key));
        select.append(el('span','grip','⠿'),el('span','',dim.label),el('span','count',chosen(key).length+'/'+dim.items.length));
        select.firstChild.setAttribute('aria-hidden','true');
        const dest=el('select');dest.setAttribute('aria-label','Move '+dim.label);
        dest.append(el('option','','Move'));
        dest.firstChild.value='';dest.firstChild.disabled=true;
        for(const target of axes){
          if(target===axis) continue;
          const option=el('option','',target);option.value=target;dest.append(option);
        }
        dest.value='';
        dest.addEventListener('change',() => {move(key,dest.value);focusCard(key,'select');});
        card.append(select,dest);cards.append(card);
      }
      if(!cards.children.length) cards.append(el('p','zone-empty','Drop a dimension here'));
      zone.append(cards);
      zone.addEventListener('dragover',event => {
        if(!state.drag) return;
        event.preventDefault();clearDropTarget();zone.classList.add('is-target');
        if(event.dataTransfer)event.dataTransfer.dropEffect='move';
      });
      zone.addEventListener('dragleave',event => {if(!zone.contains(event.relatedTarget))zone.classList.remove('is-target');});
      zone.addEventListener('drop',event => {
        if(!state.drag)return;
        event.preventDefault();
        const key=state.drag;state.drag=null;clearDropTarget();
        move(key,axis,event.target.closest('[data-dimension]')?.dataset.dimension);
      });
      host.append(zone);
    }
    host.append(el('p','layout-note','Drag cards to move or reorder them. Use Move to switch axes without dragging.'));
  }
  const clearDropTarget=() => $('layout').querySelectorAll('.is-target').forEach(zone => zone.classList.remove('is-target'));
  function status(){
    const empty=Object.keys(dimensions).find(key => !chosen(key).length);
    const invalid=!state.layout.Rows.length||!state.layout.Columns.length;
    $('create').disabled=Boolean(empty||invalid);
    $('layout-status').textContent=empty?'Choose at least one '+dimensions[empty].label+' item.':invalid?'Keep at least one dimension on Rows and Columns.':'Layout and item selections will be saved with this pivot.';
  }
  function openDialog(){
    state.dialog=true;state.selected=null;state.hierarchy=false;state.itemSearch='';
    state.layout=state.saved?copyLayout(state.saved.layout):freshLayout(state.view);
    $('view-name').textContent='Operating Expenses / '+state.view;
    $('pivot-title').textContent=state.saved?'Repivot':'Configure Pivot';
    $('pivot-dialog').hidden=false;
    $('sheet').inert=true;$('view-picker').inert=true;$('saved-view').inert=true;
    drawLayout();selector();status();guidance();$('close').focus();
  }
  function closeDialog(focus=true){
    state.dialog=false;state.drag=null;
    $('pivot-dialog').hidden=true;
    $('sheet').inert=false;$('view-picker').inert=false;$('saved-view').inert=false;
    guidance();
    if(focus)(state.saved?$('repivot'):$('configure'))?.focus();
  }
  const alpha=index => index<26?String.fromCharCode(65+index):alpha(Math.floor(index/26)-1)+alpha(index%26);
  function rowNumber(row,n){ const cell=el('th','row-num',String(n));cell.scope='row';row.append(cell); }
  function coordinates(thead,count){
    const row=el('tr');row.append(el('th','coordinate corner',''));
    for(let i=0;i<count;i++){const cell=el('th','coordinate',alpha(i));cell.scope='col';row.append(cell);}
    thead.append(row);
  }
  function blankGrid(){
    const table=el('table','sheet-grid');table.setAttribute('aria-label','Empty sample sheet');
    const head=el('thead');coordinates(head,12);table.append(head);
    const body=el('tbody');
    for(let i=0;i<18;i++){
      const row=el('tr');rowNumber(row,i+1);
      for(let j=0;j<12;j++) row.append(el('td','blank'+(!i&&!j?' active-cell':''),''));
      body.append(row);
    }
    table.append(body);$('sheet').replaceChildren(table);$('formula-value').textContent='';$('sheet-tab').textContent='Sheet1';
  }
  function combinations(keys,limit){
    const result=[];
    function visit(index,members){
      if(result.length===limit)return;
      if(index===keys.length){result.push(members);return;}
      const key=keys[index];
      for(const item of chosen(key)) {
        visit(index+1,{...members,[key]:item});
        if(result.length===limit)break;
      }
    }
    visit(0,{});
    return result;
  }
  function amount(members){
    const base=costBase(members.center.id);
    const timeFactor=1+dimensions.time.items.findIndex(item => item.id===members.time.id)*.035;
    const versionFactor={Forecast:1,Budget:.93,Actual:.97}[members.versions.id];
    const basisFactor=members.basis.id==='GAAP'?1:.89;
    const total=Math.round(base*1000*timeFactor*versionFactor*basisFactor);
    const personnel=Math.round(total*.72);
    return {Personnel:personnel,'Non-personnel':total-personnel,'Total Expense':total}[members.measures.id];
  }
  function renderPivot(){
    const rowKeys=state.layout.Rows, colKeys=state.layout.Columns;
    const rows=combinations(rowKeys,50),cols=combinations(colKeys,18),pages=combinations(state.layout.Pages,4000);
    const count=keys => keys.reduce((n,key) => n*chosen(key).length,1);
    const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
    const table=el('table','sheet-grid');
    table.setAttribute('aria-label',state.view+' report');
    const thead=el('thead');coordinates(thead,rowKeys.length+cols.length);
    colKeys.forEach((key,index) => {
      const tr=el('tr');rowNumber(tr,index+1);
      for(const rowKey of rowKeys){
        const th=el('th','grid-header',index===colKeys.length-1?dimensions[rowKey].label:'');
        th.scope='col';tr.append(th);
      }
      for(let first=0;first<cols.length;){
        let end=first+1;
        while(end<cols.length&&colKeys.slice(0,index+1).every(name => cols[first][name].id===cols[end][name].id))end++;
        const th=el('th','grid-header'+(index<colKeys.length-1?' group':''),cols[first][key].name);
        th.colSpan=end-first;th.scope=end-first>1?'colgroup':'col';tr.append(th);first=end;
      }
      thead.append(tr);
    });
    table.append(thead);
    const tbody=el('tbody');
    rows.forEach((row,i) => {
      const tr=el('tr');rowNumber(tr,colKeys.length+i+1);
      for(const key of rowKeys){
        const cell=el('th','grid-cell row-label',row[key].name);cell.scope='row';
        if(key==='center')cell.style.paddingLeft=String(9+Math.max(0,row[key].level-1)*8)+'px';
        tr.append(cell);
      }
      for(const col of cols){
        const value=pages.reduce((total,page) => total+amount({...row,...col,...page}),0);
        tr.append(el('td','grid-cell num',currency.format(value)));
      }
      tbody.append(tr);
    });
    table.append(tbody);
    $('sheet').replaceChildren(table);$('sheet').scrollTop=0;$('sheet').scrollLeft=0;
    $('formula-value').textContent=state.view;
    $('sheet-tab').textContent='[P] '+state.view;
    const saved=$('saved-view');saved.hidden=false;$('view-picker').hidden=true;
    saved.replaceChildren(el('p','saved-label','[P] '+state.view),el('p','saved-summary','Sample pivot created · '+rows.length+' rows × '+cols.length+' columns'));
    if(rows.length<count(rowKeys)||cols.length<count(colKeys)) saved.append(el('p','saved-summary','Preview capped at 50 rows and 18 data columns.'));
    for(const key of state.layout.Pages){
      saved.append(el('p','saved-summary',dimensions[key].label+': '+chosen(key).map(item => item.name).join(', ')));
    }
    const again=button('Repivot','secondary',openDialog);again.id='repivot';saved.append(again);
  }
  function savePivot(){
    if($('create').disabled)return;
    state.saved={layout:copyLayout(state.layout),view:state.view};
    renderPivot();closeDialog(false);$('sheet').focus({preventScroll:true});
  }
  function reset(){
    state=makeState();
    $('saved-view').hidden=true;$('saved-view').replaceChildren();$('view-picker').hidden=false;
    $('view-search').value='';source();blankGrid();closeDialog(false);
  }
  $('configure').addEventListener('click',openDialog);
  $('close').addEventListener('click',() => closeDialog());
  $('cancel').addEventListener('click',() => closeDialog());
  $('create').addEventListener('click',savePivot);
  $('reset').addEventListener('click',() => {reset();$('view-search').focus();});
  $('view-search').addEventListener('input',source);
  document.addEventListener('keydown',event => {
    if(event.key==='Escape'&&state.dialog&&event.target.type!=='search'){event.preventDefault();closeDialog();}
  });
  reset();
})();
