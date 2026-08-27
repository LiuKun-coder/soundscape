/* =============================================================
   声屿 Soundscape · 声音引擎
   全部声音由 Web Audio API 实时合成，无任何外部音频资源
   ============================================================= */
"use strict";

const SOUNDS = [
  {
    id:"rain", name:"雨声", emoji:"🌧️", accent:[120,167,255],
    desc:"雨水敲窗，静静发呆",
    create(ctx){ return new Rain(ctx); }
  },
  {
    id:"waves", name:"海浪", emoji:"🌊", accent:[94,204,215],
    desc:"潮起潮落，缓慢呼吸",
    create(ctx){ return new Waves(ctx); }
  },
  {
    id:"fire", name:"壁炉", emoji:"🪵", accent:[255,156,102],
    desc:"柴火噼啪，暖融融",
    create(ctx){ return new Fire(ctx); }
  },
  {
    id:"cafe", name:"咖啡馆", emoji:"☕", accent:[206,170,128],
    desc:"人声低语，城市体温",
    create(ctx){ return new Cafe(ctx); }
  },
  {
    id:"forest", name:"深夜林", emoji:"🌲", accent:[110,194,124],
    desc:"虫鸣夜风，月下树影",
    create(ctx){ return new Forest(ctx); }
  },
  {
    id:"fan", name:"风扇", emoji:"🌀", accent:[158,172,196],
    desc:"均匀白噪，隔绝杂念",
    create(ctx){ return new Fan(ctx); }
  },
];
const SND = Object.fromEntries(SOUNDS.map(s=>[s.id,s]));

/* ---------- 基础工具：噪声 buffer / 循环源 ---------- */
function makeWhiteBuffer(ctx){
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
  return buf;
}
function makePinkBuffer(ctx){
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<len;i++){
    const w = Math.random()*2-1;
    b0 = .99886*b0 + w*.0555179;
    b1 = .99332*b1 + w*.0750759;
    b2 = .96900*b2 + w*.1538520;
    b3 = .86650*b3 + w*.3104856;
    b4 = .55000*b4 + w*.5329522;
    b5 = -.7616*b5 - w*.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*.5362)*.12;
    b6 = w*.115926;
  }
  return buf;
}
function noise(ctx, kind){
  const src = ctx.createBufferSource();
  src.buffer = kind==="pink" ? makePinkBuffer(ctx) : makeWhiteBuffer(ctx);
  src.loop = true;
  return src;
}

/* 基类：统一淡入淡出、音量 */
class Sound {
  constructor(ctx){
    this.ctx = ctx;
    this.out = ctx.createGain();            // → master
    this.out.gain.value = 0;
    this.vol = 1;                            // 用户音量 0..1
    this.out.connect(ctx.master);
  }
  setVolume(v){ this.vol = v; this.internalSetTarget(this.out.gain, v, .08); }
  internalSetTarget(param, v, t){ param.setTargetAtTime(v, this.ctx.currentTime, t); }
  fadeIn(){
    if(!this.inited){ this.init(); this.inited = true; }
    this.ctx.resume && this.ctx.resume();
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.internalSetTarget(this.out.gain, this.vol, .35);  // 舒缓淡入
  }
  fadeOut(){
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value || this.vol, t);
    this.internalSetTarget(this.out.gain, 0, .5);
    this.afterWin = setTimeout(()=>{ try{ this.dispose(); }catch(e){} }, 1800);
  }
  dispose(){ try{ this.out.disconnect(); }catch(e){} }
}

/* 雨声：柔和低通雨幕 + 高频水珠闪烁 */
class Rain extends Sound {
  init(){
    const c=this.ctx;
    const n1=noise(c,"white");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1100; lp.Q.value=.4;
    const g=c.createGain(); g.gain.value=.5;
    n1.connect(lp).connect(g).connect(this.out);

    const n2=noise(c,"white");
    const bp=c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=2200; bp.Q.value=.9;
    const g2=c.createGain();
    const lfo=c.createOscillator(); lfo.frequency.value=1.7;
    const lfoG=c.createGain(); lfoG.gain.value=0.045;
    lfo.connect(lfoG).connect(g2.gain); g2.gain.value=.12;
    n2.connect(bp).connect(g2).connect(this.out);
    n1.start(); n2.start(); lfo.start();
    this.live=[n1,n2,lfo];
  }
  dispose(){ this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose(); }
}

/* 海浪：低频浪涌 + LFO 起伏 + 水花高音 */
class Waves extends Sound {
  init(){
    const c=this.ctx;
    const n=noise(c,"pink");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=420; lp.Q.value=.6;
    const g=c.createGain(); g.gain.value=.55;
    n.connect(lp).connect(g).connect(this.out);

    const lfo=c.createOscillator(); lfo.frequency.value=.09;
    const lfoG=c.createGain(); lfoG.gain.value=.4;
    lfo.connect(lfoG).connect(g.gain);            // 浪潮缓慢起伏

    const n2=noise(c,"white");
    const bp=c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=900; bp.Q.value=2.2;
    const g2=c.createGain(); g2.gain.value=.05;    // 浪花碎拍
    const lfo2=c.createOscillator(); lfo2.frequency.value=.13;
    const lg2=c.createGain(); lg2.gain.value=.05;
    lfo2.connect(lg2).connect(g2.gain);
    n2.connect(bp).connect(g2).connect(this.out);
    n.start(); n2.start(); lfo.start(); lfo2.start();
    this.live=[n,n2,lfo,lfo2];
  }
  dispose(){ this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose(); }
}

/* 壁炉：低频火焰基底 + 随机爆裂声 */
class Fire extends Sound {
  init(){
    const c=this.ctx;
    const n=noise(c,"pink");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=210; lp.Q.value=.5;
    const g=c.createGain(); g.gain.value=.5;
    const lfo=c.createOscillator(); lfo.frequency.value=.5;
    const lg=c.createGain(); lg.gain.value=.06;
    lfo.connect(lg).connect(g.gain);
    n.connect(lp).connect(g).connect(this.out);
    n.start(); lfo.start();

    const crackle=()=>{
      if(!this.running) return;
      const dur=.02+Math.random()*.07;
      const src=c.createBufferSource();
      const len=Math.floor(c.sampleRate*dur);
      const buf=c.createBuffer(1,len,c.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
      src.buffer=buf;
      const bp=c.createBiquadFilter(); bp.type="bandpass";
      bp.frequency.value=1400+Math.random()*2600; bp.Q.value=3;
      const cg=c.createGain(); cg.gain.value=.03+Math.random()*.09;
      src.connect(bp).connect(cg).connect(this.out);
      src.start();
      setTimeout(()=>{try{src.stop()}catch(e){}}, (dur+.05)*1000);
      this.cT=setTimeout(crackle, 60+Math.random()*190);
    };
    crackle();
    this.live=[n,lfo]; this.cT=null; this.running=true;
  }
  dispose(){
    this.running=false; clearTimeout(this.cT);
    this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose();
  }
}

/* 咖啡馆：人声嗡嗡低频 + 环境噪声 + LFO 生命感 */
class Cafe extends Sound {
  init(){
    const c=this.ctx;
    const n=noise(c,"white");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1050; lp.Q.value=.4;
    const g=c.createGain(); g.gain.value=.42;
    n.connect(lp).connect(g).connect(this.out);

    const p=noise(c,"pink");
    const lp2=c.createBiquadFilter(); lp2.type="lowpass"; lp2.frequency.value=320; lp2.Q.value=1.6;
    const g2=c.createGain(); g2.gain.value=.22;
    const lfo=c.createOscillator(); lfo.frequency.value=.22;
    const lg=c.createGain(); lg.gain.value=.07;
    lfo.connect(lg).connect(g2.gain);
    p.connect(lp2).connect(g2).connect(this.out);
    n.start(); p.start(); lfo.start();
    this.live=[n,p,lfo];
  }
  dispose(){ this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose(); }
}

/* 深夜林：夜风低频 + 蟋蟀颤鸣 */
class Forest extends Sound {
  init(){
    const c=this.ctx;
    const p=noise(c,"pink");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=240; lp.Q.value=.7;
    const g=c.createGain(); g.gain.value=.42;
    const lfo=c.createOscillator(); lfo.frequency.value=.08;
    const lg=c.createGain(); lg.gain.value=.06;
    lfo.connect(lg).connect(g.gain);
    p.connect(lp).connect(g).connect(this.out);
    p.start(); lfo.start();

    // 两只蟋蟀，一左一右
    const chirp=(freq, phase, trem)=>{
      const o=c.createOscillator(); o.type="sine"; o.frequency.value=freq;
      const o2=c.createOscillator(); o2.type="sine"; o2.frequency.value=freq*1.06;
      const bp=c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=Math.min(freq*2.2,9000); bp.Q.value=6;
      const cg=c.createGain(); cg.gain.value=0;
      o.connect(bp); o2.connect(bp); bp.connect(cg); cg.connect(this.out);
      // 门控：慢速 LFO 开关蟋蟀声
      const gate=c.createOscillator(); gate.frequency.value=.5+Math.random()*.3;
      const gateG=c.createGain(); gateG.gain.value=.045;
      gate.connect(gateG).connect(cg.gain);
      // 颤音
      const tremO=c.createOscillator(); tremO.frequency.value=22+phase;
      const tremG=c.createGain(); tremG.gain.value=.035;
      tremO.connect(tremG).connect(cg.gain);
      cg.gain.value=.05;
      o.start(); o2.start(); gate.start(); tremO.start();
      return [o,o2,gate,tremO];
    };
    const liveC=chirp(4200, 0).concat(chirp(4600, 90));
    this.live=[p,lfo].concat(liveC);
  }
  dispose(){ this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose(); }
}

/* 风扇：均匀低沉白噪 + 叶片节律 */
class Fan extends Sound {
  init(){
    const c=this.ctx;
    const n=noise(c,"white");
    const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=760; lp.Q.value=.9;
    const g=c.createGain(); g.gain.value=.5;
    const lfo=c.createOscillator(); lfo.frequency.value=3.2;
    const lg=c.createGain(); lg.gain.value=.09;
    lfo.connect(lg).connect(g.gain);
    n.connect(lp).connect(g).connect(this.out);
    n.start(); lfo.start();
    this.live=[n,lfo];
  }
  dispose(){ this.live.forEach(n=>{try{n.stop()}catch(e){}}); super.dispose(); }
}