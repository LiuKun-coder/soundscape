/* =============================================================
   声屿 Soundscape · 声音引擎
   播放现成高质量音频（无损 WAV，无缝循环），来自 Mixkit 免费可商用素材
   https://mixkit.co/license/#sfxFree
   ============================================================= */
"use strict";

const SOUNDS = [
  {
    id:"rain", name:"雨声", emoji:"🌧️", accent:[120,167,255],
    desc:"雨水敲窗，静静发呆",
    file:"assets/sounds/rain-loop.wav"
  },
  {
    id:"waves", name:"海浪", emoji:"🌊", accent:[94,204,215],
    desc:"潮起潮落，缓慢呼吸",
    file:"assets/sounds/sea-waves.wav"
  },
  {
    id:"fire", name:"壁炉", emoji:"🪵", accent:[255,156,102],
    desc:"柴火噼啪，暖融融",
    file:"assets/sounds/campfire.wav"
  },
  {
    id:"cafe", name:"咖啡馆", emoji:"☕", accent:[206,170,128],
    desc:"人声低语，城市体温",
    file:"assets/sounds/cafe-ambience.wav"
  },
  {
    id:"forest", name:"深夜林", emoji:"🌲", accent:[110,194,124],
    desc:"虫鸣夜风，月下树影",
    file:"assets/sounds/summer-night-forest.wav"
  },
  {
    id:"fan", name:"风扇", emoji:"🌀", accent:[158,172,196],
    desc:"均匀气流，隔绝杂念",
    file:"assets/sounds/fan-hum.wav"
  },
];
const SND = Object.fromEntries(SOUNDS.map(s=>[s.id,s]));

/* ---------- 声音实例（按文件缓存，全局复用） ---------- */
const audioCache = new Map();   // file -> BufferSound

function soundFor(id, ctx){
  const s=SND[id];
  if(!audioCache.has(s.file)){
    audioCache.set(s.file, new BufferSound(ctx, s.file));
  }
  return audioCache.get(s.file);
}

/* ---------- 基于 AudioBuffer 的循环播放器 ---------- */
class BufferSound {
  constructor(ctx, url){
    this.ctx = ctx;
    this.url = url;
    this.out = ctx.createGain();          // → master
    this.out.gain.value = 0;
    this.vol = 1;                          // 用户音量 0..1
    this.out.connect(ctx.master);
    this.buffer = null;
    this.bufPromise = null;
    this.src = null;
    this.playing = false;
  }
  /* 拉取并解码音频（结果缓存，只做一次） */
  load(){
    if(this.buffer) return Promise.resolve(this.buffer);
    if(!this.bufPromise){
      this.bufPromise = fetch(this.url)
        .then(r=>{ if(!r.ok) throw new Error(`audio ${r.status}`); return r.arrayBuffer(); })
        .then(ab=>this.ctx.decodeAudioData(ab))
        .then(b=>{ this.buffer=b; return b; })
        .catch(err=>{ this.bufPromise=null; throw err; });
    }
    return this.bufPromise;
  }
  /* 立即用已解码数据开始循环播放（入口统一走 fadeIn） */
  play(){
    if(!this.buffer || this.playing) return;
    this.playing = true;
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffer;
    s.loop = true;
    s.connect(this.out);
    s.start();
    this.src = s;
    this.ctx.resume && this.ctx.resume();
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.internalSetTarget(this.out.gain, this.vol, .35);   // 舒缓淡入
  }
  fadeIn(){
    this.ctx.resume && this.ctx.resume();
    if(this.buffer){ this.play(); return; }
    this.load()
      .then(()=>this.play())
      .catch(err=>console.warn("音频加载失败:", this.url, err));
  }
  setVolume(v){
    this.vol = v;
    this.internalSetTarget(this.out.gain, v, .08);
  }
  fadeOut(){
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value || this.vol, t);
    this.internalSetTarget(this.out.gain, 0, .5);           // 淡出 1.5 秒
    this.afterWin = setTimeout(()=>{ try{ this.stop(); }catch(e){} }, 1800);
  }
  stop(){
    try{
      if(this.src){ this.src.stop(); this.src.disconnect(); this.src=null; }
    }catch(e){}
    this.playing = false;
    this.out.disconnect();
  }
  internalSetTarget(param, v, t){ param.setTargetAtTime(v, this.ctx.currentTime, t); }
}

/* 后台预加载全部声音，让点击时秒开（首次创建 AudioContext 后调用） */
function preloadAll(ctx){
  SOUNDS.forEach(s=>{
    soundFor(s.id, ctx).load().catch(()=>{});
  });
}