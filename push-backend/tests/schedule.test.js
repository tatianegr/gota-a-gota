import test from 'node:test';
import assert from 'node:assert/strict';
import { dueSlot, validateSchedule } from '../src/schedule.js';

const config={start:'08:00',end:'21:00',interval:90,sips:10,timeZone:'America/Sao_Paulo'};
test('respeita fuso de São Paulo e agenda das 8h',()=> {
  assert.equal(dueSlot(config,new Date('2026-11-06T11:02:00Z')),'2026-11-06:08:00');
  assert.equal(dueSlot(config,new Date('2026-11-06T11:05:00Z')),null);
});
test('respeita intervalo de 90 minutos',()=>{
  assert.equal(dueSlot(config,new Date('2026-11-06T12:33:00Z')),'2026-11-06:09:30');
  assert.equal(dueSlot(config,new Date('2026-11-06T12:36:00Z')),null);
});
test('não envia notificações fora da janela',()=>{
  assert.equal(dueSlot(config,new Date('2026-11-06T09:00:00Z')),null);
  assert.equal(dueSlot(config,new Date('2026-11-07T01:00:00Z')),null);
});
test('aceita horários desalinhados com cron de cinco minutos',()=>{
  assert.equal(dueSlot({...config,start:'08:07'},new Date('2026-11-06T11:10:00Z')),'2026-11-06:08:07');
});
test('valida horários, intervalos e fuso',()=>{
  assert.equal(validateSchedule({...config,timeZone:'Nao/Existe'}),false);
  assert.equal(validateSchedule({...config,interval:2}),false);
  assert.equal(validateSchedule({...config,end:'06:00'}),false);
  assert.equal(validateSchedule(config),true);
});
