import { state, addMedication, updateMedication, deleteMedication } from '../store.js';

export function renderMedications(root, { rerender }) {
  if (state.medications.length === 0) {
    const card = el('div', 'card');
    card.innerHTML = `<div class="empty">登録されている薬はありません<br/>右下の + ボタンで追加できます</div>`;
    root.appendChild(card);
  } else {
    const list = el('div');
    for (const m of state.medications) {
      const card = el('div', 'card');
      card.innerHTML = `
        <div class="med">
          <div class="pill">💊</div>
          <div>
            <div class="name">${escape(m.name)}</div>
            <div class="dose">${escape(m.dose || '用量未設定')}</div>
            <div class="times-list" style="margin-top:6px;">
              ${(m.times || []).map(t => `<span class="time-chip">${t}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn" data-edit="${m.id}">編集</button>
            <button class="btn danger" data-del="${m.id}">削除</button>
          </div>
        </div>
      `;
      card.querySelector(`[data-edit="${m.id}"]`).addEventListener('click', () => {
        openEditor(root, m, rerender);
      });
      card.querySelector(`[data-del="${m.id}"]`).addEventListener('click', () => {
        if (confirm(`「${m.name}」を削除しますか？`)) {
          deleteMedication(m.id);
          rerender();
        }
      });
      list.appendChild(card);
    }
    root.appendChild(list);
  }

  const fab = el('button', 'fab');
  fab.textContent = '+';
  fab.setAttribute('aria-label', '薬を追加');
  fab.addEventListener('click', () => openEditor(root, null, rerender));
  root.appendChild(fab);
}

function openEditor(root, med, rerender) {
  const isEdit = !!med;
  const draft = {
    name: med?.name || '',
    dose: med?.dose || '',
    times: [...(med?.times || ['08:00'])],
    note: med?.note || '',
  };

  const backdrop = el('div', 'modal-backdrop');
  const modal = el('div', 'modal');
  modal.innerHTML = `
    <h3>${isEdit ? '薬を編集' : '薬を追加'}</h3>
    <div class="field">
      <label>名前</label>
      <input id="f-name" type="text" placeholder="例: ロキソニン" />
    </div>
    <div class="field">
      <label>用量・服用方法</label>
      <input id="f-dose" type="text" placeholder="例: 1錠 食後" />
    </div>
    <div class="field">
      <label>服用時刻</label>
      <div class="times-list" id="f-times"></div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <input id="f-newtime" type="time" style="flex:0 1 160px;" />
        <button class="btn primary soft" id="f-add-time">時刻を追加</button>
      </div>
    </div>
    <div class="field">
      <label>メモ（任意）</label>
      <textarea id="f-note" rows="2"></textarea>
    </div>
    <div class="row" style="margin-top:16px;">
      <button class="btn ghost grow" id="f-cancel">キャンセル</button>
      <button class="btn primary grow" id="f-save">保存</button>
    </div>
  `;
  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  const $ = (s) => modal.querySelector(s);
  $('#f-name').value = draft.name;
  $('#f-dose').value = draft.dose;
  $('#f-note').value = draft.note;

  function renderTimes() {
    const wrap = $('#f-times');
    wrap.innerHTML = '';
    draft.times.sort();
    draft.times.forEach((t, i) => {
      const chip = el('span', 'time-chip');
      chip.innerHTML = `${t}<button aria-label="削除">×</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        draft.times.splice(i, 1);
        renderTimes();
      });
      wrap.appendChild(chip);
    });
    if (draft.times.length === 0) {
      wrap.innerHTML = `<span class="muted">時刻が登録されていません</span>`;
    }
  }
  renderTimes();

  $('#f-add-time').addEventListener('click', () => {
    const v = $('#f-newtime').value;
    if (!v) return;
    if (!draft.times.includes(v)) draft.times.push(v);
    renderTimes();
  });

  $('#f-cancel').addEventListener('click', () => {
    backdrop.remove();
  });

  $('#f-save').addEventListener('click', () => {
    const name = $('#f-name').value.trim();
    if (!name) {
      alert('名前を入力してください');
      return;
    }
    if (draft.times.length === 0) {
      alert('服用時刻を1つ以上追加してください');
      return;
    }
    const payload = {
      name,
      dose: $('#f-dose').value.trim(),
      times: draft.times,
      note: $('#f-note').value.trim(),
    };
    if (isEdit) updateMedication(med.id, payload);
    else addMedication(payload);
    backdrop.remove();
    rerender();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
