import webpush from 'web-push';
import { dueSlot, validateSchedule } from './schedule.js';

const ALLOWED_ORIGIN = 'https://tatianegr.github.io';
const APP_URL = 'https://tatianegr.github.io/gota-a-gota/';
const MAX_BODY_LENGTH = 9000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Code',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}
function response(body, status = 200) {
  return Response.json(body, { status, headers: corsHeaders() });
}
function validEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    const host = url.hostname.toLowerCase();
    return host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'push.services.mozilla.com' ||
      host === 'push.apple.com' || host.endsWith('.push.apple.com');
  } catch { return false; }
}
function validSubscription(sub) {
  return !!sub && typeof sub === 'object' &&
    typeof sub.endpoint === 'string' && sub.endpoint.length < 3500 &&
    validEndpoint(sub.endpoint) && sub.keys &&
    typeof sub.keys.p256dh === 'string' && /^[\w-]{40,180}$/.test(sub.keys.p256dh) &&
    typeof sub.keys.auth === 'string' && /^[\w-]{12,100}$/.test(sub.keys.auth);
}
function validateId(id) {
  return typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
function configureVapid(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error('VAPID is not configured');
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}
async function sendToDevice(device, env, isTest = false, slot = '') {
  configureVapid(env);
  const payload = JSON.stringify({
    title: isTest ? 'Teste do Gota a Gota' : 'Hora de beber água',
    body: isTest
      ? 'Notificação funcionando! Suas pausas vão aparecer mesmo com o app fechado.'
      : 'Que tal ' + device.sips + ' goladas tranquilas pelo canudo?',
    url: APP_URL,
    tag: isTest ? 'gota-test-' + Date.now() : 'gota-' + slot
  });
  try {
    await webpush.sendNotification(JSON.parse(device.subscription), payload, {
      TTL: isTest ? 300 : 900,
      urgency: 'normal'
    });
    return true;
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(device.id).run();
    }
    console.warn('Push delivery failed', { id: device.id, status: error?.statusCode || 0 });
    return false;
  }
}

async function readJson(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_LENGTH) throw new Error('Payload too large');
  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) throw new Error('Payload too large');
  return JSON.parse(raw);
}

async function processRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== ALLOWED_ORIGIN) return response({ error:'Origem não autorizada' }, 403);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    return response({ ok:true, service:'gota-a-gota-push' });
  }
  if (request.method === 'GET' && url.pathname === '/api/config') {
    return env.VAPID_PUBLIC_KEY
      ? response({ publicKey: env.VAPID_PUBLIC_KEY })
      : response({ error:'Serviço ainda não configurado' }, 503);
  }
  if (request.method !== 'POST' || !['/api/subscribe','/api/unsubscribe','/api/test'].includes(url.pathname)) {
    return response({ error:'Rota inexistente' }, 404);
  }
  const secret = request.headers.get('X-App-Code') || '';
  if (!env.SETUP_CODE || env.SETUP_CODE.length < 20 || secret !== env.SETUP_CODE) {
    return response({ error:'Código de ativação incorreto' }, 401);
  }
  let body;
  try { body = await readJson(request); } catch { return response({ error:'Dados inválidos' }, 400); }
  if (!validateId(body?.id)) return response({ error:'Identificador inválido' }, 400);

  if (url.pathname === '/api/unsubscribe') {
    await env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(body.id).run();
    return response({ ok:true });
  }
  if (url.pathname === '/api/subscribe') {
    const subscription = body.subscription;
    const schedule = body.schedule;
    if (!validSubscription(subscription) || !validateSchedule(schedule)) {
      return response({ error:'Verifique a assinatura e os horários' }, 400);
    }
    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM devices').first();
    const existing = await env.DB.prepare('SELECT id FROM devices WHERE id = ?').bind(body.id).first();
    if (!existing && count.total >= 10) {
      return response({ error:'Número máximo de aparelhos atingido' }, 429);
    }
    await env.DB.prepare(
      `INSERT INTO devices (id, subscription, start_time, end_time, interval_minutes, sips, time_zone, active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
       subscription=excluded.subscription, start_time=excluded.start_time,
       end_time=excluded.end_time, interval_minutes=excluded.interval_minutes,
       sips=excluded.sips, time_zone=excluded.time_zone,
       active=1, updated_at=excluded.updated_at`
    ).bind(
      body.id, JSON.stringify(subscription),
      schedule.start, schedule.end, schedule.interval,
      schedule.sips, schedule.timeZone, Date.now()
    ).run();
    return response({ ok:true });
  }

  const device = await env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(body.id).first();
  if (!device) return response({ error:'Ative as notificações primeiro' }, 404);
  const now = Date.now();
  if (now - device.last_test_at < 60000) {
    return response({ error:'Aguarde um minuto para testar novamente' }, 429);
  }
  await env.DB.prepare('UPDATE devices SET last_test_at = ? WHERE id = ?').bind(now, body.id).run();
  const sent = await sendToDevice(device, env, true);
  return sent ? response({ ok:true }) : response({ error:'Não foi possível enviar o aviso de teste' }, 502);
}
async function runScheduled(env, time) {
  const result = await env.DB.prepare('SELECT * FROM devices WHERE active = 1 LIMIT 10').all();
  const devices = result.results || [];
  for (const device of devices) {
    const slot = dueSlot({
      start:device.start_time,end:device.end_time,
      interval:device.interval_minutes,sips:device.sips,
      timeZone:device.time_zone
    },time);
    if (!slot || device.last_sent_slot === slot) continue;
    const changed = await env.DB.prepare(
      'UPDATE devices SET last_sent_slot = ? WHERE id = ? AND (last_sent_slot IS NULL OR last_sent_slot != ?)'
    ).bind(slot,device.id,slot).run();
    if (changed.meta?.changes > 0) await sendToDevice(device, env, false, slot);
  }
}
export default {
  async fetch(request, env) {
    try { return await processRequest(request,env); }
    catch (error) { console.error('API error',error);return response({ error:'Erro no serviço de notificações' }, 500); }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(env, new Date(controller.scheduledTime)));
  }
};
