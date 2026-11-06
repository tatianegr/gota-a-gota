(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PREFIX = 'gota-a-gota-push-v1-';
  const URL_KEY = PREFIX+'url', CODE_KEY=PREFIX+'code', ID_KEY=PREFIX+'device-id',ACTIVE_KEY=PREFIX+'active';
  const status=$('push-status'),apiInput=$('push-server-url'),codeInput=$('push-activation-code');
  if (!status || !apiInput || !codeInput) return;

  function message(value,ok=false) {
    status.textContent=value;
    status.dataset.state=ok?'ok':'info';
  }
  function read(key){try{return localStorage.getItem(key)||''}catch{return ''}}
  function write(key,value){try{localStorage.setItem(key,value)}catch{}}
  function remove(key){try{localStorage.removeItem(key)}catch{}}
  function validWorkerUrl(input) {
    try {
      const u=new URL(String(input).trim());
      if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/') return false;
      return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.workers\.dev$/i.test(u.hostname);
    } catch { return false; }
  }
  function apiUrl(){return apiInput.value.trim().replace(/\/+$/,'')}
  function saveValues(){
    write(URL_KEY,apiUrl());
    write(CODE_KEY,codeInput.value);
  }
  function getDeviceId(){
    let id=read(ID_KEY);
    if(!id){id=crypto.randomUUID();write(ID_KEY,id)}
    return id;
  }
  function getSettings(){
    let current={};
    try{current=JSON.parse(localStorage.getItem('gota-a-gota-web-settings-v1')||'{}')}catch{}
    const start=current.start||'08:00',end=current.end||'21:00';
    const interval=Number(current.interval||90),sips=Number(current.sips||10);
    const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Sao_Paulo';
    return {start,end,interval,sips,timeZone};
  }
  async function request(path,body){
    const url=apiUrl();
    if(!validWorkerUrl(url)) throw new Error('Informe um endereço workers.dev válido, com https.');
    const secret=codeInput.value.trim();
    if(secret.length<20) throw new Error('O código privado precisa ter pelo menos 20 caracteres.');
    const response=await fetch(url+path,{
      method:'POST',mode:'cors',
      headers:{'Content-Type':'application/json','X-App-Code':secret},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'O serviço não respondeu corretamente.');
    return result;
  }
  async function serverConfig(){
    const url=apiUrl();
    if(!validWorkerUrl(url))throw new Error('Informe a URL do seu serviço Cloudflare (*.workers.dev).');
    const response=await fetch(url+'/api/config',{mode:'cors'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.publicKey)throw new Error(data.error||'O serviço ainda não está pronto.');
    return data.publicKey;
  }
  function keyBuffer(base64url){
    const base64=base64url.replace(/-/g,'+').replace(/_/g,'/');
    const padded=base64+'='.repeat((4-base64.length%4)%4);
    const bytes=atob(padded);
    return Uint8Array.from(bytes,c=>c.charCodeAt(0));
  }
  function supported(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window &&
      window.isSecureContext;
  }
  function iPhoneNotInstalled(){
    return /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone;
  }
  async function showCurrentStatus(){
    if(!supported()){message('Este navegador não oferece Web Push. No iPhone, adicione o site à tela de início primeiro.');return}
    if(iPhoneNotInstalled()){message('No iPhone, abra o Gota a Gota pela tela de início para permitir notificações.');return}
    if(read(ACTIVE_KEY)!=='yes'){message('Notificações com o app fechado ainda não ativadas. Configure seu serviço e toque em Ativar.');return}
    if(Notification.permission!=='granted'){message('As notificações estão bloqueadas. Confira Ajustes → Notificações no iPhone.');return}
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      message(sub?'Notificações ativadas neste aparelho.': 'Assinatura não encontrada. Toque em Ativar novamente.',!!sub);
    }catch{message('Não foi possível verificar a assinatura de notificações.')}
  }
  apiInput.value=read(URL_KEY);
  codeInput.value=read(CODE_KEY);

  $('enable-push').addEventListener('click',async ()=>{
    const btn=$('enable-push');
    if(!supported()){message('Notificações não disponíveis neste navegador.');return}
    if(iPhoneNotInstalled()){message('Abra o Gota a Gota pelo ícone da tela de início do iPhone e tente novamente.');return}
    if(!validWorkerUrl(apiUrl())){message('Informe primeiro o endereço do seu Worker, terminado em workers.dev.');return}
    if(codeInput.value.trim().length<20){message('Informe um código de ativação com pelo menos 20 caracteres.');return}
    btn.disabled=true;
    try{
      // Safari requires the permission prompt to originate directly from a user gesture.
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Permissão negada. Libere as notificações nos ajustes do aparelho.');
      message('Preparando sua assinatura de notificações…');
      const key=await serverConfig();
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(sub){
        // Existing subscription may belong to a different VAPID key; recreate it if so.
        try {
          const appKey=sub.options?.applicationServerKey;
          if(appKey && Array.from(new Uint8Array(appKey)).join(',')!==Array.from(keyBuffer(key)).join(',')){
            await sub.unsubscribe();sub=null;
          }
        }catch{}
      }
      if(!sub)sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,applicationServerKey:keyBuffer(key)
      });
      await request('/api/subscribe',{id:getDeviceId(),subscription:sub.toJSON(),schedule:getSettings()});
      saveValues();write(ACTIVE_KEY,'yes');
      message('Pronto! Notificações ativadas. Use o botão de teste para verificar.',true);
    }catch(error){message(error.message||'Não foi possível ativar as notificações.')}
    finally{btn.disabled=false}
  });

  $('test-push').addEventListener('click',async ()=>{
    if(read(ACTIVE_KEY)!=='yes'){message('Ative as notificações antes de fazer o teste.');return}
    const btn=$('test-push');btn.disabled=true;
    try{
      await request('/api/test',{id:getDeviceId()});
      saveValues();
      message('Teste enviado pelo serviço. Confira as notificações do iPhone.',true);
    }catch(error){message(error.message||'Não foi possível enviar o teste.')}
    finally{btn.disabled=false}
  });

  $('disable-push').addEventListener('click',async ()=>{
    const btn=$('disable-push');btn.disabled=true;
    try{
      if(read(ACTIVE_KEY)==='yes')await request('/api/unsubscribe',{id:getDeviceId()});
      if(supported()){
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        if(sub)await sub.unsubscribe();
      }
      remove(ACTIVE_KEY);remove(CODE_KEY);codeInput.value='';
      message('Notificações com o app fechado desativadas.',true);
    }catch(error){message(error.message||'Não foi possível desativar no serviço.')}
    finally{btn.disabled=false}
  });

  // The main app stores settings before the second submit listener executes.
  $('settings-form').addEventListener('submit',async ()=>{
    if(read(ACTIVE_KEY)!=='yes' || !validWorkerUrl(apiUrl())||codeInput.value.trim().length<20)return;
    try {
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(!sub)return;
      await request('/api/subscribe',{id:getDeviceId(),subscription:sub.toJSON(),schedule:getSettings()});
      saveValues();
      message('Horários das notificações atualizados no servidor.',true);
    }catch(error){message('Ajustes locais salvos. Não foi possível sincronizar os avisos: '+(error.message||'erro'))}
  });

  showCurrentStatus();
})();