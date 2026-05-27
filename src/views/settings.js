import { state, setTheme, clearAll, save } from '../store.js';
import { notificationsAvailable, setEnabled as setNotificationsEnabled } from '../notifications.js';

const THEMES = [
  { key: 'blue',   label: 'ブルー' },
  { key: 'green',  label: 'グリーン' },
  { key: 'pink',   label: 'ピンク' },
  { key: 'purple', label: 'パープル' },
  { key: 'orange', label: 'オレンジ' },
  { key: 'red',    label: 'レッド' },
  { key: 'teal',   label: 'ティール' },
  { key: 'indigo', label: 'インディゴ' },
  { key: 'amber',  label: 'アンバー' },
  { key: 'slate',  label: 'スレート' },
];

export function renderSettings(root, { rerender }) {
  const themeCard = document.createElement('div');
  themeCard.className = 'card';
  themeCard.innerHTML = `
    <div style="font-weight:600; margin-bottom: 10px;">テーマカラー</div>
    <div class="theme-grid">
      ${THEMES.map(t => `
        <button class="theme-swatch ${state.theme === t.key ? 'active' : ''}"
                data-theme="${t.key}" aria-label="${t.label}">
          ${t.label}
        </button>
      `).join('')}
    </div>
    <div class="muted" style="margin-top:10px;">アプリ全体の色を変更できます</div>
  `;
  themeCard.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      rerender();
    });
  });
  root.appendChild(themeCard);

  const notifCard = document.createElement('div');
  notifCard.className = 'card';
  const isOn = !!state.notificationsEnabled;
  const native = notificationsAvailable();
  notifCard.innerHTML = `
    <div style="font-weight:600; margin-bottom: 6px;">通知（リマインダー）</div>
    <div class="muted" style="margin-bottom: 12px;">
      ${native
        ? '服用時刻になると毎日通知でお知らせします。'
        : 'Android アプリ版でのみ動作します（ブラウザでは無効）。'}
    </div>
    <button class="btn btn-block ${isOn ? '' : 'primary'}" id="notif-toggle"
      ${native ? '' : 'disabled style="opacity:.5; cursor:not-allowed;"'}>
      ${isOn ? '通知をオフにする' : '通知をオンにする'}
    </button>
    <div class="muted" id="notif-status" style="margin-top:8px;"></div>
  `;
  notifCard.querySelector('#notif-toggle').addEventListener('click', async () => {
    const status = notifCard.querySelector('#notif-status');
    status.textContent = '処理中…';
    try {
      const res = await setNotificationsEnabled(!isOn);
      if (res.skipped === 'permission-denied') {
        status.textContent = '権限が許可されませんでした。端末の設定からアプリの通知を有効にしてください。';
        state.notificationsEnabled = false;
        save();
      } else if (res.skipped === 'unsupported') {
        status.textContent = 'この端末では通知を使用できません。';
      } else {
        rerender();
      }
    } catch (err) {
      status.textContent = 'エラー: ' + err.message;
    }
  });
  root.appendChild(notifCard);

  const dataCard = document.createElement('div');
  dataCard.className = 'card';
  dataCard.innerHTML = `
    <div style="font-weight:600; margin-bottom: 10px;">データ管理</div>
    <div class="muted" style="margin-bottom: 12px;">
      登録: ${state.medications.length} 件 / 履歴: ${state.logs.length} 件
    </div>
    <button class="btn btn-block" id="export">JSONをエクスポート</button>
    <div style="height:8px;"></div>
    <label class="btn btn-block" style="display:block; text-align:center; cursor:pointer;">
      JSONをインポート
      <input type="file" accept="application/json" id="import" style="display:none;" />
    </label>
    <div style="height:8px;"></div>
    <button class="btn danger btn-block" id="clear">全データを削除</button>
  `;
  dataCard.querySelector('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'medication-tracker.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  dataCard.querySelector('#import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      if (Array.isArray(data.medications)) state.medications = data.medications;
      if (Array.isArray(data.logs)) state.logs = data.logs;
      if (typeof data.theme === 'string') {
        state.theme = data.theme;
        document.body.dataset.theme = data.theme;
      }
      save();
      rerender();
      alert('インポートしました');
    } catch (err) {
      alert('インポートに失敗しました: ' + err.message);
    }
  });
  dataCard.querySelector('#clear').addEventListener('click', () => {
    if (confirm('全データを削除します。よろしいですか？')) {
      clearAll();
      rerender();
    }
  });
  root.appendChild(dataCard);

  const about = document.createElement('div');
  about.className = 'card';
  about.innerHTML = `
    <div style="font-weight:600;">お薬トラッカー</div>
    <div class="muted" style="margin-top: 4px;">
      v0.1.0 — オフライン動作・端末内保存
    </div>
  `;
  root.appendChild(about);
}
