import i18n, { LANGUAGE_OPTIONS, i18nReady } from './i18n.js';

// storage helpers (pluggable via data-layer.js)
const store = window.DataStore || {
  get(k,f){
    try{
      const v=localStorage.getItem(k);
      return v?JSON.parse(v):f;
    }catch{
      return f;
    }
  },
  set(k,v){
    localStorage.setItem(k,JSON.stringify(v));
  }
};
if(!window.DataStore){
  window.DataStore = store;
}

const gateway = window.DataGateway || null;
const srAnnouncer=document.getElementById('sr-announcer');
const focusableSelectors='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
let activeModal=null;
let lastFocused=null;
let lastSyncedAt=new Date();

  function announce(message){
    if(!srAnnouncer) return;
    srAnnouncer.textContent='';
    srAnnouncer.textContent=message;
  }

  function createEl(tag, { text=null, className=null, attrs={}, dataset={}, html=null } = {}, children=[]){
    const el=document.createElement(tag);
    if(className) el.className=className;
    Object.entries(dataset).forEach(([key,value])=>{if(value!==undefined) el.dataset[key]=value;});
    Object.entries(attrs).forEach(([key,value])=>{
      if(value===undefined || value===null) return;
      if(key in el && key!=='role'){
        try{el[key]=value;}catch{el.setAttribute(key,value);}
      }else{
        el.setAttribute(key,value);
      }
    });
    if(html!==null){
      el.innerHTML=html;
    }else if(text!==null){
      el.textContent=text;
    }
    children.forEach(child=>{if(child) el.appendChild(child);});
    return el;
  }

  function trapFocus(modal){
    const focusables=modal.querySelectorAll(focusableSelectors);
    if(!focusables.length) return;
    const first=focusables[0];
    const last=focusables[focusables.length-1];
    function handleTab(e){
      if(e.key!=='Tab') return;
      if(e.shiftKey){
        if(document.activeElement===first){
          e.preventDefault();
          last.focus();
        }
      }else if(document.activeElement===last){
        e.preventDefault();
        first.focus();
      }
    }
    if(modal.__trapHandler){
      modal.removeEventListener('keydown',modal.__trapHandler);
    }
    modal.__trapHandler=handleTab;
    modal.addEventListener('keydown',handleTab);
    requestAnimationFrame(()=>first.focus());
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && activeModal){
      e.preventDefault();
      closeModal(activeModal);
    }
  });

  // nav and smooth scroll
  const navLinks=document.querySelectorAll('.nav-list a');
  const secs=document.querySelectorAll('section.panel');
  const io=new IntersectionObserver(es=>{es.forEach(e=>{const id=e.target.getAttribute('id');const a=document.querySelector('.nav-list a[href="#'+id+'"]');if(e.isIntersecting)a?.classList.add('active');else a?.classList.remove('active')})},{threshold:.3});
  secs.forEach(s=>io.observe(s));
  navLinks.forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();document.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}));

  // theme toggle (ascii icons)
  const tbtn=document.querySelector('#theme-toggle');
  const tlabel=tbtn?.querySelector('.chip__label');
  const ticon=tbtn?.querySelector('.chip__icon');
  const prefersDark=window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const themeInit=localStorage.getItem('dashboard-theme')||(prefersDark?'dark':'light');
  function applyTheme(th){document.body.dataset.theme=th==='dark'?'dark':'light';if(tlabel) tlabel.textContent=th==='dark'?'Dark':'Light';tbtn?.setAttribute('aria-pressed',th==='dark'?'true':'false');if(ticon) ticon.textContent=th==='dark'?"Moon":"Sun"}
  applyTheme(themeInit);
  tbtn?.addEventListener('click',()=>{const th=document.body.dataset.theme==='dark'?'light':'dark';applyTheme(th);localStorage.setItem('dashboard-theme',th)});

  const translator=new Proxy({}, {
  get(_target, prop){
    if(typeof prop==='symbol') return undefined;
    return i18n.t(String(prop));
  }
});

function T(){
  return translator;
}

function ensureLang(){
  const actions=document.querySelector('.top-bar__actions');
  if(!actions) return;
  let sel=document.getElementById('lang-select');
  if(!sel){
    sel=document.createElement('select');
    sel.id='lang-select';
    sel.className='chip chip--quiet lang-select';
    LANGUAGE_OPTIONS.forEach(option=>{
      const opt=document.createElement('option');
      opt.value=option.code;
      opt.textContent=option.shortLabel;
      sel.appendChild(opt);
    });
    actions.insertBefore(sel, actions.firstChild);
    sel.addEventListener('change',event=>{
      const nextLang=event.target.value;
      if(nextLang && nextLang!==i18n.language){
        void i18n.changeLanguage(nextLang);
      }
    });
  }
  sel.setAttribute('aria-label', i18n.t('languageLabel'));
  const resolved=i18n.resolvedLanguage || i18n.language || 'en';
  if(resolved!==sel.value){
    sel.value=resolved;
  }
}

i18nReady.then(()=>{
  applyI18n();
  updateOverviewSubtitle();
  injectEditOverview();
  renderResidents();
  applyMessages();
  updateAuthUI();
  hydrateFromApi();
});

i18n.on('languageChanged',()=>{
  applyI18n();
  updateOverviewSubtitle();
  renderResidents();
  applyMessages();
  updateAuthUI();
});

  function setText(selector, value){
    const el=document.querySelector(selector);
    if(!el) return;
    const icon=el.querySelector?.('.chip__icon');
    if(icon){
      const label=el.querySelector('.chip__label');
      if(label){ label.textContent=value; return; }
      const textNode=Array.from(el.childNodes).find(node=>node.nodeType===Node.TEXT_NODE);
      if(textNode){ const trimmed=textNode.textContent.trim(); textNode.textContent=trimmed? ' '+value : value; return; }
    }
    el.textContent=value;
  }

  function applyI18n(){
    ensureLang();
    const L=T();
    document.documentElement.lang=i18n.language || 'en';
    const nav=document.querySelectorAll('.nav-list a');
    if(nav[0]) nav[0].textContent=L.navCare;
    if(nav[1]) nav[1].textContent=L.navRes;
    if(nav[2]) nav[2].textContent=L.navOps;
    if(nav[3]) nav[3].textContent=L.navFam;
    setText('#overview h1',L.heroTitle);
    setText('#residents h1',L.resTitle);
    setText('#residents .panel-subtitle',L.resSub);
    setText('#operations h1',L.opsTitle);
    setText('#operations .panel-subtitle',L.opsSub);
    setText('#family h1',L.famTitle);
    setText('#family .panel-subtitle',L.famSub);
    setText('[data-card="wellbeing"] h2',L.headingWellbeing);
    setText('[data-card="alerts"] h2',L.headingAlerts);
    setText('[data-list="interventions"] h3',L.headingInterventions);
    setText('[data-list="recent-alerts"] h3',L.headingRecentAlerts);
    setText('#overview [data-refresh]',L.refresh);
    setText('#overview .panel-actions .primary',L.genReport);
    const editBtn=document.querySelector('[data-edit-overview]');
    if(editBtn) editBtn.textContent=L.editOverview;
    setText('#residents .panel-actions button:last-of-type',L.addRes);
    const filterChips=document.querySelectorAll('#overview .chip-row .chip');
    if(filterChips.length>=4){
      filterChips[0].textContent=L.filterAll;
      filterChips[1].textContent=L.filterHigh;
      filterChips[2].textContent=L.filterFollow;
      filterChips[3].textContent=L.filterStable;
    }
    setText('#operations .panel-actions button:first-of-type',L.downloadSchedule);
    setText('#operations .panel-actions button:last-of-type',L.adjStaff);
    setText('#family .primary',L.newMsg);
    const shareBtn=document.querySelector('#family .chip--primary');
    if(shareBtn) shareBtn.textContent=L.share;
    const headers=document.querySelectorAll('.table-row--header span[role="columnheader"]');
    const headerLabels=[L.colResident,L.colRoom,L.colLast,L.colVitals,L.colNotes];
    headers.forEach((cell,idx)=>{if(headerLabels[idx]) cell.textContent=headerLabels[idx];});
  }


  // accounts and session
  const DEFAULT_ACCOUNTS=[{username:'Admin',password:'admin',role:'admin'},{username:'Ms.Testing',password:'admin',role:'caregiver'}];
  const accounts=store.get('accounts',DEFAULT_ACCOUNTS);
  function saveAccounts(){store.set('accounts',accounts)}
  let session=store.get('session',null);
  function isLoggedIn(){return !!session}
  function isAdmin(){return session?.role==='admin'}
  function signIn(u,p){
    const lang=T();
    const user=accounts.find(a=>a.username===u&&a.password===p);
    if(!user) return false;
    session={username:user.username,role:user.role};
    store.set('session',session);
    updateAuthUI();
    toast(lang.toastSignedIn);
    return true;
  }
  function signOut(){
    const lang=T();
    session=null;
    store.set('session',null);
    updateAuthUI();
    toast(lang.toastSignedOut);
  }
  function signUpCaregiver(u,p){if(accounts.some(a=>a.username===u))return false;accounts.push({username:u,password:p,role:'caregiver'});saveAccounts();return true}
  function updateAuthUI(){
    const label=document.querySelector('.user-name');
    const btn=document.querySelector('.sign-out');
    const staffingBtn=document.querySelector('#operations .panel-actions button:last-of-type');
    const lang=T();
    if(!btn) return;
    if(isLoggedIn()){
      if(label) label.textContent=session.username;
      btn.textContent=lang.signOut;
      btn.onclick=()=>signOut();
      staffingBtn?.removeAttribute('disabled');
    }else{
      if(label) label.textContent=i18n.t('guest');
      btn.textContent=lang.signIn;
      btn.onclick=()=>openAuthModal('signin');
      staffingBtn?.setAttribute('disabled','disabled');
    }
  }

  // overview
  const refreshBtn=document.querySelector('[data-refresh]');
  function updateLastSync(){
    lastSyncedAt=new Date();
    updateOverviewSubtitle();
  }
  function updateOverviewSubtitle(){
    const sub=document.querySelector('#overview .panel-subtitle');
    if(!sub) return;
    const L=T();
    const timeString=lastSyncedAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    sub.textContent=`${L.overviewSyncedPrefix} ${timeString} • ${state.residents.length} ${L.overviewResidentsSuffix}`;
  }
  refreshBtn?.addEventListener('click',()=>{
    refreshBtn.classList.add('is-refreshing');
    setTimeout(()=>refreshBtn.classList.remove('is-refreshing'),600);
    updateLastSync();
  });

  // residents
  const DEFAULT_RESIDENTS=[
    {id:'r1',name:'Mrs. Chen',room:'204',lastCheckIn:'08:45',bp:'118/76',hr:72,notes:'Hydration reminder set',priority:'medium'},
    {id:'r2',name:'Mr. Lee',room:'310',lastCheckIn:'07:55',bp:'130/82',hr:80,notes:'Awaiting PT session',priority:'low'},
    {id:'r3',name:'Mrs. Singh',room:'118',lastCheckIn:'09:10',bp:'110/70',hr:96,notes:'Monitoring elevated HR',priority:'high'},
    {id:'r4',name:'Ms. Lopez',room:'122',lastCheckIn:'08:20',bp:'116/74',hr:68,notes:'Awaiting OT follow-up',priority:'medium'}
  ];
  const DEFAULT_OPS={bedsTotal:64,bedsOccupied:56,admissions:3,discharges:1,avgStay:142};
  const DEFAULT_MESSAGES=[
    {author:'Alex Chen',text:'Thanks for the update on hydration goals.',date:'2024-04-02'},
    {author:'Priya Singh',text:'Can we schedule a call this evening?',date:'2024-04-02'},
    {author:'Daniel Lee',text:"Please confirm tomorrow's PT session.",date:'2024-04-01'}
  ];
  const DEFAULT_OVERVIEW={
    wellbeing:82,
    alertsResolved:14,
    interventions:[
      'Schedule hydration reminder for Room 204.',
      'Increase night check-ins for Mrs. Chen.',
      'Coordinate physiotherapy follow-up for Mr. Lee.',
      'Document family visit feedback for Ms. Lopez.'
    ],
    recentAlerts:[
      {level:'critical',text:'Fall detected in west wing corridor at 09:32.'},
      {level:'warning',text:'Elevated heart rate reported for Mrs. Singh.'},
      {level:'info',text:'Battery low for wearable ID #A52.'},
      {level:'info',text:'New firmware ready for OTA deployment.'}
    ]
  };
  const state={
    residents:store.get('residents',DEFAULT_RESIDENTS),
    ops:store.get('ops',DEFAULT_OPS),
    messages:store.get('messages',DEFAULT_MESSAGES),
    overview:store.get('overview',DEFAULT_OVERVIEW),
    filterText:'',
    quickFilter:'all'
  };
  const table=document.querySelector('.resident-table');
  const search=document.querySelector('#resident-search');
  const empty=document.querySelector('[data-empty-state]');
  function matchesQuick(r){switch(state.quickFilter){case'high':return r.priority==='high';case'follow':return /follow|monitor|await/i.test(r.notes)||r.priority==='high';case'stable':return r.priority==='low'&&!/follow|monitor|await/i.test(r.notes);default:return true}}
  function matchesText(r,q){if(!q)return true;const v=q.toLowerCase();return r.name.toLowerCase().includes(v)||r.room.toLowerCase().includes(v)||r.notes.toLowerCase().includes(v)||r.bp.includes(v)||String(r.hr).includes(v)}
  function rowEl(r){
    const L=T();
    const row=createEl('div',{className:'table-row',attrs:{role:'row'},dataset:{name:r.name.toLowerCase()}});
    const cells=[r.name,r.room,r.lastCheckIn,`BP ${r.bp} | HR ${r.hr}`];
    cells.forEach(text=>row.appendChild(createEl('span',{attrs:{role:'cell'},text})));
    const notesCell=createEl('span',{attrs:{role:'cell'}});
    const noteText=createEl('span',{text:r.notes||''});
    const actions=createEl('span',{className:'resident-actions'});
    actions.append(
      createEl('button',{className:'icon-btn',attrs:{type:'button','data-edit':r.id,title:L.actionEdit},text:L.actionEdit}),
      createEl('button',{className:'icon-btn',attrs:{type:'button','data-delete':r.id,title:L.actionDelete},text:L.actionDelete})
    );
    notesCell.append(noteText, actions);
    row.appendChild(notesCell);
    return row;
  }
  function renderResidents(){
    if(!table)return;
    table.querySelectorAll('.table-row:not(.table-row--header)').forEach(n=>n.remove());
    const frag=document.createDocumentFragment();
    let visible=0;
    state.residents.forEach(r=>{
      if(matchesQuick(r)&&matchesText(r,state.filterText)){
        frag.appendChild(rowEl(r));
        visible++;
      }
    });
    table.appendChild(frag);
    if(empty) empty.hidden=visible!==0;
    updateOverviewSubtitle();
  }
  search?.addEventListener('input',e=>{state.filterText=e.target.value.trim();renderResidents()});
  (function quickChips(){const chips=document.querySelectorAll('#overview .chip-row .chip');if(!chips.length)return;chips[0].dataset.filter='all';chips[1].dataset.filter='high';chips[2].dataset.filter='follow';chips[3].dataset.filter='stable';chips.forEach((c,i)=>{if(i===0)c.setAttribute('aria-pressed','true');c.addEventListener('click',()=>{chips.forEach(x=>x.setAttribute('aria-pressed','false'));c.setAttribute('aria-pressed','true');state.quickFilter=c.dataset.filter||'all';renderResidents()})})})();
  document.querySelector('#residents .panel-actions button:last-of-type')?.addEventListener('click',()=>{if(!isLoggedIn())return openAuthModal('signin');openResidentModal()});
  table?.addEventListener('click',e=>{const L=T();const b=e.target.closest('button');if(!b)return;const eid=b.getAttribute('data-edit');const did=b.getAttribute('data-delete');if(eid){if(!isLoggedIn())return openAuthModal('signin');const rr=state.residents.find(x=>x.id===eid);openResidentModal(rr);}else if(did){if(!isLoggedIn())return openAuthModal('signin');if(confirm(`${L.actionDelete}?`)){state.residents=state.residents.filter(x=>x.id!==did);store.set('residents',state.residents);renderResidents();toast(L.toastResidentDeleted);}}});
  function openResidentModal(res){
    const L=T();
    const modalTitle=res?`${L.actionEdit} ${L.colResident}`:L.addRes;
    const m=ensureModal('resident-modal',modalTitle);
    const body=m.querySelector('.modal__body');
    body.innerHTML=`<form id="resident-form">
      <input type="hidden" name="id" />
      <div class="form-row">
        <label><span>${L.labelName}</span><input name="name" required placeholder="Mrs. Chen"/></label>
        <label><span>${L.labelRoom}</span><input name="room" required placeholder="204"/></label>
      </div>
      <div class="form-row">
        <label><span>${L.labelLastCheck}</span><input name="lastCheckIn" required pattern="^\\d{2}:\\d{2}$" placeholder="08:45"/></label>
        <label><span>${L.labelPriority}</span><select name="priority">
          <option value="low">${L.priorityLow}</option>
          <option value="medium">${L.priorityMedium}</option>
          <option value="high">${L.priorityHigh}</option>
        </select></label>
      </div>
      <div class="form-row">
        <label><span>${L.labelBp}</span><input name="bp" required pattern="^\\d{2,3}\\/\\d{2,3}$" placeholder="118/76"/></label>
        <label><span>${L.labelHr}</span><input name="hr" type="number" min="30" max="220" required placeholder="72"/></label>
      </div>
      <label class="form-block"><span>${L.labelNotes}</span><textarea name="notes" rows="3" placeholder="Optional notes"></textarea></label>
      <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button type="submit" class="primary">${L.btnSave}</button></div>
    </form>`;
    const f=body.querySelector('#resident-form');
    if(res){
      f.elements.id.value=res.id;
      f.elements.name.value=res.name;
      f.elements.room.value=res.room;
      f.elements.lastCheckIn.value=res.lastCheckIn;
      f.elements.priority.value=res.priority;
      f.elements.bp.value=res.bp;
      f.elements.hr.value=res.hr;
      f.elements.notes.value=res.notes||'';
    }
    f.addEventListener('submit',ev=>{
      ev.preventDefault();
      const d=Object.fromEntries(new FormData(f).entries());
      const payload={
        id:d.id||'r'+Date.now(),
        name:String(d.name||'').trim(),
        room:String(d.room||'').trim(),
        lastCheckIn:String(d.lastCheckIn||'').trim(),
        priority:String(d.priority||'low'),
        bp:String(d.bp||'').trim(),
        hr:Number(d.hr),
        notes:String(d.notes||'').trim()
      };
      const idx=state.residents.findIndex(x=>x.id===payload.id);
      if(idx>=0){ state.residents[idx]=payload; } else { state.residents.unshift(payload); }
      store.set('residents',state.residents);
      renderResidents();
      closeModal(m);
      toast(L.toastResidentSaved);
    },{once:true});
    openModal(m);
  }

  // operations: adjust staffing (admin only)
  const opsBtn=document.querySelector('#operations .panel-actions button:last-of-type');
  opsBtn?.addEventListener('click',()=>{
    const L=T();
    if(!isLoggedIn()) return openAuthModal('signin');
    if(!isAdmin()) return toast(L.toastAdminOnly);
    openStaffingModal();
  });
  function openStaffingModal(){
    const L=T();
    const m=ensureModal('staffing-modal',L.adjStaff);
    const body=m.querySelector('.modal__body');
    body.innerHTML=`<form id="staffing-form">
      <div class="form-row">
        <label><span>${L.labelOccupied}</span><input name="occupied" type="number" min="0" max="999" /></label>
        <label><span>${L.labelTotal}</span><input name="total" type="number" min="1" max="999" /></label>
      </div>
      <div class="form-row">
        <label><span>${L.labelAdmissions}</span><input name="admissions" type="number" min="0" max="999" /></label>
        <label><span>${L.labelDischarges}</span><input name="discharges" type="number" min="0" max="999" /></label>
      </div>
      <label class="form-block"><span>${L.labelAvgStay}</span><input name="avgStay" type="number" min="1" max="9999" /></label>
      <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button type="submit" class="primary">${L.btnSave}</button></div>
    </form>`;
    const f=body.querySelector('#staffing-form');
    f.elements.occupied.value=state.ops.bedsOccupied;
    f.elements.total.value=state.ops.bedsTotal;
    f.elements.admissions.value=state.ops.admissions;
    f.elements.discharges.value=state.ops.discharges;
    f.elements.avgStay.value=state.ops.avgStay;
    f.addEventListener('submit',ev=>{
      ev.preventDefault();
      const d=Object.fromEntries(new FormData(f).entries());
      state.ops={
        bedsOccupied:Number(d.occupied),
        bedsTotal:Number(d.total),
        admissions:Number(d.admissions),
        discharges:Number(d.discharges),
        avgStay:Number(d.avgStay)
      };
      store.set('ops',state.ops);
      applyOps();
      closeModal(m);
      toast(L.toastStaffingSaved);
    },{once:true});
    openModal(m);
  }
  function applyOps(){
    const card=Array.from(document.querySelectorAll('#operations .card--wide')).find(c=>c.querySelector('h3')?.textContent?.indexOf('Occupancy')>=0);
    if(!card) return;
    card.querySelector('.metric').textContent=`${state.ops.bedsOccupied} / ${state.ops.bedsTotal} beds occupied`;
    const prog=card.querySelector('progress');
    if(prog){
      prog.max=state.ops.bedsTotal;
      prog.value=state.ops.bedsOccupied;
    }
    const dds=card.querySelectorAll('.stat-list dd');
    if(dds[0]) dds[0].textContent='+'+state.ops.admissions;
    if(dds[1]) dds[1].textContent=String(state.ops.discharges);
    if(dds[2]) dds[2].textContent=String(state.ops.avgStay);
  }

  // family: message composer
  document.querySelector('#family .primary')?.addEventListener('click',()=>{
    if(!isLoggedIn()) return openAuthModal('signin');
    openMessageModal();
  });
  function openMessageModal(){
    const L=T();
    const m=ensureModal('message-modal',L.newMsg);
    const body=m.querySelector('.modal__body');
    body.innerHTML=`<form id="message-form">
      <div class="form-row">
        <label><span>${L.labelTo}</span><input name="author" required placeholder="Alex Chen"/></label>
        <label><span>${L.labelDate}</span><input name="date" type="date" required /></label>
      </div>
      <label class="form-block"><span>${L.labelMessage}</span><textarea name="text" rows="4" required placeholder="Write a message..."></textarea></label>
      <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button type="submit" class="primary">${L.btnSend}</button></div>
    </form>`;
    const f=body.querySelector('#message-form');
    f.elements.date.value=new Date().toISOString().slice(0,10);
    f.addEventListener('submit',ev=>{
      ev.preventDefault();
      const d=Object.fromEntries(new FormData(f).entries());
      const entry={author:String(d.author||'').trim(),text:String(d.text||'').trim(),date:d.date};
      state.messages.unshift(entry);
      store.set('messages',state.messages);
      applyMessages();
      closeModal(m);
      toast(L.toastMessageSent);
    },{once:true});
    openModal(m);
  }
  function applyMessages(){
    const ul=document.querySelector('#family .list--messages');
    if(!ul) return;
    ul.innerHTML='';
    const frag=document.createDocumentFragment();
    const formatter=new Intl.DateTimeFormat(document.documentElement.lang||'en',{month:'short',day:'numeric'});
    state.messages.forEach(msg=>{
      const li=document.createElement('li');
      li.appendChild(createEl('span',{className:'message-author',text:msg.author}));
      li.appendChild(createEl('span',{className:'message-preview',text:msg.text}));
      li.appendChild(createEl('time',{attrs:{datetime:msg.date},text:formatter.format(new Date(msg.date))}));
      frag.appendChild(li);
    });
    ul.appendChild(frag);
  }
  const shareBtn=document.querySelector('#family .chip--primary');
  shareBtn?.addEventListener('click',async()=>{
    const L=T();
    const link=location.origin+location.pathname+'#family';
    try{
      await navigator.clipboard.writeText(link);
      toast(L.toastLinkCopied);
    }catch{
      toast(L.toastLinkManual+link);
    }
  });

  // auth modal
  function openAuthModal(mode){
    const L=T();
    const m=ensureModal('auth-modal',L.signIn);
    const body=m.querySelector('.modal__body');
    function signInView(){
      m.querySelector('.modal__header h2').textContent=L.signIn;
      body.innerHTML=`<form id="signin-form">
        <div class="form-row">
          <label><span>${L.labelUsername}</span><input name="username" required placeholder="Admin"/></label>
          <label><span>${L.labelPassword}</span><input name="password" type="password" required placeholder="••••" /></label>
        </div>
        <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button class="primary" type="submit">${L.signIn}</button></div>
        <p>${L.ctaNeedAccount} <a href="#" data-goto-signup>${L.signUp ?? 'Sign up'}</a></p>
      </form>`;
      body.querySelector('[data-goto-signup]').addEventListener('click',e=>{
        e.preventDefault();
        signUpView();
      });
      body.querySelector('#signin-form').addEventListener('submit',e=>{
        e.preventDefault();
        const d=Object.fromEntries(new FormData(e.target).entries());
        if(signIn(d.username,d.password)){
          closeModal(m);
        }else{
          toast(L.toastInvalidCreds);
        }
      },{once:true});
    }
    function signUpView(){
      m.querySelector('.modal__header h2').textContent=L.signUp ?? 'Sign Up';
      body.innerHTML=`<form id="signup-form">
        <div class="form-row">
          <label><span>${L.labelUsername}</span><input name="username" required placeholder="Ms.Testing"/></label>
          <label><span>${L.labelPassword}</span><input name="password" type="password" required placeholder="••••" /></label>
        </div>
        <p>${L.labelRole}</p>
        <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button class="primary" type="submit">${L.btnCreate}</button></div>
        <p>${L.ctaHaveAccount} <a href="#" data-goto-signin>${L.signIn}</a></p>
      </form>`;
      body.querySelector('[data-goto-signin]').addEventListener('click',e=>{
        e.preventDefault();
        signInView();
      });
      body.querySelector('#signup-form').addEventListener('submit',e=>{
        e.preventDefault();
        const d=Object.fromEntries(new FormData(e.target).entries());
        if(!/^[\w.-]{2,}$/.test(d.username)){
          toast(L.toastInvalidUsername);
          return;
        }
        if(signUpCaregiver(d.username,d.password)){
          toast(L.toastAccountCreated);
          signInView();
        }else{
          toast(L.toastUsernameExists);
        }
      },{once:true});
    }
    if(mode==='signup') signUpView(); else signInView();
    openModal(m);
  }

  // modal helpers
  function ensureModal(id,title){
    let m=document.getElementById(id);
    if(!m){
      m=document.createElement('div');
      m.id=id;
      m.className='modal';
      m.innerHTML=`
        <div class="modal__backdrop" data-close></div>
        <div class="modal__content" role="dialog" aria-modal="true">
          <header class="modal__header"><h2></h2>
            <button class="icon-btn" type="button" data-close title="Close" aria-label="Close">&times;</button></header>
          <div class="modal__body"></div>
        </div>`;
      document.body.appendChild(m);
    }
    const heading=m.querySelector('.modal__header h2');
    heading.textContent=title;
    const content=m.querySelector('.modal__content');
    heading.id=`${id}-title`;
    content.setAttribute('aria-labelledby',heading.id);
    m.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>closeModal(m));
    return m;
  }
  function openModal(m){
    lastFocused=document.activeElement;
    m.classList.add('is-open');
    m.removeAttribute('aria-hidden');
    activeModal=m;
    trapFocus(m);
  }
  function closeModal(m){
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden','true');
    if(activeModal===m) activeModal=null;
    if(lastFocused){
      lastFocused.focus();
      lastFocused=null;
    }
  }
  function toast(msg){
    const el=createEl('div',{className:'toast',text:msg});
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('is-shown'));
    announce(msg);
    setTimeout(()=>{
      el.classList.remove('is-shown');
      setTimeout(()=>el.remove(),160);
    },2000);
  }

  // run
  applyOps();
  applyOverview();
  applyMessages();
  // report export
  document.querySelector('#overview .panel-actions .primary')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),residents:state.residents,overview:state.overview,ops:state.ops},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='smartcare-report.json'; a.click(); URL.revokeObjectURL(url);
  });

  async function hydrateFromApi(){
    if(!gateway || gateway.mode==='local') return;
    const L=T();
    try{
      const [residents,messages,ops,overview]=await Promise.all([
        gateway.residents.list(state.residents),
        gateway.messages.list(state.messages),
        gateway.operations.fetch(state.ops),
        gateway.overview.fetch(state.overview)
      ]);
      if(residents?.updated){
        state.residents=residents.data;
        store.set('residents',state.residents);
        renderResidents();
      }
      if(messages?.updated){
        state.messages=messages.data;
        store.set('messages',state.messages);
        applyMessages();
      }
      if(ops?.updated){
        state.ops=ops.data;
        store.set('ops',state.ops);
        applyOps();
      }
      if(overview?.updated){
        state.overview=overview.data;
        store.set('overview',state.overview);
        applyOverview();
      }
    }catch(err){
      console.warn('[DataGateway] hydrate failed',err);
      toast(L.toastApiFallback);
    }
  }
  // overview edit (admin)
  function injectEditOverview(){
    const actions=document.querySelector('#overview .panel-actions');
    if(!actions || actions.querySelector('[data-edit-overview]')) return;
    const button=createEl('button',{className:'chip',attrs:{type:'button'},dataset:{editOverview:'1'},text:T().editOverview});
    button.addEventListener('click',()=>{
      const L=T();
      if(!isLoggedIn()) return openAuthModal('signin');
      if(!isAdmin()) return toast(L.toastAdminOnly);
      openOverviewModal();
    });
    actions.appendChild(button);
  }
  function openOverviewModal(){
    const L=T();
    const m=ensureModal('overview-modal',L.editOverview);
    const body=m.querySelector('.modal__body');
    body.innerHTML=`<form id="overview-form">
      <div class="form-row">
        <label><span>${L.labelWellbeing}</span><input name="wellbeing" type="number" min="0" max="999" /></label>
        <label><span>${L.labelAlertsResolved}</span><input name="alerts" type="number" min="0" max="9999" /></label>
      </div>
      <label class="form-block"><span>${L.labelInterventions}</span><textarea name="intr" rows="5"></textarea></label>
      <label class="form-block"><span>${L.labelRecentAlerts}</span><textarea name="ral" rows="5"></textarea></label>
      <div class="modal__actions"><button type="button" class="chip" data-close>${L.btnCancel}</button><button type="submit" class="primary">${L.btnSave}</button></div>
    </form>`;
    const f=body.querySelector('#overview-form');
    f.elements.wellbeing.value=state.overview.wellbeing;
    f.elements.alerts.value=state.overview.alertsResolved;
    f.elements.intr.value=state.overview.interventions.join('\n');
    f.elements.ral.value=state.overview.recentAlerts.map(a=>`${a.level}: ${a.text}`).join('\n');
    f.addEventListener('submit',ev=>{
      ev.preventDefault();
      const d=Object.fromEntries(new FormData(f).entries());
      state.overview.wellbeing=Number(d.wellbeing);
      state.overview.alertsResolved=Number(d.alerts);
      state.overview.interventions=String(d.intr||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      state.overview.recentAlerts=String(d.ral||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{
        const match=line.match(/^(critical|warning|info)\s*:\s*(.+)$/i);
        return match?{level:match[1].toLowerCase(),text:match[2]}:{level:'info',text:line};
      });
      store.set('overview',state.overview);
      applyOverview();
      closeModal(m);
      toast(L.toastOverviewSaved);
    },{once:true});
    openModal(m);
  }
  function applyOverview(){
    const wellbeingMetric=document.querySelector('[data-card="wellbeing"] .metric');
    if(wellbeingMetric){
      wellbeingMetric.textContent=String(state.overview.wellbeing);
    }
    const alertsMetric=document.querySelector('[data-card="alerts"] .metric');
    if(alertsMetric){
      alertsMetric.textContent=String(state.overview.alertsResolved);
    }
    const intrList=document.querySelector('[data-list="interventions"] ul');
    if(intrList){
      intrList.innerHTML='';
      state.overview.interventions.forEach(item=>intrList.appendChild(createEl('li',{text:item})));
    }
    const alertsList=document.querySelector('[data-list="recent-alerts"] ul');
    if(alertsList){
      alertsList.innerHTML='';
      state.overview.recentAlerts.forEach(alert=>{
        const cls=alert.level==='critical'?'badge--critical':alert.level==='warning'?'badge--warning':'badge--info';
        const label=i18n.t(`alertLevels.${alert.level}`);
        const li=createEl('li');
        li.appendChild(createEl('span',{className:'badge '+cls,text:label}));
        li.appendChild(document.createTextNode(alert.text));
        alertsList.appendChild(li);
      });
    }
  }
