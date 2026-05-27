import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { state, save, load } from './store.js';
import { rescheduleAll } from './notifications.js';
import { renderToday } from './views/today.js';
import { renderMedications } from './views/medications.js';
import { renderHistory } from './views/history.js';
import { renderSettings } from './views/settings.js';

load();
document.body.dataset.theme = state.theme;

if (Capacitor.isNativePlatform()) {
  rescheduleAll().catch((e) => console.warn('reschedule failed', e));
}

const root = document.getElementById('app');

const VIEWS = {
  today: { label: '今日', icon: '📅', render: renderToday },
  meds: { label: '薬', icon: '💊', render: renderMedications },
  history: { label: '履歴', icon: '📊', render: renderHistory },
  settings: { label: '設定', icon: '⚙️', render: renderSettings },
};

let currentView = 'today';

function render() {
  const view = VIEWS[currentView];
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <div>
      <h1 class="app-title">${headerTitle()}</h1>
      <div class="app-sub">${headerSub()}</div>
    </div>
  `;
  root.appendChild(header);

  const content = document.createElement('main');
  root.appendChild(content);
  view.render(content, { navigate, rerender: render });

  const tabbar = document.createElement('nav');
  tabbar.className = 'tabbar';
  for (const [key, v] of Object.entries(VIEWS)) {
    const btn = document.createElement('button');
    btn.className = 'tab' + (key === currentView ? ' active' : '');
    btn.innerHTML = `<span class="ico">${v.icon}</span>${v.label}`;
    btn.addEventListener('click', () => navigate(key));
    tabbar.appendChild(btn);
  }
  root.appendChild(tabbar);
}

function navigate(view) {
  currentView = view;
  render();
}

function headerTitle() {
  if (currentView === 'today') return 'お薬トラッカー';
  if (currentView === 'meds') return '薬の一覧';
  if (currentView === 'history') return '服用履歴';
  if (currentView === 'settings') return '設定';
  return '';
}
function headerSub() {
  if (currentView === 'today') {
    const d = new Date();
    const wd = '日月火水木金土'[d.getDay()];
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} (${wd})`;
  }
  if (currentView === 'meds') return `${state.medications.length} 件登録中`;
  if (currentView === 'history') return '直近の服用ログ';
  if (currentView === 'settings') return 'テーマ・データ';
  return '';
}

function pad(n) { return String(n).padStart(2, '0'); }

window.addEventListener('beforeunload', save);
render();

if (Capacitor.isNativePlatform()) {
  requestAnimationFrame(() => {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  });
}
