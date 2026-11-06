export const VALID_INTERVALS = [60, 90, 120, 180];
export const VALID_SIPS = [6, 8, 10, 12, 15];

export function minutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  const start = minutes(schedule.start);
  const end = minutes(schedule.end);
  if (start === null || end === null || end <= start) return false;
  if (!VALID_INTERVALS.includes(schedule.interval)) return false;
  if (!VALID_SIPS.includes(schedule.sips)) return false;
  if (typeof schedule.timeZone !== 'string' || schedule.timeZone.length > 100) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: schedule.timeZone }); return true; }
  catch { return false; }
}

export function localDayParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return {
    day: obj.year + '-' + obj.month + '-' + obj.day,
    minute: Number(obj.hour) * 60 + Number(obj.minute)
  };
}

/**
 * Return a unique due-slot key when an elapsed scheduled time falls within
 * the last five minutes, allowing a five-minute Cron Trigger to run on UTC.
 * The server keeps last_sent_slot in D1 to prevent duplicate sends.
 */
export function dueSlot(schedule, date = new Date()) {
  if (!validateSchedule(schedule)) return null;
  const { day, minute } = localDayParts(date, schedule.timeZone);
  const start = minutes(schedule.start);
  const end = minutes(schedule.end);
  if (minute < start || minute > end + 4) return null;
  const index = Math.floor((minute - start) / schedule.interval);
  if (index < 0) return null;
  const slot = start + index * schedule.interval;
  if (slot > end || minute - slot >= 5) return null;
  return day + ':' + String(Math.floor(slot / 60)).padStart(2,'0') + ':' + String(slot % 60).padStart(2,'0');
}
