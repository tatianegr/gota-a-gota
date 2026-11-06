import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_SETTINGS, getReminderTimes, getNextReminder, localDateKey, shiftLocalDay, validateSettings } from './src/lib/schedule';
import { loadAppData, saveEntries, saveSettings } from './src/lib/storage';
import { requestNotificationPermission, scheduleTestNotification, syncReminders } from './src/lib/notifications';

const colors = { bg:'#F4F9FB', white:'#FFFFFF', ink:'#14313D', muted:'#68828C', teal:'#0E7892', dark:'#075E75', light:'#E2F4F8', line:'#E3EDF1' };
const intervals = [60,90,120,180];
const sipOptions = [6,8,10,12,15];

function Button({ label, onPress, secondary=false, disabled=false }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[s.button,secondary&&s.buttonSecondary,disabled&&{opacity:.5}]}>
    <Text style={[s.buttonText,secondary&&{color:colors.dark}]}>{label}</Text>
  </Pressable>;
}
function Card({children}) { return <View style={s.card}>{children}</View>; }
function Heading({children}) { return <Text style={s.title}>{children}</Text>; }
function Choice({values,value,onChange,label}) {
  return <View><Text style={s.label}>{label}</Text><View style={s.choices}>{values.map(item=><Pressable accessibilityRole="radio" accessibilityState={{checked:item===value}} key={item} onPress={()=>onChange(item)} style={[s.choice,item===value&&s.choiceActive]}><Text style={[s.choiceText,item===value&&{color:'#fff'}]}>{String(item)}</Text></Pressable>)}</View></View>;
}
function AppContent() {
  const [tab,setTab] = useState('hoje');
  const [settings,setSettings] = useState(DEFAULT_SETTINGS);
  const [draft,setDraft] = useState(DEFAULT_SETTINGS);
  const [entries,setEntries] = useState([]);
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [now,setNow] = useState(new Date());
  const settingsRef=useRef(DEFAULT_SETTINGS);
  const entriesRef=useRef([]);
  useEffect(()=>{
    let active=true;
    loadAppData().then(data=>{
      if(!active)return;
      settingsRef.current=data.settings; entriesRef.current=data.entries;
      setSettings(data.settings);setDraft(data.settings);setEntries(data.entries);setReady(true);
      if(data.settings.notificationsEnabled)syncReminders(data.settings).catch(()=>{});
    }).catch(()=>{Alert.alert('Erro','Não foi possível carregar os dados.');setReady(true)});
    const listener=AppState.addEventListener('change',state=>{if(state==='active')setNow(new Date())});
    const timer=setInterval(()=>setNow(new Date()),60000);
    return ()=>{active=false;listener.remove();clearInterval(timer)};
  },[]);
  const today=localDateKey(now);
  const todayEntries=entries.filter(e=>e.day===today);
  const sum=todayEntries.reduce((n,e)=>n+e.sips,0);
  const times=getReminderTimes(settings);
  const record=async()=>{
    const item={id:String(Date.now())+'-'+Math.random().toString(36).slice(2),day:localDateKey(),sips:settings.sipsPerRound};
    const next=[...entriesRef.current,item];entriesRef.current=next;setEntries(next);
    try{await saveEntries(next)}catch(e){Alert.alert('Erro','Não foi possível salvar o registro.')}
  };
  const undo=async()=>{
    const next=[...entriesRef.current];
    for(let i=next.length-1;i>=0;i--){if(next[i].day===today){next.splice(i,1);break}}
    entriesRef.current=next;setEntries(next);
    try{await saveEntries(next)}catch(e){Alert.alert('Erro','Não foi possível desfazer.')}
  };
  const apply=async(next)=>{
    const error=validateSettings(next);
    if(error){Alert.alert('Confira os ajustes',error);return}
    setBusy(true);
    try {
      if(next.notificationsEnabled&&!(await requestNotificationPermission())){Alert.alert('Permissão necessária','Autorize as notificações nas configurações do telefone.');return}
      await syncReminders(next);
      await saveSettings(next);
      settingsRef.current=next;setSettings(next);setDraft(next);
      Alert.alert('Prontinho','Suas preferências foram salvas.');
    }catch(e){Alert.alert('Não foi possível salvar',e.message||'Tente novamente.')}
    finally{setBusy(false)}
  };
  if(!ready)return <View style={s.center}><Text style={s.title}>Preparando suas gotinhas…</Text></View>;
  const days=Array.from({length:7},(_,i)=>shiftLocalDay(now,i-6));
  return <View style={s.screen}>
    <View style={s.top}><Text style={s.brand}>gota<Text style={{color:colors.teal}}>a</Text>gota</Text><Text style={s.mini}>💧 UM DIA DE CADA VEZ</Text></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {tab==='hoje'&&<>
      <Text style={s.kicker}>SEU RITMO, SEM PRESSA</Text>
      <Heading>Olá, vamos hidratar?</Heading>
      <Text style={s.muted}>{now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</Text>
      <View style={s.hero}><Text style={s.heroKicker}>SEU DESAFIO DE AGORA</Text><Text style={s.count}>{settings.sipsPerRound} <Text style={s.countLabel}>goladas</Text></Text><Text style={s.heroText}>Pelo canudo, com calma e sem pressa.</Text>
      <Button label={'✓  Bebi minhas '+settings.sipsPerRound+' goladas'} onPress={record} secondary/>
      <Text style={s.heroFooter}>{settings.notificationsEnabled?'Próximo lembrete: '+getNextReminder(times,now):'Ative os lembretes em Ajustes'}</Text></View>
      <Card><Text style={s.kicker}>PROGRESSO DO DIA</Text><Text style={s.section}>Pequenas conquistas</Text><View style={s.bar}><View style={[s.fill,{width:times.length?Math.min(100,todayEntries.length/times.length*100)+'%':'0%'}]}/></View>
      <Text style={s.muted}>{todayEntries.length} de {times.length} pausas planejadas</Text><View style={s.stats}><View><Text style={s.stat}>{sum}</Text><Text style={s.muted}>goladas hoje</Text></View><View><Text style={s.stat}>{todayEntries.length}</Text><Text style={s.muted}>pausas feitas</Text></View></View>
      {todayEntries.length>0&&<Pressable onPress={undo}><Text style={s.link}>↶ Desfazer último registro</Text></Pressable>}</Card>
      <Card><Text style={s.section}>🥤 Seu copão de 2 litros</Text><Text style={s.muted}>Cada golada tem um volume diferente. Este app acompanha o hábito, não transforma goladas em mililitros.</Text></Card>
      <Card><Text style={s.section}>Horários de hoje</Text>{times.map(t=><View key={t} style={s.timeRow}><Text style={s.time}>{t}</Text><Text style={s.muted}>{settings.sipsPerRound} goladas</Text></View>)}</Card>
      <Text style={s.footer}>Se sentir sede, beba água mesmo fora dos horários. Não force água para completar o registro.</Text>
    </>}
    {tab==='historico'&&<>
      <Text style={s.kicker}>SEU HISTÓRICO</Text><Heading>Cada gota conta.</Heading><Text style={s.muted}>Seus últimos sete dias</Text>
      <Card>{days.map(date=>{const day=localDateKey(date);const list=entries.filter(e=>e.day===day);return <View key={day} style={s.historyRow}><Text style={s.historyDate}>{date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</Text><Text style={s.muted}>{list.length} pausas</Text><Text style={s.historyCount}>{list.reduce((n,e)=>n+e.sips,0)} goladas</Text></View>})}</Card>
      <Text style={s.footer}>Os registros mostram goladas e pausas, não litros consumidos.</Text>
    </>}
    {tab==='ajustes'&&<>
      <Text style={s.kicker}>DO SEU JEITO</Text><Heading>Seus lembretes</Heading><Text style={s.muted}>Escolha como prefere se hidratar.</Text>
      <Card><View style={s.toggle}><View style={{flex:1}}><Text style={s.section}>Notificações no celular</Text><Text style={s.muted}>Receba lembretes diariamente.</Text></View><Switch value={settings.notificationsEnabled} onValueChange={v=>apply({...settings,notificationsEnabled:v})} disabled={busy}/></View></Card>
      <Card><Text style={s.section}>Horários</Text><View style={s.inputs}><View style={{flex:1}}><Text style={s.label}>Começar</Text><TextInput style={s.input} value={draft.startTime} onChangeText={v=>setDraft({...draft,startTime:v})} maxLength={5} placeholder="08:00" keyboardType="numbers-and-punctuation"/></View><View style={{flex:1}}><Text style={s.label}>Terminar</Text><TextInput style={s.input} value={draft.endTime} onChangeText={v=>setDraft({...draft,endTime:v})} maxLength={5} placeholder="21:00" keyboardType="numbers-and-punctuation"/></View></View>
      <Choice label="Intervalo entre lembretes (minutos)" values={intervals} value={draft.intervalMinutes} onChange={v=>setDraft({...draft,intervalMinutes:v})}/>
      <Choice label="Goladas em cada pausa" values={sipOptions} value={draft.sipsPerRound} onChange={v=>setDraft({...draft,sipsPerRound:v})}/>
      <Button label="Salvar ajustes" disabled={busy} onPress={()=>apply(draft)}/></Card>
      <Button label="Enviar notificação de teste" secondary onPress={async()=>{try{await scheduleTestNotification(settings.sipsPerRound);Alert.alert('Teste agendado','Confira seu celular em cerca de 5 segundos.')}catch(e){Alert.alert('Erro',e.message||'Falha ao agendar teste.')}}}/>
      <Text style={s.footer}>Os lembretes usam o horário local do aparelho e dependem das permissões do sistema.</Text>
    </>}
    </ScrollView>
    <View style={s.nav}>{[['hoje','⌂','Hoje'],['historico','▥','Histórico'],['ajustes','⚙','Ajustes']].map(([key,symbol,label])=><Pressable key={key} onPress={()=>setTab(key)} accessibilityRole="tab" accessibilityState={{selected:tab===key}} style={s.navItem}><Text style={s.navSymbol}>{symbol}</Text><Text style={[s.navText,tab===key&&{color:colors.teal,fontWeight:'800'}]}>{label}</Text></Pressable>)}</View>
  </View>;
}
export default function App(){return <SafeAreaProvider><StatusBar barStyle="dark-content"/><SafeAreaView edges={['top','bottom']} style={{flex:1,backgroundColor:colors.bg}}><AppContent/></SafeAreaView></SafeAreaProvider>}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.bg},center:{flex:1,justifyContent:'center',alignItems:'center'},
 top:{height:63,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:colors.line},
 brand:{fontSize:25,fontWeight:'900',color:colors.ink,letterSpacing:-1.5},mini:{fontSize:9,color:colors.dark,fontWeight:'800'},
 content:{padding:20,gap:17,paddingBottom:40},kicker:{fontSize:11,letterSpacing:1.4,color:colors.teal,fontWeight:'800'},title:{fontSize:28,color:colors.ink,fontWeight:'900'},
 section:{fontSize:18,fontWeight:'800',color:colors.ink,marginBottom:6},muted:{fontSize:13,color:colors.muted,lineHeight:20},
 hero:{backgroundColor:colors.dark,borderRadius:26,padding:25,gap:14},heroKicker:{fontSize:11,color:'#AFE8F1',fontWeight:'800',letterSpacing:1.5},
 count:{fontSize:77,color:'#fff',fontWeight:'900'},countLabel:{fontSize:24},heroText:{fontSize:14,color:'#CBE9F1'},heroFooter:{fontSize:12,color:'#CBE9F1',textAlign:'center'},
 button:{backgroundColor:colors.dark,padding:17,borderRadius:15,alignItems:'center',marginTop:9},buttonSecondary:{backgroundColor:colors.light},buttonText:{fontSize:14,color:'#fff',fontWeight:'900'},
 card:{backgroundColor:'#fff',borderRadius:22,padding:20,gap:10,borderWidth:1,borderColor:colors.line},
 bar:{height:10,borderRadius:10,backgroundColor:colors.light,overflow:'hidden',marginTop:12},fill:{height:'100%',backgroundColor:'#2EABC1'},
 stats:{flexDirection:'row',justifyContent:'space-around',marginVertical:10},stat:{fontSize:27,fontWeight:'900',color:colors.ink},link:{color:colors.teal,fontWeight:'800',textAlign:'center',marginTop:8},
 timeRow:{paddingVertical:12,flexDirection:'row',gap:20,borderBottomWidth:1,borderColor:colors.line},time:{width:50,fontWeight:'800',color:colors.ink},
 footer:{fontSize:12,color:colors.muted,textAlign:'center',lineHeight:19},nav:{height:68,backgroundColor:'#fff',borderTopWidth:1,borderColor:colors.line,flexDirection:'row'},
 navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4},navSymbol:{fontSize:23,color:colors.teal},navText:{fontSize:11,color:colors.muted},
 historyRow:{flexDirection:'row',justifyContent:'space-between',gap:4,alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderColor:colors.line},
 historyDate:{fontSize:12,color:colors.ink,fontWeight:'800',width:95},historyCount:{fontSize:12,color:colors.dark,fontWeight:'800'},
 toggle:{flexDirection:'row',alignItems:'center'},inputs:{flexDirection:'row',gap:14,marginBottom:15},label:{fontSize:12,color:colors.ink,fontWeight:'800',marginBottom:9},
 input:{borderColor:colors.line,borderWidth:1.5,borderRadius:12,padding:12,fontSize:17,fontWeight:'700',color:colors.ink},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:18},choice:{backgroundColor:'#F1F7F9',borderRadius:12,paddingHorizontal:14,paddingVertical:12},
 choiceActive:{backgroundColor:colors.dark},choiceText:{fontWeight:'800',fontSize:12,color:colors.muted}
});
