import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS, toMinutes, validateSettings, getReminderTimes,
  localDateKey, shiftLocalDay, getNextReminder,
} from '../src/lib/schedule.js';

test('gera nove lembretes entre 8h e 20h com intervalo de 90min', () => {
  const times = getReminderTimes(DEFAULT_SETTINGS);
  assert.deepEqual(times, ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00']);
});

test('recusa horário inválido e janela invertida', () => {
  assert.equal(toMinutes('25:99'), null);
  assert.ok(validateSettings({...DEFAULT_SETTINGS, startTime: '21:00', endTime: '08:00'}));
  assert.equal(getReminderTimes({...DEFAULT_SETTINGS, startTime: '21:00', endTime: '08:00'}).length, 0);
});

test('calcula o dia usando data local e atravessa virada de mês', () => {
  assert.equal(localDateKey(new Date(2026, 10, 6, 23)), '2026-11-06');
  assert.equal(localDateKey(shiftLocalDay(new Date(2026, 10, 30), 1)), '2026-12-01');
});

test('próximo lembrete aparece hoje ou amanhã', () => {
  const times = ['08:00', '09:30'];
  assert.equal(getNextReminder(times, new Date(2026, 10, 6, 9, 0)), 'Hoje, 09:30');
  assert.equal(getNextReminder(times, new Date(2026, 10, 6, 21, 0)), 'Amanhã, 08:00');
});
