import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { state, save } from './store.js';

const SUPPORTED = Capacitor.isNativePlatform();
const CHANNEL_ID = 'medication-reminders';

export function notificationsAvailable() {
  return SUPPORTED;
}

export async function ensurePermission() {
  if (!SUPPORTED) return 'unsupported';
  let s = await LocalNotifications.checkPermissions();
  if (s.display !== 'granted') {
    s = await LocalNotifications.requestPermissions();
  }
  if (s.display === 'granted') {
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: '服用リマインダー',
        description: 'お薬の服用時刻を通知します',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    } catch (_) { /* iOS or older Android: no-op */ }
  }
  return s.display;
}

function idFor(medId, time) {
  let h = 0;
  for (const c of `${medId}|${time}`) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2147480000 + 1000;
}

function nextOccurrence(time) {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

let inFlight = null;
let queued = false;

export function rescheduleAll() {
  if (inFlight) {
    // Coalesce: re-run once after the current pass finishes so that
    // mutations applied while in flight aren't lost.
    queued = true;
    return inFlight;
  }
  inFlight = doReschedule().finally(() => {
    const rerun = queued;
    queued = false;
    inFlight = null;
    if (rerun) rescheduleAll();
  });
  return inFlight;
}

async function doReschedule() {
  if (!SUPPORTED) return { scheduled: 0, skipped: 'unsupported' };
  const perm = await ensurePermission();
  if (perm !== 'granted') return { scheduled: 0, skipped: 'permission-denied' };

  const pending = await LocalNotifications.getPending();
  // Only cancel notifications we scheduled — leave other plugins' notifications alone.
  const mine = pending.notifications.filter(n => n.extra?.medId);
  if (mine.length) {
    await LocalNotifications.cancel({ notifications: mine.map(n => ({ id: n.id })) });
  }
  if (!state.notificationsEnabled) return { scheduled: 0, skipped: 'disabled' };

  const toSchedule = [];
  for (const med of state.medications) {
    for (const time of (med.times || [])) {
      toSchedule.push({
        id: idFor(med.id, time),
        title: 'お薬の時間です',
        body: `${med.name}${med.dose ? ` (${med.dose})` : ''}`,
        channelId: CHANNEL_ID,
        schedule: {
          at: nextOccurrence(time),
          repeats: true,
          every: 'day',
          allowWhileIdle: true,
        },
        extra: { medId: med.id, time },
      });
    }
  }
  if (toSchedule.length) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
  return { scheduled: toSchedule.length };
}

export async function setEnabled(on) {
  state.notificationsEnabled = !!on;
  save();
  return rescheduleAll();
}
