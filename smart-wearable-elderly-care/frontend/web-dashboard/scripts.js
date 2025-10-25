;(function(){
  // storage helpers
  const store={get(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};

  // minimal styles for modals and toasts
  const st=document.createElement('style');
  st.textContent='\
.icon-btn{border:1px solid var(--color-border);background:var(--color-surface-strong);padding:.32rem .6rem;border-radius:10px;cursor:pointer;margin-left:.25rem}\
.icon-btn:hover{box-shadow:0 10px 20px rgba(37,99,235,.15);transform:translateY(-1px)}\
.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:500}\
.modal.is-open{display:flex}\
.modal__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.5)}\
.modal__content{position:relative;width:min(760px,94vw);background:var(--color-surface-strong);border:1px solid var(--color-border);border-radius:16px;box-shadow:var(--shadow);padding:1rem 1.25rem}\
.modal__header{display:flex;align-items:center;justify-content:space-between;padding-bottom:.5rem}\
.modal__actions{display:flex;justify-content:flex-end;gap:.75rem;margin-top:.75rem}\
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:.5rem 0}\
.form-row input,.form-row select,.form-block textarea{padding:.6rem .75rem;border:1px solid var(--color-border);border-radius:10px;background:var(--color-surface-strong);color:inherit}\
.form-block{display:block;margin-top:.5rem}\
.toast{position:fixed;bottom:16px;left:50%;transform:translate(-50%,10px);background:var(--color-surface-strong);border:1px solid var(--color-border);padding:.6rem .9rem;border-radius:10px;opacity:0;transition:opacity .2s,transform .2s;box-shadow:var(--shadow);z-index:600}\
.toast.is-shown{opacity:1;transform:translate(-50%,0)}\
.lang-select{border-radius:999px;padding:.35rem .85rem;margin-right:.75rem} \
@media(max-width:760px){.form-row{grid-template-columns:1fr}}';
  document.head.appendChild(st);

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

  // language selector and minimal i18n
  const I18N={
    en:{
      navCare:'Care Overview',navRes:'Residents',navOps:'Operations',navFam:'Family Engagement',
      heroTitle:'Daily Care Overview',resTitle:'Resident Directory',resSub:'Monitor vitals and notes in real time.',
      opsTitle:'Facility Operations',opsSub:'Stay ahead of staffing and scheduled care.',
      famTitle:'Family Engagement',famSub:'Keep families informed and involved.',
      filterAll:'All residents',filterHigh:'High priority',filterFollow:'Requires follow-up',filterStable:'Stable',
      colResident:'Resident',colRoom:'Room',colLast:'Last Check-In',colVitals:'Vitals',colNotes:'Notes',
      addRes:'Add Resident',refresh:'Refresh Data',genReport:'Generate Report',editOverview:'Edit Overview',
      downloadSchedule:'Download Schedule',adjStaff:'Adjust Staffing',newMsg:'New Message',share:'Share access link',
      signIn:'Sign In',signOut:'Sign Out'
    },
    'zh-Hant':{
      navCare:'\u7167\u8b77\u7e3d\u89bd',navRes:'\u4f4f\u6c11',navOps:'\u71df\u904b',navFam:'\u5bb6\u5c6c\u4ea4\u6d41',
      heroTitle:'\u6bcf\u65e5\u7167\u8b77\u7e3d\u89bd',resTitle:'\u4f4f\u6c11\u76ee\u9304',resSub:'\u5373\u6642\u76e3\u63a7\u751f\u547d\u5fb5\u8c61\u8207\u5099\u8a3b\u3002',
      opsTitle:'\u6a5f\u69cb\u71df\u904b',opsSub:'\u638c\u63e1\u4eba\u529b\u8207\u6392\u7a0b\u3002',
      famTitle:'\u5bb6\u5c6c\u4ea4\u6d41',famSub:'\u8b93\u5bb6\u5c6c\u96a8\u6642\u638c\u63e1\u8fd1\u6cc1\u3002',
      filterAll:'\u6240\u6709\u4f4f\u6c11',filterHigh:'\u9ad8\u512a\u5148',filterFollow:'\u9700\u5f8c\u7e8c\u8ffd\u8e64',filterStable:'\u7a69\u5b9a',
      colResident:'\u4f4f\u6c11',colRoom:'\u623f\u865f',colLast:'\u6700\u5f8c\u5de1\u623f',colVitals:'\u751f\u547d\u9ad4\u5fb5',colNotes:'\u5099\u8a3b',
      addRes:'\u65b0\u589e\u4f4f\u6c11',refresh:'\u66f4\u65b0\u8cc7\u6599',genReport:'\u532f\u51fa\u5831\u544a',editOverview:'\u7de8\u8f2f\u7e3d\u89bd',
      downloadSchedule:'\u4e0b\u8f09\u6392\u7a0b',adjStaff:'\u8abf\u6574\u4eba\u529b',newMsg:'\u65b0\u8a0a\u606f',share:'\u5206\u4eab\u5b58\u53d6\u9023\u7d50',
      signIn:'\u767b\u5165',signOut:'\u767b\u51fa'
    },
    'zh-Hans':{
      navCare:'\u62a4\u7406\u603b\u89c8',navRes:'\u4f4f\u6c11',navOps:'\u673a\u6784\u8fd0\u8425',navFam:'\u5bb6\u5c5e\u6c9f\u901a',
      heroTitle:'\u6bcf\u65e5\u62a4\u7406\u603b\u89c8',resTitle:'\u4f4f\u6c11\u76ee\u5f55',resSub:'\u5b9e\u65f6\u76d1\u63a7\u751f\u547d\u4f53\u5f81\u4e0e\u5907\u6ce8\u3002',
      opsTitle:'\u673a\u6784\u8fd0\u8425',opsSub:'\u638c\u63e1\u4eba\u529b\u4e0e\u6392\u7a0b\u3002',
      famTitle:'\u5bb6\u5c5e\u6c9f\u901a',famSub:'\u8ba9\u5bb6\u5c5e\u968f\u65f6\u638c\u63e1\u8fd1\u51b5\u3002',
      filterAll:'\u6240\u6709\u4f4f\u6c11',filterHigh:'\u9ad8\u4f18\u5148',filterFollow:'\u9700\u8ddf\u8fdb',filterStable:'\u7a33\u5b9a',
      colResident:'\u4f4f\u6c11',colRoom:'\u623f\u865f',colLast:'\u6700\u540e\u5de1\u623f',colVitals:'\u751f\u547d\u4f53\u5f81',colNotes:'\u5907\u6ce8',
      addRes:'\u65b0\u589e\u4f4f\u6c11',refresh:'\u66f4\u65b0\u6570\u636e',genReport:'\u5bfc\u51fa\u62a5\u544a',editOverview:'\u7f16\u8f91\u603b\u89c8',
      downloadSchedule:'\u4e0b\u8f7d\u6392\u7a0b',adjStaff:'\u8c03\u6574\u4eba\u529b',newMsg:'\u65b0\u6d88\u606f',share:'\u5206\u4eab\u8bbf\u95ee\u94fe\u63a5',
      signIn:'\u767b\u5f55',signOut:'\u767b\u51fa'
    }
  };

  function ensureLang(){
    const actions=document.querySelector('.top-bar__actions');
    if(!actions || document.getElementById('lang-select')) return;
    const sel=document.createElement('select');
    sel.id='lang-select';
    sel.className='chip chip--quiet lang-select';
    sel.innerHTML='<option value="en">EN</option><option value="zh-Hant">繁</option><option value="zh-Hans">简</option>';
    sel.value=store.get('lang','en');
    actions.insertBefore(sel, actions.firstChild);
    sel.addEventListener('change',()=>{store.set('lang',sel.value);applyI18n();});
  }

  function T(){
    return I18N[store.get('lang','en')]||I18N.en;
  }

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
    const L=T();
    document.documentElement.lang=store.get('lang','en');
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
    updateAuthUI();
  }

  ensureLang();


  // accounts and session
  const DEFAULT_ACCOUNTS=[{username:'Admin',password:'admin',role:'admin'},{username:'Ms.Testing',password:'admin',role:'caregiver'}];
  const accounts=store.get('accounts',DEFAULT_ACCOUNTS);
  function saveAccounts(){store.set('accounts',accounts)}
  let session=store.get('session',null);
  function isLoggedIn(){return !!session}
  function isAdmin(){return session?.role==='admin'}
  function signIn(u,p){const user=accounts.find(a=>a.username===u&&a.password===p);if(!user)return false;session={username:user.username,role:user.role};store.set('session',session);updateAuthUI();toast('Signed in');return true}
  function signOut(){session=null;store.set('session',null);updateAuthUI();toast('Signed out')}
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
      if(label) label.textContent='Guest';
      btn.textContent=lang.signIn;
      btn.onclick=()=>openAuthModal('signin');
      staffingBtn?.setAttribute('disabled','disabled');
    }
  }

  // overview
  const refreshBtn=document.querySelector('[data-refresh]');
  function updateLastSync(){const el=document.querySelector('[data-last-sync]');if(!el)return;const d=new Date();el.textContent=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
  function updateOverviewSubtitle(){const sub=document.querySelector('#overview .panel-subtitle');if(sub){sub.innerHTML='Synced <span data-last-sync></span> &bull; <span data-resident-count>'+state.residents.length+'</span> residents connected';updateLastSync()}}
  refreshBtn?.addEventListener('click',()=>{refreshBtn.classList.add('is-refreshing');setTimeout(()=>refreshBtn.classList.remove('is-refreshing'),600);updateLastSync()});

  // residents
  const DEFAULT_RESIDENTS=[
    {id:'r1',name:'Mrs. Chen',room:'204',lastCheckIn:'08:45',bp:'118/76',hr:72,notes:'Hydration reminder set',priority:'medium'},
    {id:'r2',name:'Mr. Lee',room:'310',lastCheckIn:'07:55',bp:'130/82',hr:80,notes:'Awaiting PT session',priority:'low'},
    {id:'r3',name:'Mrs. Singh',room:'118',lastCheckIn:'09:10',bp:'110/70',hr:96,notes:'Monitoring elevated HR',priority:'high'},
    {id:'r4',name:'Ms. Lopez',room:'122',lastCheckIn:'08:20',bp:'116/74',hr:68,notes:'Awaiting OT follow-up',priority:'medium'}
  ];
  const state={residents:store.get('residents',DEFAULT_RESIDENTS),filterText:'',quickFilter:'all'};
  const table=document.querySelector('.resident-table');
  const search=document.querySelector('#resident-search');
  const empty=document.querySelector('[data-empty-state]');
  function matchesQuick(r){switch(state.quickFilter){case'high':return r.priority==='high';case'follow':return /follow|monitor|await/i.test(r.notes)||r.priority==='high';case'stable':return r.priority==='low'&&!/follow|monitor|await/i.test(r.notes);default:return true}}
  function matchesText(r,q){if(!q)return true;const v=q.toLowerCase();return r.name.toLowerCase().includes(v)||r.room.toLowerCase().includes(v)||r.notes.toLowerCase().includes(v)||r.bp.includes(v)||String(r.hr).includes(v)}
  function rowEl(r){const d=document.createElement('div');d.className='table-row';d.setAttribute('role','row');d.dataset.name=r.name.toLowerCase();d.innerHTML=''
      +'<span role="cell">'+r.name+'</span>'
      +'<span role="cell">'+r.room+'</span>'
      +'<span role="cell">'+r.lastCheckIn+'</span>'
      +'<span role="cell">BP '+r.bp+' | HR '+r.hr+'</span>'
      +'<span role="cell"><span>'+(r.notes||'')+'</span>'
        +'<span style="display:inline-flex;gap:4px;margin-left:.5rem;">'
          +'<button class="icon-btn" type="button" data-edit="'+r.id+'" title="Edit">Edit</button>'
          +'<button class="icon-btn" type="button" data-delete="'+r.id+'" title="Delete">Del</button>'
        +'</span>'
      +'</span>';
    return d}
  function renderResidents(){if(!table)return;Array.from(table.querySelectorAll('.table-row:not(.table-row--header)')).forEach(n=>n.remove());const header=table.querySelector('.table-row--header');const anchor=header?.nextSibling;let visible=0;state.residents.forEach(r=>{if(matchesQuick(r)&&matchesText(r,state.filterText)){table.insertBefore(rowEl(r),anchor);visible++}});if(empty)empty.hidden=visible!==0;updateOverviewSubtitle()}
  search?.addEventListener('input',e=>{state.filterText=e.target.value.trim();renderResidents()});
  (function quickChips(){const chips=document.querySelectorAll('#overview .chip-row .chip');if(!chips.length)return;chips[0].dataset.filter='all';chips[1].dataset.filter='high';chips[2].dataset.filter='follow';chips[3].dataset.filter='stable';chips.forEach((c,i)=>{if(i===0)c.setAttribute('aria-pressed','true');c.addEventListener('click',()=>{chips.forEach(x=>x.setAttribute('aria-pressed','false'));c.setAttribute('aria-pressed','true');state.quickFilter=c.dataset.filter||'all';renderResidents()})})})();
  document.querySelector('#residents .panel-actions button:last-of-type')?.addEventListener('click',()=>{if(!isLoggedIn())return openAuthModal('signin');openResidentModal()});
  table?.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const eid=b.getAttribute('data-edit');const did=b.getAttribute('data-delete');if(eid){if(!isLoggedIn())return openAuthModal('signin');const rr=state.residents.find(x=>x.id===eid);openResidentModal(rr)}else if(did){if(!isLoggedIn())return openAuthModal('signin');if(confirm('Delete this resident?')){state.residents=state.residents.filter(x=>x.id!==did);store.set('residents',state.residents);renderResidents()}}});
  function openResidentModal(res){const m=ensureModal('resident-modal','Resident');const body=m.querySelector('.modal__body');body.innerHTML=''
    +'<form id="resident-form">'
      +'<input type="hidden" name="id" />'
      +'<div class="form-row">'
        +'<label><span>Name</span><input name="name" required placeholder="Mrs. Chen"/></label>'
        +'<label><span>Room</span><input name="room" required placeholder="204"/></label>'
      +'</div>'
      +'<div class="form-row">'
        +'<label><span>Last Check-In (HH:MM)</span><input name="lastCheckIn" required pattern="^\\d{2}:\\d{2}$" placeholder="08:45"/></label>'
        +'<label><span>Priority</span><select name="priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>'
      +'</div>'
      +'<div class="form-row">'
        +'<label><span>BP (Systolic/Diastolic)</span><input name="bp" required pattern="^\\d{2,3}\\/\\d{2,3}$" placeholder="118/76"/></label>'
        +'<label><span>HR</span><input name="hr" type="number" min="30" max="220" required placeholder="72"/></label>'
      +'</div>'
      +'<label class="form-block"><span>Notes</span><textarea name="notes" rows="3" placeholder="Optional notes"></textarea></label>'
      +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button type="submit" class="primary">Save</button></div>'
    +'</form>';
    const f=body.querySelector('#resident-form');
    if(res){f.elements.id.value=res.id;f.elements.name.value=res.name;f.elements.room.value=res.room;f.elements.lastCheckIn.value=res.lastCheckIn;f.elements.priority.value=res.priority;f.elements.bp.value=res.bp;f.elements.hr.value=res.hr;f.elements.notes.value=res.notes||''}
    f.addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(f).entries());const p={id:d.id||'r'+Date.now(),name:String(d.name).trim(),room:String(d.room).trim(),lastCheckIn:String(d.lastCheckIn).trim(),priority:String(d.priority||'low'),bp:String(d.bp).trim(),hr:Number(d.hr),notes:String(d.notes||'').trim()};const i=state.residents.findIndex(x=>x.id===p.id);if(i>=0)state.residents[i]=p;else state.residents.unshift(p);store.set('residents',state.residents);closeModal(m);renderResidents()},{once:true});
    openModal(m)
  }

  // operations: adjust staffing (admin only)
  const opsBtn=document.querySelector('#operations .panel-actions button:last-of-type');
  opsBtn?.addEventListener('click',()=>{if(!isLoggedIn())return openAuthModal('signin');if(!isAdmin())return toast('Admin required');openStaffingModal()});
  let ops=store.get('ops',{bedsTotal:64,bedsOccupied:56,admissions:3,discharges:1,avgStay:142});
  function openStaffingModal(){const m=ensureModal('staffing-modal',T().adjStaff);const body=m.querySelector('.modal__body');body.innerHTML=''
    +'<form id="staffing-form">'
      +'<div class="form-row">'
        +'<label><span>Occupied Beds</span><input name="occupied" type="number" min="0" max="999" value="'+ops.bedsOccupied+'"/></label>'
        +'<label><span>Total Beds</span><input name="total" type="number" min="1" max="999" value="'+ops.bedsTotal+'"/></label>'
      +'</div>'
      +'<div class="form-row">'
        +'<label><span>Admissions this week</span><input name="admissions" type="number" min="0" max="999" value="'+ops.admissions+'"/></label>'
        +'<label><span>Discharges scheduled</span><input name="discharges" type="number" min="0" max="999" value="'+ops.discharges+'"/></label>'
      +'</div>'
      +'<label class="form-block"><span>Average stay (days)</span><input name="avgStay" type="number" min="1" max="9999" value="'+ops.avgStay+'"/></label>'
      +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button type="submit" class="primary">Save</button></div>'
    +'</form>';
    const f=body.querySelector('#staffing-form');
    f.addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(f).entries());ops={bedsOccupied:Number(d.occupied),bedsTotal:Number(d.total),admissions:Number(d.admissions),discharges:Number(d.discharges),avgStay:Number(d.avgStay)};store.set('ops',ops);applyOps();closeModal(m);toast('Staffing saved')},{once:true});
    openModal(m)
  }
  function applyOps(){const card=Array.from(document.querySelectorAll('#operations .card--wide')).find(c=>c.querySelector('h3')?.textContent?.indexOf('Occupancy')>=0);if(!card)return;card.querySelector('.metric').textContent=ops.bedsOccupied+' / '+ops.bedsTotal+' beds occupied';const prog=card.querySelector('progress');if(prog){prog.max=ops.bedsTotal;prog.value=ops.bedsOccupied}const dds=card.querySelectorAll('.stat-list dd');if(dds[0])dds[0].textContent='+'+ops.admissions;if(dds[1])dds[1].textContent=String(ops.discharges);if(dds[2])dds[2].textContent=String(ops.avgStay)}

  // family: message composer
  document.querySelector('#family .primary')?.addEventListener('click',()=>{if(!isLoggedIn())return openAuthModal('signin');openMessageModal()});
  let messages=store.get('messages',[
    {author:'Alex Chen',text:'Thanks for the update on hydration goals.',date:'2024-04-02'},
    {author:'Priya Singh',text:'Can we schedule a call this evening?',date:'2024-04-02'},
    {author:'Daniel Lee',text:"Please confirm tomorrow's PT session.",date:'2024-04-01'}
  ]);
  function openMessageModal(){const m=ensureModal('message-modal',T().newMsg);const body=m.querySelector('.modal__body');body.innerHTML=''
    +'<form id="message-form">'
      +'<div class="form-row">'
        +'<label><span>To (name)</span><input name="author" required placeholder="Alex Chen"/></label>'
        +'<label><span>Date</span><input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"/></label>'
      +'</div>'
      +'<label class="form-block"><span>Message</span><textarea name="text" rows="4" required placeholder="Write a message..."></textarea></label>'
      +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button type="submit" class="primary">Send</button></div>'
    +'</form>';
    const f=body.querySelector('#message-form');
    f.addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(f).entries());messages.unshift({author:d.author,text:d.text,date:d.date});store.set('messages',messages);applyMessages();closeModal(m);toast('Message sent')},{once:true});
    openModal(m)
  }
  function applyMessages(){const ul=document.querySelector('#family .list--messages');if(!ul)return;function fmt(s){const d=new Date(s);const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return d.getDate()+' '+ms[d.getMonth()]}ul.innerHTML=messages.map(m=>'<li><span class="message-author">'+m.author+'</span><span class="message-preview">'+m.text+'</span><time datetime="'+m.date+'">'+fmt(m.date)+'</time></li>').join('')}
  // share link
  document.querySelector('#family .chip--primary')?.addEventListener('click',async()=>{const link=location.origin+location.pathname+'#family';try{await navigator.clipboard.writeText(link);toast('Link copied')}catch{toast('Link: '+link)}});

  // overview edit (admin)
  let ov=store.get('overview',{wellbeing:82,alertsResolved:14,interventions:[
    'Schedule hydration reminder for Room 204.',
    'Increase night check-ins for Mrs. Chen.',
    'Coordinate physiotherapy follow-up for Mr. Lee.',
    'Document family visit feedback for Ms. Lopez.'
  ],recentAlerts:[
    {level:'critical',text:'Fall detected in west wing corridor at 09:32.'},
    {level:'warning',text:'Elevated heart rate reported for Mrs. Singh.'},
    {level:'info',text:'Battery low for wearable ID #A52.'},
    {level:'info',text:'New firmware ready for OTA deployment.'}
  ]});
  function injectEditOverview(){const act=document.querySelector('#overview .panel-actions');if(!act||act.querySelector('[data-edit-overview]'))return;const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.editOverview='1';b.textContent=T().editOverview;act.appendChild(b);b.addEventListener('click',()=>{if(!isLoggedIn())return openAuthModal('signin');if(!isAdmin())return toast('Admin required');openOverviewModal()})}
  function openOverviewModal(){const m=ensureModal('overview-modal',T().editOverview);const body=m.querySelector('.modal__body');body.innerHTML=''
    +'<form id="overview-form">'
      +'<div class="form-row">'
        +'<label><span>Wellbeing Score</span><input name="wellbeing" type="number" min="0" max="999" value="'+ov.wellbeing+'"/></label>'
        +'<label><span>Alerts Resolved</span><input name="alerts" type="number" min="0" max="9999" value="'+ov.alertsResolved+'"/></label>'
      +'</div>'
      +'<label class="form-block"><span>Recommended Interventions (one per line)</span><textarea name="intr" rows="5">'+ov.interventions.join('\n')+'</textarea></label>'
      +'<label class="form-block"><span>Recent Alerts (level: message)</span><textarea name="ral" rows="5">'+ov.recentAlerts.map(a=>a.level+': '+a.text).join('\n')+'</textarea></label>'
      +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button type="submit" class="primary">Save</button></div>'
    +'</form>';
    const f=body.querySelector('#overview-form');
    f.addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(f).entries());ov.wellbeing=Number(d.wellbeing);ov.alertsResolved=Number(d.alerts);ov.interventions=String(d.intr).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);ov.recentAlerts=String(d.ral).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{const m=line.match(/^(critical|warning|info)\s*:\s*(.+)$/i);return m?{level:m[1].toLowerCase(),text:m[2]}:{level:'info',text:line}});store.set('overview',ov);applyOverview();closeModal(m);toast('Overview saved')},{once:true});
    openModal(m)
  }
  function applyOverview(){const well=document.querySelectorAll('.card__header h2');well.forEach(h=>{if(h.textContent.trim()==='Wellbeing Score'){h.closest('.card').querySelector('.metric').textContent=String(ov.wellbeing)}if(h.textContent.trim()==='Alerts Resolved'){h.closest('.card').querySelector('.metric').textContent=String(ov.alertsResolved)}});const intr=Array.from(document.querySelectorAll('.card h3')).find(h=>h.textContent.trim()==='Recommended Interventions');if(intr){intr.parentElement.querySelector('ul.list').innerHTML=ov.interventions.map(x=>'<li>'+x+'</li>').join('')}const ra=Array.from(document.querySelectorAll('.card h3')).find(h=>h.textContent.trim()==='Recent Alerts');if(ra){const ul=ra.parentElement.querySelector('ul.list--alerts');ul.innerHTML=ov.recentAlerts.map(a=>{const cls=a.level==='critical'?'badge--critical':a.level==='warning'?'badge--warning':'badge--info';const lbl=a.level==='critical'?'Critical':a.level==='warning'?'Warning':'Info';return '<li><span class="badge '+cls+'">'+lbl+'</span>'+a.text+'</li>'}).join('')}}

  // auth modal
  function openAuthModal(mode){const m=ensureModal('auth-modal','Authentication');const body=m.querySelector('.modal__body');function signInView(){body.innerHTML=''
      +'<form id="signin-form">'
        +'<div class="form-row">'
          +'<label><span>Username</span><input name="username" required placeholder="Admin"/></label>'
          +'<label><span>Password</span><input name="password" type="password" required placeholder="password"/></label>'
        +'</div>'
        +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button class="primary" type="submit">Sign In</button></div>'
        +'<p>Caregiver? <a href="#" data-goto-signup>Sign up</a></p>'
      +'</form>';body.querySelector('[data-goto-signup]').addEventListener('click',e=>{e.preventDefault();signUpView()});body.querySelector('#signin-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());if(signIn(d.username,d.password)){closeModal(m)}else toast('Invalid credentials')},{once:true})}
    function signUpView(){body.innerHTML=''
      +'<form id="signup-form">'
        +'<div class="form-row">'
          +'<label><span>Username</span><input name="username" required placeholder="Ms.Testing"/></label>'
          +'<label><span>Password</span><input name="password" type="password" required placeholder="admin"/></label>'
        +'</div>'
        +'<p>Role: Caregiver</p>'
        +'<div class="modal__actions"><button type="button" class="chip" data-close>Cancel</button><button class="primary" type="submit">Create</button></div>'
        +'<p>Have an account? <a href="#" data-goto-signin>Sign in</a></p>'
      +'</form>';body.querySelector('[data-goto-signin]').addEventListener('click',e=>{e.preventDefault();signInView()});body.querySelector('#signup-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());if(!/^[\w\.-]{2,}$/.test(d.username))return toast('Invalid username');if(signUpCaregiver(d.username,d.password)){toast('Account created');signInView()}else toast('Username exists')},{once:true})}
    if(mode==='signup')signUpView();else signInView();openModal(m)}

  // modal helpers
  function ensureModal(id,title){let m=document.getElementById(id);if(!m){m=document.createElement('div');m.id=id;m.className='modal';m.innerHTML=''
      +'<div class="modal__backdrop" data-close></div>'
      +'<div class="modal__content" role="dialog" aria-modal="true">'
        +'<header class="modal__header"><h2>'+title+'</h2>'
        +'<button class="icon-btn" type="button" data-close title="Close" aria-label="Close">x</button></header>'
        +'<div class="modal__body"></div>'
      +'</div>';
    document.body.appendChild(m)}else{m.querySelector('.modal__header h2').textContent=title}m.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(m));return m}
  function openModal(m){m.classList.add('is-open');m.setAttribute('aria-hidden','false')}
  function closeModal(m){m.classList.remove('is-open');m.setAttribute('aria-hidden','true')}
  function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('is-shown'));setTimeout(()=>{el.classList.remove('is-shown');setTimeout(()=>el.remove(),160)},2000)}

  // run
  updateAuthUI();
  applyOps();
  applyOverview();
  injectEditOverview();
  updateOverviewSubtitle();
  renderResidents();
  applyI18n();
  // report export
  document.querySelector('#overview .panel-actions .primary')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),residents:state.residents,overview:ov,ops:ops},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='smartcare-report.json'; a.click(); URL.revokeObjectURL(url);
  });
})();
