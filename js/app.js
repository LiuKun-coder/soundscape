/* =============================================================
   声屿 Soundscape · 应用逻辑
   状态管理、播放控制、音量拖拽、定时关闭
   ============================================================= */
"use strict";

const els = {
  body: document.body, phone: document.getElementById("phone"),
  dial: document.getElementById("dial"), dialEmoji: document.getElementById("dialEmoji"),
  dialName: document.getElementById("dialName"), dialSub: document.getElementById("dialSub"),
  fab: document.getElementById("fab"), sounds: document.getElementById("sounds"),
  npEmoji: document.getElementById("npEmoji"), npTitle: document.getElementById("npTitle"),
  npSub: document.getElementById("npSub"), soloBtn: document.getElementById("soloBtn"),
  timerBtn: document.getElementById("timerBtn"), timerLabel: document.getElementById("timerLabel"),
  sheet: document.getElementById("sheet"), sheetMask: document.getElementById("sheetMask"),
  sheetHint: document.getElementById("sheetHint"), sheetOpts: document.getElementById("sheetOpts"),
  ringVal: document.getElementById("ringVal"),
};

let ctx=null, master=null;
const active = new Map();          // id -> {sound, el}
let primary = null;                // 主显示声音 id
let lastPlayed="rain";             // 空状态点圆盘时的默认声音
let timerSetting = "inf";          // 15/30/60/inf
let timerEnd = 0, timerInterval=null, timerFading=false;

function ensureCtx(){
  if(!ctx){
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value=.9;
    master.connect(ctx.destination);
    ctx.master = master;
  }
  if(ctx.state==="suspended") ctx.resume();
  return ctx;
}

/* ---------- 声音卡片渲染 ---------- */
function buildGrid(){
  els.sounds.innerHTML = "";
  SOUNDS.forEach(s=>{
    const el=document.createElement("div");
    el.className="snd"; el.setAttribute("role","button"); el.tabIndex=0;
    el.dataset.id=s.id;
    el.innerHTML = `
      <span class="ic">${s.emoji}</span>
      <span class="lab">${s.name}</span>
      <div class="vol-wrap"><div class="vol-rail"><div class="vol-fill"></div><div class="vol-knob"></div></div></div>`;
    el.addEventListener("click",()=>toggle(s.id));
    el.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(s.id);} });
    // 音量滑杆：大命中区 + 支持按住拖拽
    const vw=el.querySelector(".vol-wrap");
    attachVolDrag(s, vw);
    els.sounds.appendChild(el);
    s._volFill=vw.querySelector(".vol-fill"); s._knob=vw.querySelector(".vol-knob");
  });
}
function attachVolDrag(s, vw){
  const move=e=>{
    const r=vw.getBoundingClientRect();
    let v=(e.clientX-r.left)/r.width;
    v=Math.min(1,Math.max(0,v));
    s.vol=v;
    const act=active.get(s.id); if(act){ act.sound.setVolume(v); }
    paintVolSlot(s);
  };
  vw.addEventListener("pointerdown",e=>{
    e.preventDefault(); e.stopPropagation();
    try{ vw.setPointerCapture(e.pointerId); }catch(err){}
    move(e);
    vw.addEventListener("pointermove",move);
    vw.addEventListener("pointerup",()=>vw.removeEventListener("pointermove",move),{once:true});
    vw.addEventListener("pointercancel",()=>vw.removeEventListener("pointermove",move),{once:true});
  });
}
function paintVolSlot(s){
  if(!s._volFill) return;
  s._volFill.style.width=(s.vol*100)+"%";
  s._knob.style.left=(s.vol*100)+"%";
}

/* ---------- 播放控制 ---------- */
function applyAccent(id){
  const a=SND[id].accent;
  document.documentElement.style.setProperty("--accent-rgb", a.join(","));
  els.phone.style.background =
    `radial-gradient(560px 420px at 50% 118%, rgba(${a.join(",")},.16), transparent 65%)`;
  // 氛围背景色
  const tone = {
    rain:["#16233f","#0b0e14"], waves:["#0e2430","#0b0e14"], fire:["#2b1b12","#0b0e14"],
    cafe:["#241a12","#0b0e14"], forest:["#122418","#0b0e14"], fan:["#161c26","#0b0e14"]
  }[id];
  if(tone){ els.body.style.setProperty("--grad-a",tone[0]); els.body.style.setProperty("--grad-b",tone[1]); }
}
function toggle(id, forceOn){
  const s=SND[id];
  const wasOn=active.has(id);
  if(wasOn && forceOn!==true){
    active.get(id).sound.fadeOut();
    active.delete(id); s.el.classList.remove("on");
    if(primary===id) primary=null;   // 由 refreshDial 回退到其他活跃声音
  }
  else{
    const c=ensureCtx();
    let act=active.get(id);
    if(!act){
      const sound=s.create(c);
      act={sound, el:s.el}; active.set(id,act);
      sound.fadeIn();
    }
    s.el.classList.add("on");
    setPrimary(id);                   // 圆盘图标跟随最近激活的声音
    lastPlayed=id;
  }
  applyAccent(primary && active.has(primary) ? primary : currentAccent());
  refreshDial(); refreshNow();
}
function stopAll(){
  active.forEach(a=>a.sound.fadeOut());
  SOUNDS.forEach(s=>s.el&&s.el.classList.remove("on"));
  active.clear();
  primary=null;
  refreshDial(); refreshNow();
}
function currentAccent(){
  // 优先后激活的/仍播放的声音；都为空时用默认雨蓝
  if(active.size) return [...active.keys()][active.size-1];
  return "rain";
}
function setPrimary(id){ primary=id; applyAccent(id); }
function refreshDial(){
  const any=active.size>0;
  let id=null;
  if(any){
    id = (primary && active.has(primary)) ? primary : [...active.keys()][active.size-1];
    if(id!==primary){ setPrimary(id); }
  }
  els.dial.classList.toggle("play", any);
  if(id){
    const s=SND[id];
    els.dialEmoji.textContent=s.emoji;
    els.dialName.textContent=s.name;
    els.dialSub.textContent = any ? (active.size>1? `混合 ${active.size} 种声音` : s.desc) : "未播放";
  } else {
    els.dialEmoji.textContent="🔇";
    els.dialName.textContent="安静";
    els.dialSub.textContent="选择一个声音开始";
    els.body.style.setProperty("--grad-a","#16233f");
    els.body.style.setProperty("--grad-b","#0b0e14");
    els.phone.style.background="";
  }
}
function refreshNow(){
  const any=active.size>0;
  if(any){
    const names=[...active.keys()].map(k=>SND[k].name);
    els.npEmoji.textContent=SND[[...active.keys()][0]].emoji;
    els.npTitle.textContent=names.join(" + ");
    els.npSub.textContent=active.size>1?`混合 ${active.size} 种声音`:"可叠加更多声音 · 点击卡片";
  } else {
    els.npEmoji.textContent="✋";
    els.npTitle.textContent="尚未播放";
    els.npSub.textContent="点击上方的声音卡片";
  }
}

/* ---------- 主圆盘 ---------- */
els.dial.addEventListener("click",()=>{
  if(timerFading) return;
  if(active.size){ stopAll(); }
  else{
    // 空状态：一键开启上次声音，没有则默认雨声
    ensureCtx();
    toggle(lastPlayed || "rain", true);
  }
});
els.dial.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault(); els.dial.click();} });
els.fab.addEventListener("click",e=>{ e.stopPropagation(); stopAll(); });
els.fab.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault(); els.fab.click();} });

/* ---------- DSP：只保留一个声音 ---------- */
els.soloBtn.addEventListener("click",()=>{
  if(active.size<=1) return;
  const keep=[...active.keys()][active.size-1];
  [...active.keys()].forEach(k=>{ if(k!==keep) toggle(k); });
  refreshDial(); refreshNow();
});

/* ---------- 定时关闭 ---------- */
els.timerBtn.addEventListener("click",openSheet);
els.sheetMask.addEventListener("click",closeSheet);
function openSheet(){
  const opts=[["15","15 分钟"],["30","30 分钟"],["60","60 分钟"],["inf","无限"]];
  els.sheetOpts.innerHTML=opts.map(([v,lab])=>
    `<div class="opt ${timerSetting===v?"sel":""}" data-v="${v}">${lab}</div>`).join("");
  els.sheetOpts.querySelectorAll(".opt").forEach(o=>{
    o.addEventListener("click",()=>{
      timerSetting=o.dataset.v;
      syncTimerUI(); closeSheet();
    });
  });
  els.sheet.classList.add("show");
}
function closeSheet(){ els.sheet.classList.remove("show"); }
function syncTimerUI(){
  const lab={15:"15 分钟",30:"30 分钟",60:"60 分钟",inf:"无限"}[timerSetting];
  els.timerLabel.textContent=lab;
  els.timerBtn.classList.toggle("is-armed", timerSetting!=="inf");
  if(timerSetting==="inf"){ clearTimer(); }
  else { armTimer(); }
}
const CIRC=358.1;
function clearTimer(){
  clearInterval(timerInterval); timerInterval=null; timerEnd=0; timerFading=false;
  els.ringVal.style.strokeDashoffset=0;
  els.dial.classList.remove("show-ring");
  els.timerBtn.classList.remove("is-armed");
}
function armTimer(){
  clearInterval(timerInterval);
  const mins={15:15,30:30,60:60}[timerSetting]||15;
  timerEnd=Date.now()+mins*60000;
  els.dial.classList.add("show-ring");
  timerInterval=setInterval(tickTimer,1000);
  tickTimer();
}
function tickTimer(){
  const remain=timerEnd-Date.now();
  if(remain<=0){
    startFadeStop();
    return;
  }
  const total={15:15,30:30,60:60}[timerSetting]*60000;
  const frac=remain/total;
  els.ringVal.style.strokeDashoffset=String(CIRC*(1-frac));
}
function startFadeStop(){
  timerFading=true;
  clearInterval(timerInterval); timerInterval=null;
  // 缓缓淡出，8 秒后完全停止
  active.forEach(a=>{ a.sound.out.gain.setTargetAtTime(0, ctx.currentTime, 2.5); });
  els.dialSub.textContent="声音渐止，晚安 🌙";
  setTimeout(()=>{
    stopAll();
    els.dialSub.textContent="定时结束";
    timerFading=false;
    timerSetting="inf"; syncTimerUI();
  }, 9000);
}

/* ---------- 初始化 ---------- */
buildGrid();
SOUNDS.forEach(s=>{ s.el=document.querySelector(`.snd[data-id="${s.id}"]`); s.vol=.8; paintVolSlot(s); });
els.sheet.classList.remove("show");
applyAccent("rain");
refreshDial(); refreshNow();