;(function () {
  // 1) Navigation: active link & smooth scroll
  const navLinks = document.querySelectorAll('.nav-list a');
  const sections = document.querySelectorAll('section.panel');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('id');
        const link = document.querySelector(`.nav-list a[href="#${id}"]`);
        if (entry.isIntersecting) link?.classList.add('active');
        else link?.classList.remove('active');
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach(section => observer.observe(section));
  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 2) Theme toggle
  const themeToggle = document.querySelector('#theme-toggle');
  const themeLabel = themeToggle?.querySelector('.chip__label');
  const themeIcon = themeToggle?.querySelector('.chip__icon');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const storedTheme = localStorage.getItem('dashboard-theme');
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);
  themeToggle?.addEventListener('click', () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
  });
  function applyTheme(theme) {
    document.body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    themeLabel && (themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light');
    themeToggle?.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // 3) Inject minimal UI styles (modal + toast) without editing CSS file
  const style = document.createElement('style');
  style.textContent = `
    .icon-btn { border: 1px solid var(--color-border); background: var(--color-surface-strong); padding: 0.35rem 0.6rem; border-radius: 10px; cursor: pointer; margin-right: 0.25rem; }
    .icon-btn:hover { box-shadow: 0 10px 20px rgba(37,99,235,0.15); transform: translateY(-1px); }
    .modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 500; }
    .modal.is-open { display: flex; }
    .modal__backdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); }
    .modal__content { position: relative; width: min(720px, 92vw); background: var(--color-surface-strong); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1rem 1.25rem; }
    .modal__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 0.5rem; }
    .modal__actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.75rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0.5rem 0; }
    .form-block { display: block; margin-top: 0.5rem; }
    .form-row label, .form-block { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-row input, .form-row select, .form-block textarea { padding: 0.6rem 0.75rem; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface-strong); color: inherit; }
    .toast { position: fixed; bottom: 16px; left: 50%; transform: translate(-50%, 10px); background: var(--color-surface-strong); border: 1px solid var(--color-border); padding: 0.6rem 0.9rem; border-radius: 10px; opacity: 0; transition: opacity .2s, transform .2s; box-shadow: var(--shadow); z-index: 600; }
    .toast.is-shown { opacity: 1; transform: translate(-50%, 0); }
    @media (max-width: 720px){ .form-row { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);

  // 4) Data and state (mock residents + localStorage persistence)
  const DEFAULT_RESIDENTS = [
    { id: 'r1', name: 'Mrs. Chen', room: '204', lastCheckIn: '08:45', bp: '118/76', hr: 72, notes: 'Hydration reminder set', priority: 'medium' },
    { id: 'r2', name: 'Mr. Lee', room: '310', lastCheckIn: '07:55', bp: '130/82', hr: 80, notes: 'Awaiting PT session', priority: 'low' },
    { id: 'r3', name: 'Mrs. Singh', room: '118', lastCheckIn: '09:10', bp: '110/70', hr: 96, notes: 'Monitoring elevated HR', priority: 'high' },
    { id: 'r4', name: 'Ms. Lopez', room: '122', lastCheckIn: '08:20', bp: '116/74', hr: 68, notes: 'Awaiting OT follow-up', priority: 'medium' }
  ];
  function loadResidents() {
    try {
      const raw = localStorage.getItem('residents');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_RESIDENTS;
    } catch { return DEFAULT_RESIDENTS; }
  }
  function saveResidents(list) {
    localStorage.setItem('residents', JSON.stringify(list));
  }
  const state = { residents: loadResidents(), filter: '' };

  // 5) Residents: render table, search, add/edit/delete
  const residentTable = document.querySelector('.resident-table');
  const searchInput = document.querySelector('#resident-search');
  const emptyState = document.querySelector('[data-empty-state]');
  function clearResidentRows() {
    if (!residentTable) return;
    const rows = Array.from(residentTable.querySelectorAll('.table-row:not(.table-row--header)'));
    rows.forEach(r => r.remove());
  }
  function matchesFilter(resident, q) {
    if (!q) return true;
    const value = q.toLowerCase();
    return (
      resident.name.toLowerCase().includes(value) ||
      resident.room.toLowerCase().includes(value) ||
      resident.notes.toLowerCase().includes(value) ||
      String(resident.hr).includes(value) ||
      resident.bp.includes(value)
    );
  }
  function rowEl(resident) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.setAttribute('role', 'row');
    row.dataset.name = resident.name.toLowerCase();
    row.innerHTML = `
      <span role="cell">${resident.name}</span>
      <span role="cell">${resident.room}</span>
      <span role="cell">${resident.lastCheckIn}</span>
      <span role="cell">BP ${resident.bp} • HR ${resident.hr}</span>
      <span role="cell">
        <span>${resident.notes || ''}</span>
        <span style="display:inline-flex; gap:4px; margin-left:.5rem;">
          <button class="icon-btn" type="button" title="Edit" aria-label="Edit" data-edit="${resident.id}">✏️</button>
          <button class="icon-btn" type="button" title="Delete" aria-label="Delete" data-delete="${resident.id}">🗑️</button>
        </span>
      </span>
    `;
    return row;
  }
  function renderResidents() {
    if (!residentTable) return;
    clearResidentRows();
    const header = residentTable.querySelector('.table-row--header');
    const anchor = header?.nextSibling;
    let visible = 0;
    state.residents.forEach(resident => {
      if (matchesFilter(resident, state.filter)) {
        residentTable.insertBefore(rowEl(resident), anchor);
        visible++;
      }
    });
    if (emptyState) emptyState.hidden = visible !== 0;
    updateCountsAndCards();
  }
  searchInput?.addEventListener('input', e => { state.filter = e.target.value.trim(); renderResidents(); });

  // 6) Modal (created dynamically)
  function ensureResidentModal() {
    let modal = document.getElementById('resident-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'resident-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal__backdrop" data-close-modal></div>
      <div class="modal__content" role="document">
        <header class="modal__header">
          <h2 id="resident-modal-title">Resident</h2>
          <button class="icon-btn" type="button" title="Close" aria-label="Close" data-close-modal>✖</button>
        </header>
        <form id="resident-form">
          <input type="hidden" name="id" />
          <div class="form-row">
            <label>
              <span>Name</span>
              <input name="name" type="text" required placeholder="e.g., Mrs. Chen" />
            </label>
            <label>
              <span>Room</span>
              <input name="room" type="text" required placeholder="e.g., 204" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Last Check-In (HH:MM)</span>
              <input name="lastCheckIn" type="text" required placeholder="e.g., 08:45" pattern="^\\d{2}:\\d{2}$" />
            </label>
            <label>
              <span>Priority</span>
              <select name="priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>BP (Systolic/Diastolic)</span>
              <input name="bp" type="text" required placeholder="e.g., 118/76" pattern="^\\d{2,3}\\/\\d{2,3}$" />
            </label>
            <label>
              <span>HR</span>
              <input name="hr" type="number" min="30" max="220" required placeholder="e.g., 72" />
            </label>
          </div>
          <label class="form-block">
            <span>Notes</span>
            <textarea name="notes" rows="3" placeholder="Optional notes"></textarea>
          </label>
          <div class="modal__actions">
            <button type="button" class="chip" data-close-modal>Cancel</button>
            <button type="submit" class="primary">Save</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function openModal(resident) {
    const modal = ensureResidentModal();
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    const form = modal.querySelector('#resident-form');
    form.reset();
    if (resident) {
      form.elements.id.value = resident.id;
      form.elements.name.value = resident.name;
      form.elements.room.value = resident.room;
      form.elements.lastCheckIn.value = resident.lastCheckIn;
      form.elements.priority.value = resident.priority;
      form.elements.bp.value = resident.bp;
      form.elements.hr.value = resident.hr;
      form.elements.notes.value = resident.notes || '';
    } else {
      form.elements.id.value = '';
    }
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal, { once: true }));
    form.addEventListener('submit', onSaveResident, { once: true });
  }
  function closeModal() {
    const modal = document.getElementById('resident-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
  }
  function onSaveResident(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      id: data.id || `r${Date.now()}`,
      name: String(data.name).trim(),
      room: String(data.room).trim(),
      lastCheckIn: String(data.lastCheckIn).trim(),
      priority: String(data.priority || 'low'),
      bp: String(data.bp).trim(),
      hr: Number(data.hr),
      notes: String(data.notes || '').trim()
    };
    const idx = state.residents.findIndex(r => r.id === payload.id);
    if (idx >= 0) state.residents[idx] = payload; else state.residents.unshift(payload);
    saveResidents(state.residents);
    renderResidents();
    closeModal();
  }

  // 7) Table actions
  residentTable?.addEventListener('click', e => {
    const target = e.target.closest('button');
    if (!target) return;
    const editId = target.getAttribute('data-edit');
    const deleteId = target.getAttribute('data-delete');
    if (editId) {
      const res = state.residents.find(r => r.id === editId);
      openModal(res);
    } else if (deleteId) {
      if (confirm('Delete this resident?')) {
        state.residents = state.residents.filter(r => r.id !== deleteId);
        saveResidents(state.residents);
        renderResidents();
      }
    }
  });
  // Add resident button (last button in the header actions of Residents panel)
  document.querySelector('#residents .panel-actions button:last-of-type')?.addEventListener('click', () => openModal(null));

  // 8) Metrics/cards update based on data
  function updateCountsAndCards() {
    // Subtitle count
    const subtitle = document.querySelector('#overview .panel-subtitle');
    const lastSyncEl = document.querySelector('[data-last-sync]');
    if (subtitle) {
      subtitle.innerHTML = `Synced <span data-last-sync>${lastSyncEl?.textContent || 'just now'}</span> • <span data-resident-count>${state.residents.length}</span> residents connected`;
    }
    // High priority card
    const highCardHeader = Array.from(document.querySelectorAll('.card__header h2')).find(h => h.textContent?.trim() === 'High Priority Cases');
    if (highCardHeader) {
      const card = highCardHeader.closest('.card');
      const metricEl = card.querySelector('.metric');
      const listEl = card.querySelector('ul');
      const highs = state.residents.filter(r => r.priority === 'high').slice(0, 3);
      metricEl && (metricEl.textContent = String(highs.length));
      if (listEl) {
        listEl.innerHTML = highs.length ? highs.map(r => `<li>⚠️ ${r.name} · ${r.notes || 'Requires attention'}</li>`).join('') : '<li>No high priority residents</li>';
      }
    }
  }

  // 9) Overview actions: refresh + report
  const refreshButton = document.querySelector('[data-refresh]');
  const lastSync = document.querySelector('[data-last-sync]');
  function updateLastSync() {
    if (!lastSync) return;
    const timestamp = new Date();
    lastSync.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function animateRefresh() { refreshButton?.classList.add('is-refreshing'); setTimeout(() => refreshButton?.classList.remove('is-refreshing'), 600); }
  refreshButton?.addEventListener('click', () => { animateRefresh(); updateLastSync(); updateCountsAndCards(); });
  updateLastSync();

  const reportBtn = document.querySelector('#overview .panel-actions .primary');
  reportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), residents: state.residents }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'smartcare-report.json'; a.click(); URL.revokeObjectURL(url);
  });

  // 10) Operations + Family stubs
  document.querySelector('#operations .panel-actions button:first-of-type')?.addEventListener('click', () => {
    const csv = 'time,activity\n10:00,Morning stretching\n13:00,Family video calls\n16:30,Memory care workshop\n18:00,Calm music session\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'schedule.csv'; a.click(); URL.revokeObjectURL(url);
  });
  document.querySelector('#operations .panel-actions button:last-of-type')?.addEventListener('click', () => toast('Staffing adjustment UI coming soon.'));
  document.querySelector('#family .primary')?.addEventListener('click', () => toast('Message composer coming soon.'));
  document.querySelector('#family .chip--primary')?.addEventListener('click', async () => {
    const link = location.origin + location.pathname + '#family';
    try { await navigator.clipboard.writeText(link); toast('Link copied to clipboard'); }
    catch { toast('Link: ' + link); }
  });

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = message; document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-shown'));
    setTimeout(() => { el.classList.remove('is-shown'); setTimeout(() => el.remove(), 180); }, 2200);
  }

  // 11) Initial render
  renderResidents();
})();
