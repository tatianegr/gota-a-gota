export const DEFAULT_SETTINGS = Object.freeze({
  startTime: '08:00',
  endTime: '21:00',
  intervalMinutes: 90,
  sipsPerRound: 10,
  notificationsEnabled: false,
});

export function toMinutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function validateSettings(config) {
  const start = toMinutes(config.startTime);
  const end = toMinutes(config.endTime);
  if (start === null || end === null) return 'Use horários no formato HH:MM, como 08:00.';
  if (end <= start) return 'O horário de término deve ser posterior ao início.';
  if (![60, 90, 120, 180].includes(config.intervalMinutes)) return 'Escolha um intervalo válido.';
  if (![6, 8, 10, 12, 15].includes(config.sipsPerRound)) return 'Escolha uma quantidade de goladas válida.';
  return null;
}

export function getReminderTimes(config) {
  if (validateSettings(config)) return [];
  const start = toMinutes(config.startTime);
  const end = toMinutes(config.endTime);
  const times = [];
  for (let time = start; time <= end && times.length < 24; time += config.intervalMinutes) {
    times.push(minutesToTime(time));
  }
  return times;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalDay(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

export function getNextReminder(times, now = new Date()) {
  if (!times.length) return null;
  const current = now.getHours() * 60 + now.getMinutes();
  const next = times.find((time) => toMinutes(time) > current);
  return next ? `Hoje, ${next}` : `Amanhã, ${times[0]}`;
}
