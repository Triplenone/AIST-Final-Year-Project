(async function () {
  const RESIDENT_TABLE_SELECTOR = '#resident-table tbody, table[data-residents] tbody, [data-role="residents"] tbody';
  let fallbackTimer = 0;
  let fallbackActive = false;
  function updateStatus(label) {
    // 將串流狀態回傳給主程式，方便在畫面顯示目前連線情形
    if (window.DashboardLiveBridge && typeof window.DashboardLiveBridge.updateConnectionState === 'function') {
      window.DashboardLiveBridge.updateConnectionState(label);
    }
  }
  updateStatus('等待連線');

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-sse.js', { scope: '/' });
    } catch (err) {
      console.warn('SW registration failed', err);
    }
  }

  function byQS(selector) {
    return document.querySelector(selector);
  }

  function ensurePanel() {
    let panel = byQS('#sse-panel');
    if (panel) {
      return panel;
    }
    panel = document.createElement('div');
    panel.id = 'sse-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'max-width:360px',
      'max-height:45vh',
      'overflow:auto',
      'background:rgba(20,34,24,0.92)',
      'border:1px solid rgba(118,184,82,0.45)',
      'border-radius:8px',
      'padding:8px 10px',
      'font:12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      'color:#eaf7e4',
      'backdrop-filter:blur(6px)',
      'z-index:2147483647',
      'box-shadow:0 6px 20px rgba(13,24,16,0.4)',
    ].join(';');
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Live Feed</div><div id="sse-log"></div>';
    document.body.appendChild(panel);
    return panel;
  }

  function log(line) {
    const panel = ensurePanel();
    const logDiv = panel.querySelector('#sse-log');
    if (!logDiv) {
      return;
    }
    const entry = document.createElement('div');
    const now = new Date();
    entry.textContent = `[${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${line}`;
    logDiv.prepend(entry);
    while (logDiv.children.length > 10) {
      logDiv.lastElementChild.remove();
    }
  }

  function formatVitals(vitals) {
    return `HR ${vitals.hr} • BP ${vitals.bp.sys}/${vitals.bp.dia} • SpO₂ ${vitals.spo2}% • Temp ${vitals.temp}°C`;
  }

  function upsertRow(resident, vitals) {
    if (window.DashboardLiveBridge) {
      return;
    }
    const table = byQS(RESIDENT_TABLE_SELECTOR);
    const id = resident ? resident.id : vitals && vitals.id;

    if (!table || !id) {
      if (resident) {
        log(`👤 ${resident.name} • check-in (Room ${resident.room})`);
      } else if (vitals) {
        log(`📊 ${vitals.id} • ${formatVitals(vitals)}`);
      }
      return;
    }

    let row = table.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
      row = document.createElement('tr');
      row.dataset.id = id;
      row.innerHTML = [
        '<td class="id"></td>',
        '<td class="name"></td>',
        '<td class="room"></td>',
        '<td class="hr"></td>',
        '<td class="bp"></td>',
        '<td class="spo2"></td>',
        '<td class="temp"></td>',
      ].join('');
      table.prepend(row);
    }

    if (resident) {
      const idCell = row.querySelector('.id');
      const nameCell = row.querySelector('.name');
      const roomCell = row.querySelector('.room');
      if (idCell) idCell.textContent = resident.id;
      if (nameCell) nameCell.textContent = resident.name;
      if (roomCell) roomCell.textContent = resident.room;
    }

    if (vitals) {
      const hrCell = row.querySelector('.hr');
      const bpCell = row.querySelector('.bp');
      const spo2Cell = row.querySelector('.spo2');
      const tempCell = row.querySelector('.temp');
      if (hrCell) hrCell.textContent = String(vitals.hr);
      if (bpCell) bpCell.textContent = `${vitals.bp.sys}/${vitals.bp.dia}`;
      if (spo2Cell) spo2Cell.textContent = String(vitals.spo2);
      if (tempCell) tempCell.textContent = `${vitals.temp}`;
    }
  }

  function removeRow(id) {
    if (window.DashboardLiveBridge) {
      return;
    }
    const table = byQS(RESIDENT_TABLE_SELECTOR);
    if (!table) {
      log(`↘ checkout ${id}`);
      return;
    }
    const row = table.querySelector(`tr[data-id="${id}"]`);
    if (row) {
      row.remove();
    }
  }

  function handleEvent(type, payload) {
    const bridge = window.DashboardLiveBridge;
    if (type === 'new_resident') {
      bridge?.handleNewResident(payload);
      upsertRow(payload, null);
      log(`👤 ${payload.name} 已入住 ${payload.room}`);
      return;
    }
    if (type === 'vitals') {
      bridge?.handleVitals(payload);
      upsertRow(null, payload);
      log(`📊 ${payload.id} 更新：${formatVitals(payload)}`);
      return;
    }
    if (type === 'checkout') {
      bridge?.handleCheckout(payload);
      removeRow(payload.id);
      log(`↘ ${payload.id} 已退房`);
    }
  }

  function processBatch(events) {
    if (!Array.isArray(events)) {
      return;
    }
    for (const evt of events) {
      if (evt && evt.type && evt.payload) {
        handleEvent(evt.type, evt.payload);
      }
    }
  }

  function startPollingFallback() {
    if (fallbackActive) {
      return;
    }
    fallbackActive = true;
    log('ℹ️ Switching to polling fallback');
    updateStatus('輪詢模式啟動');

    const poll = async () => {
      try {
        const response = await fetch('/api/vitals-feed', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          processBatch(data);
          updateStatus('輪詢資料更新中');
        }
      } catch (err) {
        console.warn('SSE fallback poll failed', err);
      } finally {
        fallbackTimer = window.setTimeout(poll, 3000);
      }
    };

    poll();
  }

  function connect() {
    if (!('EventSource' in window)) {
      console.warn('EventSource unavailable; using fallback loop instead.');
      updateStatus('不支援 SSE，改用輪詢');
      startPollingFallback();
      return;
    }

    const es = new EventSource('/events');
    let opened = false;
    let fallbackStarted = false;

    function ensureFallback(reason) {
      if (fallbackStarted) {
        return;
      }
      fallbackStarted = true;
      console.warn('SSE fallback engaged:', reason);
      updateStatus('串流失敗，啟用輪詢模式');
      es.close();
      startPollingFallback();
    }

    es.addEventListener('open', () => {
      opened = true;
      log('⚡ Live stream connected');
      updateStatus('串流已連線');
    });

    es.addEventListener('new_resident', (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleEvent('new_resident', payload);
      } catch (err) {
        console.warn('Failed to parse new_resident event', err);
      }
    });

    es.addEventListener('vitals', (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleEvent('vitals', payload);
      } catch (err) {
        console.warn('Failed to parse vitals event', err);
      }
    });

    es.addEventListener('checkout', (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleEvent('checkout', payload);
      } catch (err) {
        console.warn('Failed to parse checkout event', err);
      }
    });

    es.onerror = () => {
      updateStatus('串流異常，等待自動重試');
      if (!opened) {
        ensureFallback('initial connection failed');
        return;
      }
      if (es.readyState === EventSource.CLOSED) {
        ensureFallback('stream closed');
      }
    };
  }

  connect();

  window.SSEMock = {
    checkInOne: () =>
      fetch('/api/residents/random', { method: 'POST' }).then((response) => response.json()),
    checkInMany: (count = 5) =>
      fetch('/api/residents/random-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      }).then((response) => response.json()),
    checkout: (id) =>
      fetch(`/api/residents/${id}/checkout`, { method: 'POST' }).then((response) =>
        response.json(),
      ),
    clearGenerated: () =>
      fetch('/api/residents/generated/clear', { method: 'POST' }).then((response) =>
        response.json(),
      ),
    startPollingFallback,
  };

  window.addEventListener('beforeunload', () => {
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
  });
})();
