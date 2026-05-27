import { state } from '../store.js';

export function renderHistory(root) {
  if (state.logs.length === 0) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="empty">服用履歴はまだありません</div>`;
    root.appendChild(card);
    return;
  }

  // Build 7-day summary
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}` });
  }
  const counts = Object.fromEntries(days.map(d => [d.key, 0]));
  for (const l of state.logs) {
    if (counts[l.date] !== undefined) counts[l.date]++;
  }
  const max = Math.max(1, ...Object.values(counts));

  const chart = document.createElement('div');
  chart.className = 'card';
  chart.innerHTML = `
    <div style="font-weight:600; margin-bottom: 12px;">直近7日間</div>
    <div style="display:flex; gap:8px; align-items:flex-end; height:120px;">
      ${days.map(d => `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%;">
          <div style="flex:1; width:100%; display:flex; align-items:flex-end;">
            <div style="width:100%; background: var(--primary); border-radius: 6px 6px 0 0;
                 height: ${(counts[d.key] / max) * 100}%; min-height: 4px;
                 transition: height .3s;"></div>
          </div>
          <div style="font-size:11px; color: var(--text-muted);">${d.label}</div>
          <div style="font-size:12px; font-weight:600;">${counts[d.key]}</div>
        </div>
      `).join('')}
    </div>
  `;
  root.appendChild(chart);

  // Recent log list (latest 30)
  const recent = [...state.logs].sort((a, b) => b.takenAt - a.takenAt).slice(0, 30);
  const list = document.createElement('div');
  list.className = 'card';
  list.innerHTML = `<div style="font-weight:600; margin-bottom: 8px;">最新の記録</div>`;
  for (const log of recent) {
    const med = state.medications.find(m => m.id === log.medId);
    const row = document.createElement('div');
    row.className = 'dose-row';
    const dt = new Date(log.takenAt);
    row.innerHTML = `
      <div class="dose-time">${log.time}</div>
      <div class="dose-name">
        <div style="font-weight:600;">${escape(med?.name || '(削除済)')}</div>
        <div class="muted">${log.date} ${pad(dt.getHours())}:${pad(dt.getMinutes())} 服用記録</div>
      </div>
      <span class="dose-status done">済</span>
    `;
    list.appendChild(row);
  }
  root.appendChild(list);
}

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
