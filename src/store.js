const KEY = 'medication-tracker-state-v1';

export const state = {
  theme: 'blue',
  medications: [], // {id, name, dose, times: ["08:00", ...], note}
  logs: [], // {id, medId, time: "08:00", date: "YYYY-MM-DD", takenAt: epoch}
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch (e) {
    console.warn('load failed', e);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayStr(d = new Date()) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function pad(n) { return String(n).padStart(2, '0'); }

export function isTaken(medId, time, date = todayStr()) {
  return state.logs.some(l => l.medId === medId && l.time === time && l.date === date);
}

export function markTaken(medId, time, date = todayStr()) {
  if (isTaken(medId, time, date)) return;
  state.logs.push({ id: uid(), medId, time, date, takenAt: Date.now() });
  save();
}

export function unmarkTaken(medId, time, date = todayStr()) {
  const idx = state.logs.findIndex(l => l.medId === medId && l.time === time && l.date === date);
  if (idx >= 0) {
    state.logs.splice(idx, 1);
    save();
  }
}

export function addMedication(med) {
  state.medications.push({ id: uid(), ...med });
  save();
}

export function updateMedication(id, patch) {
  const m = state.medications.find(m => m.id === id);
  if (m) {
    Object.assign(m, patch);
    save();
  }
}

export function deleteMedication(id) {
  const idx = state.medications.findIndex(m => m.id === id);
  if (idx >= 0) {
    state.medications.splice(idx, 1);
    state.logs = state.logs.filter(l => l.medId !== id);
    save();
  }
}

export function setTheme(t) {
  state.theme = t;
  document.body.dataset.theme = t;
  save();
}

export function clearAll() {
  state.medications = [];
  state.logs = [];
  save();
}
