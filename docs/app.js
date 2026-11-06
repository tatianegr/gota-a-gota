(() => {
  'use strict';
  const ROOT = './';
  const SETTINGS_KEY = 'gota-a-gota-web-settings-v1';
  const ENTRIES_KEY = 'gota-a-gota-web-entries-v1';
  const defaults = {start:'08:00',end:'21:00',interval:90,sips:10,remindersOpen:false};
  const $ = id => document.getElementById(id);
  const safeRead = (key, fallback) => {try {const parsed=JSON.parse(localStorage.getItem(key));return parsed ?? fallback;}catch{return fallback;}};
  const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{showToast('Não foi possível salvar','Verifique o armazenamento do navegador.');return false}};
  const initialSettings=safeRead(SETTINGS_KEY,{});
  let settings = {...defaults,...initialSettings};
  let entries = safeRead(ENTRIES_KEY,[]);
  if(!Array.isArray(entries))entries=[];
  const dateKey = (d=new Date()) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const dayShift=(date,offset)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+offset,12);
  const toMin = t => {if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return null;const [h,m]=t.split(':').map(Number);return h*60+m};
  const toTime=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  const valid=s=>toMin(s.start)!==null&&toMin(s.end)!==null&&toMin(s.end)>toMin(s.start)&&[60,90,120,180].includes(s.interval)&&[6,8,10,12,15].includes(s.sips);
  const schedule=()=>{if(!valid(settings))return[];const out=[];for(let i=toMin(settings.start);i<=toMin(settings.end)&&out.length<24;i+=settings.interval)out.push(toTime(i));return out};
  const todays=()=>entries.filter(e=>e.day===dateKey());
  const encode=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reminderTimes=schedule();
  let currentToastTimer=null;
  function showToast(title,body){
    $('toast-title').textContent=title;$('toast-body').textContent=body;$('toast').hidden=false;
    if(currentToastTimer)clearTimeout(currentToastTimer);
    currentToastTimer=setTimeout(()=>$('toast').hidden=true,9000);
  }
  $('toast-close').addEventListener('click',()=>{$('toast').hidden=true;if(currentToastTimer)clearTimeout(currentToastTimer)});
  function renderToday(){
    const now=new Date();
    const data=todays();const times=schedule();
    $('today-date').textContent=now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    $('sip-count').textContent=settings.sips;$('button-sips').textContent=settings.sips;
    $('progress-done').textContent=data.length;$('progress-target').textContent=times.length;
    $('today-sips').textContent=data.reduce((n,e)=>n+e.sips,0);
    $('today-rounds').textContent=data.length;
    const percent=times.length?Math.min(100,Math.round(100*data.length/times.length)):0;
    $('progress-fill').style.width=percent+'%';
    $('progress-track').setAttribute('aria-valuemax',String(times.length));
    $('progress-track').setAttribute('aria-valuenow',String(Math.min(data.length,times.length)));
    $('undo-water').disabled=data.length===0;
    $('schedule-caption').textContent=times.length+' pausas sugeridas';
    $('schedule-list').innerHTML=times.map(t=>'<div class="schedule-row"><span class="schedule-time"><span class="schedule-dot"></span>'+encode(t)+'</span><span class="schedule-note">'+settings.sips+' goladas</span></div>').join('');
    const nowMin=now.getHours()*60+now.getMinutes();
    const next=times.find(t=>toMin(t)>nowMin);
    $('next-reminder').textContent=next?'Próxima pausa planejada: '+next : times.length?'Próxima pausa: amanhã, '+times[0]:'Ajuste seus horários';
  }
  function renderHistory(){
    const now=new Date();const days=Array.from({length:7},(_,i)=>dayShift(now,i-6));
    const rows=days.map(d=>{const day=dateKey(d);const list=entries.filter(e=>e.day===day);return {day,date:d,count:list.length,sips:list.reduce((n,e)=>n+e.sips,0)}});
    const max=Math.max(1,...rows.map(r=>r.count));
    $('history-chart').innerHTML=rows.map(r=>'<div class="history-col '+(r.day===dateKey()?'today':'')+'"><strong>'+r.count+'</strong><div class="history-bar-wrap"><div class="history-bar" style="height:'+Math.max(4,r.count/max*100)+'%"></div></div><small>'+encode(r.date.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''))+'</small></div>').join('');
    $('history-list').innerHTML=rows.slice().reverse().map(r=>'<div class="history-row"><strong>'+encode(r.date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}))+'</strong><small>'+r.count+' pausas</small><strong>'+r.sips+' goladas</strong></div>').join('');
  }
  function renderSettings(){
    $('start-time').value=settings.start;$('end-time').value=settings.end;
    $('interval').value=String(settings.interval);$('sips').value=String(settings.sips);
    $('reminders-open').checked=!!settings.remindersOpen;
    $('install-status').textContent=window.matchMedia('(display-mode: standalone)').matches?'✓ Você já está usando o app pela tela de início.':'Dica: o ícone ficará ao lado dos outros aplicativos.';
  }
  function render(){renderToday();renderHistory();renderSettings()}
  let activeTab='hoje';
  function navigate(tab){
    if(!['hoje','historico','ajustes'].includes(tab))return;
    activeTab=tab;
    for(const name of ['hoje','historico','ajustes'])$('panel-'+name).hidden=name!==tab;
    for(const button of document.querySelectorAll('.nav-button')){button.classList.toggle('is-active',button.dataset.tab===tab);if(button.dataset.tab===tab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')}
    render();window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.tab)));
  $('log-water').addEventListener('click',()=>{
    const now=new Date();
    const item={id:now.getTime()+'-'+Math.random().toString(36).slice(2),day:dateKey(now),sips:settings.sips};
    entries.push(item);
    if(safeWrite(ENTRIES_KEY,entries)){render();showToast('Boa! Mais uma pausa concluída.','Você registrou '+settings.sips+' goladas.')}else entries.pop();
  });
  $('undo-water').addEventListener('click',()=>{
    for(let i=entries.length-1;i>=0;i--)if(entries[i].day===dateKey()){const removed=entries.splice(i,1)[0];if(!safeWrite(ENTRIES_KEY,entries))entries.splice(i,0,removed);render();return}
  });
  $('settings-form').addEventListener('submit',e=>{
    e.preventDefault();
    const proposed={start:$('start-time').value,end:$('end-time').value,interval:Number($('interval').value),sips:Number($('sips').value),remindersOpen:$('reminders-open').checked};
    if(!valid(proposed)){$('form-error').textContent='Confira os horários. O último precisa ser depois do primeiro.';$('form-error').hidden=false;return}
    $('form-error').hidden=true;
    if(safeWrite(SETTINGS_KEY,proposed)){settings=proposed;lastReminderKey='';render();showToast('Ajustes salvos!','Seu novo ritmo já está valendo.')}
  });
  $('test-reminder').addEventListener('click',()=>showToast('Hora de beber água!','Hora de '+settings.sips+' goladas tranquilas pelo canudo.'));
  let lastReminderKey='';
  function tick(){
    const now=new Date(); const minuteKey=dateKey(now)+' '+toTime(now.getHours()*60+now.getMinutes());
    if(settings.remindersOpen && schedule().includes(minuteKey.slice(-5)) && lastReminderKey!==minuteKey){
      lastReminderKey=minuteKey;
      showToast('Sua pausa chegou!','Hora de '+settings.sips+' goladas tranquilas pelo canudo.');
      if(navigator.vibrate)navigator.vibrate([120,80,120]);
    }
    if(activeTab==='hoje')renderToday();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();tick()}});
  window.addEventListener('pageshow',()=>render());
  render();tick();setInterval(tick,15000);
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(ROOT+'sw.js',{scope:ROOT}).catch(()=>{}));
})();