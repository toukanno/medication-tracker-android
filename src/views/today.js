import { state, isTaken, markTaken, unmarkTaken, todayStr } from '../store.js';

export function renderToday(root, { rerender }) {
  if (state.medications.length === 0) {
    const card = el('div', 'card');
    card.innerHTML = `
      <div class="empty">
        <div style="font-size: 32px; margin-bottom: 8px;">💊</div>
        登録されている薬がありません<br/>
        下のタブから「薬」を開いて追加してください
      </div>
    `;
    root.appendChild(card);
    return;
  }

  const schedule = buildSchedule();
  const date = todayStr();
  const taken = schedule.filter(s => isTaken(s.med.id, s.time, date)).length;

  const progress = el('div', 'card');
  progress.innerHTML = `
    <div class="row">
      <div class="grow">
        <div style="font-size:13px; color: var(--text-muted);">本日の進捗</div>
        <div style="font-size:20px; font-weight:700;">${taken} / ${schedule.length} 回</div>
      </div>
      <div style="width:64px; height:64px; border-radius:50%;
           background: conic-gradient(var(--primary) ${pct(taken, schedule.length)}%, var(--surface-2) 0);
           display:flex; align-items:center; justify-content:center;">
        <div style="width:48px; height:48px; border-radius:50%; background: var(--surface);
             display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">
          ${Math.round(pct(taken, schedule.length))}%
        </div>
      </div>
    </div>
  `;
  root.appendChild(progress);

  const list = el('div', 'card');
  if (schedule.length === 0) {
    list.innerHTML = `<div class="empty">今日の服薬予定はありません</div>`;
  } else {
    for (const item of schedule) {
      const done = isTaken(item.med.id, item.time, date);
      const row = el('div', 'dose-row');
      row.innerHTML = `
        <div class="dose-time">${item.time}</div>
        <div class="dose-name">
          <div style="font-weight:600;">${escape(item.med.name)}</div>
          <div class="muted">${escape(item.med.dose || '')}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="dose-status ${done ? 'done' : ''}">${done ? '服用済' : '未'}</span>
          <button class="btn ${done ? '' : 'primary'}">${done ? '取消' : '服用'}</button>
        </div>
      `;
      const btn = row.querySelector('button');
      btn.addEventListener('click', () => {
        if (done) unmarkTaken(item.med.id, item.time, date);
        else markTaken(item.med.id, item.time, date);
        rerender();
      });
      list.appendChild(row);
    }
  }
  root.appendChild(list);
}

function buildSchedule() {
  const items = [];
  for (const m of state.medications) {
    for (const t of (m.times || [])) {
      items.push({ med: m, time: t });
    }
  }
  items.sort((a, b) => a.time.localeCompare(b.time));
  return items;
}

function pct(n, d) { return d === 0 ? 0 : (n / d) * 100; }
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
