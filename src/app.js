(() => {
  const $ = s => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language: the Chinese text is the key; 日本語 and English come from I18N (src/i18n.js) ---------- */
  const LANG = (() => {
    let pick = 'auto';
    try { pick = (JSON.parse(localStorage.getItem('keisaku-opts-v1')) || {}).lang || 'auto'; } catch (e) {}
    if (['zh', 'ja', 'en'].includes(pick)) return pick;
    for (const l of navigator.languages || [navigator.language || '']) {
      if (/^zh/i.test(l)) return 'zh';
      if (/^ja/i.test(l)) return 'ja';
      if (/^en/i.test(l)) return 'en';
    }
    return 'en';
  })();
  const DICT = (typeof I18N !== 'undefined' && I18N[LANG]) || {};
  // tr('第 {0} 炷', n): look the Chinese up, then fill in {0}, {1}… ({0|round|rounds} picks the word by the number)
  function tr(s, ...a) {
    let r = DICT[s];
    if (r == null) { r = s; if (LANG !== 'zh' && window.__i18nMiss) window.__i18nMiss.add(s); }
    if (!a.length) return r;
    return r.replace(/\{(\d)\|([^|}]*)\|([^}]*)\}/g, (m, i, one, many) => +a[i] === 1 ? one : many)   // {0|round|rounds}
      .replace(/\{(\d)\}/g, (m, i) => a[i]);
  }
  // the page's own text: an element whose words sit among inline tags (<b>, <small>…) is translated whole,
  // so word order can change; otherwise each piece of text on its own. Attributes people hear or see too.
  const INLINE = new Set(['b', 'i', 'small', 'br', 'strong', 'em', 'span', 'a', 'code', 'kbd']);
  const HAS_CJK = /[\u3400-\u9fff]/;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  function translateDom(node) {
    for (const el of node.children) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v && HAS_CJK.test(v)) el.setAttribute(a, tr(norm(v)));
      }
      const direct = [...el.childNodes].some(n => n.nodeType === 3 && HAS_CJK.test(n.nodeValue));
      if (direct && el.children.length && [...el.children].every(c => INLINE.has(c.tagName.toLowerCase()) && !c.id)) {
        const k = norm(el.innerHTML), v = tr(k);
        if (v !== k) el.innerHTML = v;
        continue;
      }
      if (direct) el.childNodes.forEach(n => {
        if (n.nodeType !== 3 || !HAS_CJK.test(n.nodeValue)) return;
        const k = norm(n.nodeValue), v = tr(k);
        if (v !== k) n.nodeValue = n.nodeValue.match(/^\s*/)[0] + v + n.nodeValue.match(/\s*$/)[0];   // keep the spaces around it
      });
      translateDom(el);
    }
  }
  if (LANG !== 'zh') {
    document.documentElement.lang = LANG;
    document.title = tr('香板禪堂');
    translateDom(document.body);
    document.documentElement.style.setProperty('--why', JSON.stringify(tr('為什麼?')));   // the 「為什麼?」 after the detection warning is CSS text
  }
  const monkEl = $('#monk'), stickEl = $('#stick'), stickLayer = $('#stickLayer'), sitterEl = $('#sitter');
  const bubbleEl = $('#bubble'), bubbleText = $('#bubbleText');
  const toastEl = $('#toast'), clockEl = $('#clock'), statusEl = $('#status');
  const mainBtn = $('#mainBtn'), askBtn = $('#askBtn'), leaveBtn = $('#leaveBtn'), backBtn = $('#backBtn');
  const PIVOT = '12 -38';
  const SITTER_X = 200, TEA_X = 190, HOST_X = 72, RACK_X = 375;
  const STAND = { x: -66, y: 14 };            // where the mochi stands (relative to the cushion) while checking in
  const DEFAULT_CFG = { task: tr('專注'), focusMin: 25, rounds: 4, breakMin: 5 };
  const MAX_PRESETS = 3;

  /* ---------- helpers ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function tween(from, to, ms, set, ease = t => t) {
    return new Promise(res => {
      const s = performance.now();
      (function step(n) {
        const t = Math.min(1, (n - s) / ms);
        set(from + (to - from) * ease(t));
        t < 1 ? requestAnimationFrame(step) : res();
      })(s);
    });
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  // a plan read back from storage or a backup is only used if every part of it is in range
  // (a preset of a billion rounds would otherwise try to draw a billion incense sticks)
  const validCfg = c => !!c && typeof c.task === 'string' && c.task.length > 0 && c.task.length <= 12
    && isInt(c.focusMin, 5, 120) && isInt(c.rounds, 1, 8) && isInt(c.breakMin, 0, 30);
  const loadLast = () => { const c = store.get('keisaku-last-v1', null); return validCfg(c) ? c : null; };
  const loadPresets = () => { const v = store.get('keisaku-presets-v1', []); return Array.isArray(v) ? v.filter(validCfg) : []; };
  const sameCfg = (a, b) => a && b && a.task === b.task && a.focusMin === b.focusMin && a.rounds === b.rounds && a.breakMin === b.breakMin;
  const cfgShort = c => tr('{0}・{1} 分 × {2} 炷', c.task, c.focusMin, c.rounds);
  const totalMin = c => c.focusMin * c.rounds + c.breakMin * (c.rounds - 1);

  /* ---------- sound (synthesized with Web Audio) ---------- */
  let ac = null;
  const soundOn = () => $('#optSound').checked;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function bell(delay = 0, vol = .22) {
    const a = audio(); if (!a || !soundOn()) return;
    const t = a.currentTime + delay;
    [[1, 1, 4.5], [2.42, .35, 2.4], [4.05, .14, 1.4], [.5, .12, 3]].forEach(([m, g, d]) => {
      const o = a.createOscillator(), v = a.createGain();
      o.type = 'sine'; o.frequency.value = 523 * m;
      v.gain.setValueAtTime(0, t);
      v.gain.linearRampToValueAtTime(vol * g, t + .008);
      v.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(v).connect(a.destination); o.start(t); o.stop(t + d + .1);
    });
  }
  const bells = n => { for (let i = 0; i < n; i++) bell(i * 1.5); };
  function slap() {
    const a = audio(); if (!a || !soundOn()) return;
    const t = a.currentTime, len = Math.floor(a.sampleRate * .14);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
    const n = a.createBufferSource(); n.buffer = buf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = .8;
    const g = a.createGain(); g.gain.value = .9;
    n.connect(bp).connect(g).connect(a.destination); n.start(t);
    const o = a.createOscillator(), v = a.createGain();
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(70, t + .12);
    v.gain.setValueAtTime(.5, t); v.gain.exponentialRampToValueAtTime(.001, t + .15);
    o.connect(v).connect(a.destination); o.start(t); o.stop(t + .2);
  }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

  /* ---------- background sounds (all synthesized, so they work offline) ---------- */
  /*SND-START*/
  // tunable knobs (the sound-lab page edits these live)
  const SND = {
    rainBed: .04, dropGain: 5, dropGapMin: 3, dropGapMax: 70,
    waveCrash: 1, waveBackMin: 7, waveBackMax: 11,
    leafVol: .03, frogVol: .04,
    chimeRing: .35, chimeVerb: .48, gustChance: .34, gustKnocksMin: 4, gustKnocksMax: 17, chimeOctave: 2
  };
  const AMBIENT_LABEL = { none: tr('不播放'), rain: tr('雨聲'), waves: tr('海浪'), forest: tr('森林'), chimes: tr('風鈴') };
  const noiseCache = {};
  // a few seconds of white / pink / brown noise, looped
  function noiseBuffer(a, color) {
    if (noiseCache[color]) return noiseCache[color];
    const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'pink') {        // Paul Kellet's filter
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
      } else if (color === 'brown') {
        last = (last + .02 * w) / 1.02; d[i] = last * 3.5;
      } else d[i] = w * .5;
    }
    // cross-fade the seam so the loop doesn't click
    const fade = Math.floor(a.sampleRate * .05);
    for (let i = 0; i < fade; i++) { const k = i / fade; d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k; }
    return (noiseCache[color] = buf);
  }
  const Amb = { out: null, verb: null, nodes: [], timers: [], kind: 'none', playing: false };
  const ambientVolume = () => +$('#ambVol').value / 100;
  function lfo(a, rate, depth, param) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(param); o.start();
    Amb.nodes.push(o);
  }
  function noiseSource(a, color, ...chain) {
    const src = a.createBufferSource(); src.buffer = noiseBuffer(a, color); src.loop = true;
    src.loopStart = Math.random() * 3;   // so layers don't line up
    let n = src; for (const c of chain) n = n.connect(c);
    n.connect(Amb.out); src.start(0, src.loopStart); Amb.nodes.push(src);
    return src;
  }
  const filt = (a, type, freq, q = .7) => { const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
  const gainOf = (a, v) => { const g = a.createGain(); g.gain.value = v; return g; };
  // every event goes through a pan and is shared between a dry path and the room's reverb
  function place(a, node, pan, wet) {
    const p = a.createStereoPanner(); p.pan.value = pan;
    node.connect(p); p.connect(Amb.out);
    const s = gainOf(a, wet); p.connect(s).connect(Amb.verb);
  }
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const later = (fn, ms) => Amb.timers.push(setTimeout(() => { if (Amb.playing) fn(); }, ms));
  // schedule an irregular shape on a param as many short ramps (safe to cancel at any time)
  function shape(param, t, dur, values) {
    param.cancelScheduledValues(t); param.setValueAtTime(values[0], t);
    const step = dur / (values.length - 1);
    for (let i = 1; i < values.length; i++) param.linearRampToValueAtTime(values[i], t + i * step);
  }
  // a smoothed random walk between lo and hi
  function wander(n, lo, hi, smooth = .85) {
    const out = []; let v = Math.random(), s = v;
    for (let i = 0; i < n; i++) { v = Math.min(1, Math.max(0, v + (Math.random() - .5) * .4)); s = s * smooth + v * (1 - smooth); out.push(lo + (hi - lo) * s); }
    return out;
  }
  // a short filtered noise hit
  function burst(a, type, freq, q, vol, dur, pan, wet = .2, when = a.currentTime + .01) {
    const s = a.createBufferSource(), f = filt(a, type, freq, q), g = a.createGain();
    s.buffer = noiseBuffer(a, 'white');
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
    s.connect(f).connect(g); place(a, g, pan, wet); s.start(when, Math.random() * 3, dur + .02);
  }
  function blip(a, f0, f1, glide, vol, dur, pan, wet = .25, when = a.currentTime + .01, type = 'sine') {
    const o = a.createOscillator(), v = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f1, when + glide);
    v.gain.setValueAtTime(0, when); v.gain.linearRampToValueAtTime(vol, when + .003); v.gain.exponentialRampToValueAtTime(.0001, when + dur);
    o.connect(v); place(a, v, pan, wet); o.start(when); o.stop(when + dur + .02);
  }

  /* rain: many drops, mostly tiny, landing on different things */
  // each drop is a tiny resonant click (a ringing band of noise), not a pitched sweep — sweeps sound like birds
  const RAIN_ON = {
    leaf(a, l, p, k)   { burst(a, 'bandpass', rnd(2400, 5200), rnd(4, 9), (.01 + l * .16) * k, rnd(.008, .018), p, .2); },
    puddle(a, l, p, k) { burst(a, 'bandpass', rnd(700, 1400), rnd(6, 12), (.012 + l * .2) * k, rnd(.025, .045), p, .3);
                         burst(a, 'highpass', 4000, .7, (.003 + l * .04) * k, .012, p, .2); },
    wood(a, l, p, k)   { burst(a, 'bandpass', rnd(350, 650), rnd(2, 4), (.012 + l * .2) * k, rnd(.02, .035), p, .15); },
    gutter(a, l, p, k) { burst(a, 'bandpass', rnd(2600, 3600), 40, (.006 + l * .1) * k, .12, p, .4); }
  };
  /* forest birds: each resident bird has its own song, pitch and place */
  function song(a, b) {
    const bus = gainOf(a, b.far ? .4 : 1); place(a, bus, b.pan, b.far ? .7 : .3);
    const k = b.pitch, v = .045; let t = a.currentTime + .05;
    const n = (f1, f2, d, vol = v, vib = 0) => { tone(a, bus, t, f1 * k, f2 * k, d, vol, vib); };
    switch (b.song) {
      case 0: for (let i = 0, c = 2 + Math.floor(Math.random() * 3); i < c; i++) { n(3200, 4300, .07); t += rnd(.13, .2); } break;   // chip-chip
      case 1: n(3300, 2250, rnd(.35, .5), v * .9, 18); break;                                                                       // falling whistle
      case 2: n(3900, 3600, rnd(.5, .8), v * .6, 260); break;                                                                        // trill
      case 3: n(700, 690, .28, v * 1.3); t += .42; n(575, 565, .36, v * 1.3); break;                                                 // soft two-note call
      case 4: for (let i = 0, c = 6 + Math.floor(Math.random() * 5), f = 3000; i < c; i++) {                                         // warble
                const g = f * pick([.84, .89, 1.12, 1.19, 1.26]); n(f, g, .07, v * rnd(.6, 1)); f = Math.min(4600, Math.max(2400, g)); t += rnd(.07, .11); } break;
      case 5: n(2600, 3500, .16, v); t += .2; n(3400, 2500, .26, v); break;                                                         // tee-oo
      default: for (let i = 0; i < 3; i++) { n(3800, 3700, .09, v * .8); t += .14; n(3100, 3000, .1, v * .8); t += .26; }            // see-saw
    }
  }
  function tone(a, bus, t, f1, f2, dur, vol, vib = 0) {
    const o = a.createOscillator(), v = a.createGain();
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    if (vib) { const l = a.createOscillator(), lg = gainOf(a, vib); l.frequency.value = rnd(22, 32); l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur); }
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol, t + Math.min(.02, dur / 4));
    v.gain.setValueAtTime(vol, t + dur * .6); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(v).connect(bus); o.start(t); o.stop(t + dur + .02);
  }
  function cricket(a, pan, when) {          // one chirp: 3-4 quick pulses of a high tone
    for (let i = 0, c = 3 + (Math.random() < .5); i < c; i++) {
      const o = a.createOscillator(), v = a.createGain(), t = when + i * .032;
      o.frequency.value = 4500; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.012, t + .004); v.gain.linearRampToValueAtTime(0, t + .018);
      o.connect(v); place(a, v, pan, .45); o.start(t); o.stop(t + .02);
    }
  }
  // a gust passing through the trees: a smooth swell of air, leaves rustling on top, moving across
  function rustle(a) {
    const t = a.currentTime + .05, dur = rnd(3, 6), from = Math.random() < .5 ? -.8 : .8;
    const pan = a.createStereoPanner(); pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(-from * rnd(.4, 1), t + dur);
    pan.connect(Amb.out); pan.connect(gainOf(a, .25)).connect(Amb.verb);
    const swell = x => Math.pow(Math.sin(Math.PI * x), 1.6);                      // 0..1 over the gust
    // the air: a soft band of noise whose centre rises and falls with the gust
    const air = a.createBufferSource(), abp = filt(a, 'bandpass', 700, .6), ag = a.createGain();
    air.buffer = noiseBuffer(a, 'pink');
    const N = 50, ga = [], fa = [];
    for (let i = 0; i <= N; i++) { const e = swell(i / N); ga.push(.0001 + e * SND.leafVol * .9); fa.push(600 + e * rnd(900, 1500)); }
    shape(ag.gain, t, dur, ga); shape(abp.frequency, t, dur, fa);
    air.connect(abp).connect(ag).connect(pan); air.start(t, Math.random() * 3, dur + .05);
    // the leaves: quick little flutters riding on the swell
    const lv = a.createBufferSource(), lg = a.createGain();
    lv.buffer = noiseBuffer(a, 'white');
    const M = 140, gl = [];
    for (let i = 0; i <= M; i++) { const e = swell(i / M); gl.push(.0001 + e * e * Math.pow(Math.random(), 2) * SND.leafVol * .7); }
    shape(lg.gain, t, dur, gl);
    lv.connect(filt(a, 'bandpass', rnd(4500, 6500), .7)).connect(filt(a, 'highpass', 3000)).connect(lg).connect(pan);
    lv.start(t, Math.random() * 3, dur + .05);
  }
  /* tuned wind chime: aluminium tubes in a chord, long ring, rich partials */
  const TUBES = [1174.7, 1318.5, 1480, 1760, 1975.5, 2349.3];   // D6 E6 F#6 A6 B6 D7 — small, bright tubes
  function tube(a, f, when, vel, pan) {
    const bus = gainOf(a, 1); place(a, bus, pan, SND.chimeVerb);
    [[1, 1, 4.2], [1.0021, .4, 3.6], [2.756, .38, 1.6], [5.404, .14, .7], [8.933, .05, .35]].forEach(([m, g, d]) => {
      if (f * m > 15000) return;
      const o = a.createOscillator(), v = a.createGain();
      o.frequency.value = f * m * (1 + rnd(-.001, .001));
      v.gain.setValueAtTime(0, when); v.gain.linearRampToValueAtTime(vel * g * .09, when + .002);
      const ring = d * SND.chimeRing * (.6 + vel * .6);
      v.gain.exponentialRampToValueAtTime(.0001, when + ring);
      o.connect(v).connect(bus); o.start(when); o.stop(when + ring + .05);
    });
  }

  // the moment a wave lands: a wide, bright crash with a low thud under it
  function crash(a, when, peak, pan) {
    const layer = (color, type, freq, q, vol, attack, decay) => {
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = noiseBuffer(a, color);
      g.gain.setValueAtTime(.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + attack);
      g.gain.exponentialRampToValueAtTime(.0001, when + attack + decay);
      s.connect(filt(a, type, freq, q)).connect(g); place(a, g, pan + rnd(-.2, .2), .35);
      s.start(when, Math.random() * 3, attack + decay + .1);
    };
    layer('pink', 'bandpass', rnd(1100, 1800), .5, peak * .45, .09, rnd(1.4, 2.2));   // the crash
    layer('white', 'bandpass', rnd(3000, 4200), .9, peak * .1, .06, rnd(.6, 1));     // spray
    layer('brown', 'lowpass', 170, .7, peak * .9, .07, rnd(.8, 1.2));                 // the thud
  }
  /* frogs: a call is a fast train of little resonant pulses, heard as "guk-guk" */
  function croak(a, f, pan, when, far) {
    const bus = gainOf(a, far ? .45 : 1); place(a, bus, pan, far ? .6 : .3);
    const rate = rnd(55, 85), n = Math.floor(rnd(9, 18)), vol = SND.frogVol;
    for (let k = 0; k < n; k++) {
      const t = when + k / rate, env = Math.sin(Math.PI * (k + .5) / n);       // swell and fade over the call
      [[f, 1], [f * 2.3, .45]].forEach(([ff, g]) => {
        const o = a.createOscillator(), v = a.createGain();
        o.frequency.value = ff * (1 - k / n * .06);                             // pitch sags a little
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol * g * env, t + .0015);
        v.gain.exponentialRampToValueAtTime(.0001, t + .011);
        o.connect(v).connect(bus); o.start(t); o.stop(t + .014);
      });
    }
  }
  function startAmbient(kind) {
    stopAmbient(0);
    const a = audio(); if (!a || kind === 'none') return;
    Amb.kind = kind; Amb.playing = true;
    Amb.out = a.createGain(); Amb.out.gain.value = 0; Amb.out.connect(a.destination);
    Amb.out.gain.setTargetAtTime(ambientVolume(), a.currentTime, 1.2);       // slow fade-in
    Amb.verb = a.createConvolver(); Amb.verb.buffer = hallReverb(a);
    Amb.verb.connect(gainOf(a, .5)).connect(Amb.out);
    if (kind === 'rain') {
      noiseSource(a, 'brown', filt(a, 'lowpass', 800, .5), gainOf(a, SND.rainBed));     // very distant
      let intensity = .55;                                                      // the shower slowly comes and goes
      const breathe = () => { intensity = Math.min(1, Math.max(.25, intensity + rnd(-.25, .25))); later(breathe, rnd(4000, 10000)); };
      breathe();
      const fall = () => {
        const r = Math.random();
        const loud = Math.random() < .05 ? rnd(.7, 1.4) : Math.pow(Math.random(), 3.2) * .4;   // mostly tiny, now and then a big one
        const on = r < .5 ? 'leaf' : r < .74 ? 'puddle' : r < .96 ? 'wood' : 'gutter';
        RAIN_ON[on](a, loud * (.6 + intensity * .7), rnd(-.9, .9), SND.dropGain);
        later(fall, rnd(SND.dropGapMin, SND.dropGapMax) / intensity);
      };
      fall();
    } else if (kind === 'waves') {
      // the sea never fully stops: a far-off surf that wanders on its own
      const flp = filt(a, 'lowpass', 420, .4), fg = gainOf(a, .1);
      noiseSource(a, 'brown', flp, fg);
      const drift = () => {
        const t = a.currentTime + .02, d = 10;
        shape(fg.gain, t, d, wander(40, .05, .17)); shape(flp.frequency, t, d, wander(40, 280, 600));
        later(drift, d * 1000);
      };
      drift();
      // each wave: an uneven swell with a stumble or two, a break, and a fizzing backwash
      const lp = filt(a, 'lowpass', 300, .4), g = gainOf(a, .001), pan = a.createStereoPanner();
      noiseSource(a, 'brown', lp, g, pan);
      const wash = filt(a, 'bandpass', 1500, .6), wg = gainOf(a, 0);
      noiseSource(a, 'pink', wash, wg);
      const wave = () => {
        // the longer a wave builds, the more energy it carries: louder landing, more foam, longer backwash
        const t = a.currentTime + .05, up = rnd(2.5, 6), energy = (up - 2.5) / 3.5;
        const peak = (.45 + energy * .75) * rnd(.9, 1.1);
        const back = rnd(SND.waveBackMin, SND.waveBackMax) * (.85 + energy * .35), T = up + back, N = 120;
        const bumps = [1, 2].map(() => [rnd(.9, 2.2), rnd(0, 6.3), rnd(.05, .14)]);
        const amp = [], cut = [], fizz = [];
        for (let i = 0; i < N; i++) {
          const x = i / (N - 1) * T;
          let e = x < up ? Math.pow(x / up, 1.7) : Math.exp(-(x - up) / (back / 2.2));
          for (const [fr, ph, am] of bumps) e += am * Math.sin(fr * x + ph) * e;     // stumbles and secondary surges
          e = Math.max(.002, e * (1 + (Math.random() - .5) * .12));
          amp.push(e * peak); cut.push(260 + e * rnd(1100, 1700));
          fizz.push(x < up * .85 ? 0 : Math.max(0, Math.exp(-(x - up) / (back / 2)) * peak * .09 * (.6 + Math.random() * .8)));
        }
        const p = rnd(-.4, .4);
        pan.pan.setTargetAtTime(p, t, 2);
        shape(g.gain, t, T, amp); shape(lp.frequency, t, T, cut); shape(wg.gain, t, T, fizz);
        if (SND.waveCrash > 0) crash(a, t + up - .05, peak * (.6 + energy * .8) * SND.waveCrash, p);
        later(wave, (T + rnd(1.2, 4.5)) * 1000);
      };
      wave();
    } else if (kind === 'forest') {
      noiseSource(a, 'brown', filt(a, 'lowpass', 450, .5), gainOf(a, .08));
      // a handful of birds who live here, each singing in its own bouts
      for (let i = 0; i < 5; i++) {
        const b = { song: Math.floor(Math.random() * 7), pitch: rnd(.88, 1.12), pan: rnd(-.9, .9), far: Math.random() < .4 };
        const bout = () => {
          for (let k = 0, c = 1 + Math.floor(Math.random() * 4); k < c; k++) later(() => song(a, b), k * rnd(1400, 3200));
          later(bout, rnd(9000, 32000));
        };
        later(bout, rnd(400, 14000));
      }
      // crickets come and go
      const crickets = () => {
        const pan = rnd(-.9, .9), len = rnd(6, 20), gap = rnd(.42, .6);
        for (let s = 0; s < len; s += gap) later(() => cricket(a, pan, a.currentTime + .02), s * 1000);
        later(crickets, (len + rnd(10, 30)) * 1000);
      };
      later(crickets, rnd(2000, 12000));
      const frogs = () => {
        const f = rnd(560, 720), far = Math.random() < .5;   // one frog; each call comes from the left or the right
        let s = 0;
        for (let i = 0, n = 4 + Math.floor(Math.random() * 7); i < n; i++) {
          const p = (Math.random() < .5 ? -1 : 1) * rnd(.35, .8), twice = Math.random() < .35;
          later(() => { const t = a.currentTime + .02; croak(a, f, p, t, far); if (twice) croak(a, f, p, t + rnd(.3, .45), far); }, s * 1000);
          s += rnd(.6, 2.2);
        }
        later(frogs, (s + rnd(25, 70)) * 1000);
      };
      later(frogs, rnd(8000, 25000));
      const leaves = () => { rustle(a); later(leaves, rnd(9000, 26000)); };
      later(leaves, rnd(3000, 9000));
    } else if (kind === 'chimes') {
      let lastTube = -1;
      // one knock: two or three different tubes ring almost together, or rolled a little apart
      const knock = (t, vel, pan) => {
        const pool = [...TUBES.keys()].filter(k => k !== lastTube).sort(() => Math.random() - .5);
        const group = pool.slice(0, Math.random() < .45 ? 2 : 3);
        const rolled = Math.random() < .35;
        group.forEach((k, i) => {
          const off = i === 0 ? 0 : rolled ? rnd(.07, .2) * i : rnd(.004, .035) * i;
          tube(a, TUBES[k] * Math.pow(2, Math.round(SND.chimeOctave)), t + off, vel * rnd(.7, 1), pan + rnd(-.12, .12));
        });
        lastTube = group[group.length - 1];
      };
      const breeze = () => {
        const gust = Math.random() < SND.gustChance, pan = rnd(-.3, .3);
        let t = a.currentTime + .05;
        if (gust) {        // a gust: the stronger it is, the more knocks and the louder they get
          const w = Math.random(), n = Math.round(SND.gustKnocksMin + w * (SND.gustKnocksMax - SND.gustKnocksMin));
          for (let i = 0; i < n; i++) { knock(t, (.4 + w * .6) * rnd(.75, 1), pan); t += rnd(.15, .45); }
        } else {           // mostly a single soft knock, sometimes a second one after a moment
          knock(t, rnd(.12, .35), pan);
          if (Math.random() < .4) knock(t + rnd(.8, 2), rnd(.1, .28), pan);
        }
        later(breeze, gust ? rnd(5000, 9000) : rnd(4500, 13000));
      };
      later(breeze, 800);
    }
  }
  function stopAmbient(fade = 1.5) {
    Amb.playing = false;
    Amb.timers.forEach(clearTimeout); Amb.timers = [];
    const out = Amb.out, nodes = Amb.nodes; Amb.out = null; Amb.nodes = [];
    if (!out) return;
    const a = audio(), stopAt = a.currentTime + fade;
    if (fade > 0) out.gain.setTargetAtTime(0, a.currentTime, fade / 4); else out.gain.value = 0;
    nodes.forEach(n => { try { n.stop(stopAt + .1); } catch {} });
    setTimeout(() => out.disconnect(), (fade + .3) * 1000);
  }
  const ambientChoice = () => (document.querySelector('input[name="ambient"]:checked') || {}).value || 'none';

  /* ---------- soft chords: a few slow, sustained voicings with an occasional high bell ---------- */
  const Mus = { out: null, bus: null, nodes: [], timers: [], playing: false, chord: 0 };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // open voicings around D major pentatonic: Dadd9, G(add9-ish), Bm7 shell, Asus2, Em7 shell
  const CHORDS = [[50, 57, 64], [43, 50, 57, 66], [47, 54, 62], [45, 52, 59], [40, 47, 55, 62]];
  const BELLS = [74, 76, 78, 81, 83, 86];
  function hallReverb(a) {
    if (hallReverb.ctx === a) return hallReverb.ir;
    const len = Math.floor(a.sampleRate * 3.4), buf = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    hallReverb.ctx = a; hallReverb.ir = buf; return buf;
  }
  function padNote(a, midi, when, dur) {
    const env = a.createGain(), lp = filt(a, 'lowpass', 1100, .5);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(.13, when + 2.6);            // slow swell in
    env.gain.setTargetAtTime(0, when + dur, 1.6);                   // and a long fade out
    lp.connect(env).connect(Mus.bus);
    [['sine', 0, 1], ['triangle', 5, .35], ['sine', -4, .5]].forEach(([type, cents, g]) => {
      const o = a.createOscillator(), og = gainOf(a, g);
      o.type = type; o.frequency.value = mtof(midi); o.detune.value = cents;
      o.connect(og).connect(lp); o.start(when); o.stop(when + dur + 9);
    });
  }
  function bellNote(a, midi, when) {
    [[1, .11, 3.6], [2.01, .025, 1.6]].forEach(([m, g, d]) => {
      const o = a.createOscillator(), v = a.createGain();
      o.frequency.value = mtof(midi) * m;
      v.gain.setValueAtTime(0, when); v.gain.linearRampToValueAtTime(g, when + .03);
      v.gain.exponentialRampToValueAtTime(.0001, when + d);
      o.connect(v).connect(Mus.bus); o.start(when); o.stop(when + d + .1);
    });
  }
  function startMusic() {
    stopMusic(0);
    const a = audio(); if (!a) return;
    Mus.playing = true;
    Mus.out = a.createGain(); Mus.out.gain.value = 0; Mus.out.connect(a.destination);
    Mus.out.gain.setTargetAtTime(ambientVolume(), a.currentTime, 1.5);
    Mus.bus = a.createGain();
    const dry = gainOf(a, .55), wet = gainOf(a, .6), verb = a.createConvolver();
    verb.buffer = hallReverb(a);
    Mus.bus.connect(dry).connect(Mus.out);
    Mus.bus.connect(verb).connect(wet).connect(Mus.out);
    const step = () => {
      if (!Mus.playing) return;
      const len = 9 + Math.random() * 3, t = a.currentTime + .1;
      CHORDS[Mus.chord].forEach((n, i) => padNote(a, n, t + i * .35, len));
      // now and then, one or two quiet high notes over the chord
      const bells = Math.random() < .6 ? 1 + Math.floor(Math.random() * 2) : 0;
      for (let i = 0; i < bells; i++) bellNote(a, BELLS[Math.floor(Math.random() * BELLS.length)], t + 2 + Math.random() * (len - 3));
      // drift to a neighbouring chord most of the time
      Mus.chord = Math.random() < .7 ? (Mus.chord + 1) % CHORDS.length : Math.floor(Math.random() * CHORDS.length);
      Mus.timers.push(setTimeout(step, len * 1000));
    };
    step();
  }
  function stopMusic(fade = 1.5) {
    Mus.playing = false;
    Mus.timers.forEach(clearTimeout); Mus.timers = [];
    const out = Mus.out; Mus.out = null; Mus.bus = null;
    if (!out) return;
    const a = audio();
    if (fade > 0) out.gain.setTargetAtTime(0, a.currentTime, fade / 4); else out.gain.value = 0;
    setTimeout(() => out.disconnect(), (fade + .4) * 1000);
  }
  const musicOn = () => $('#ambMusic').checked;
  /*SND-END*/
  function startBackground() { startAmbient(ambientChoice()); if (musicOn()) startMusic(); else stopMusic(1); }
  function stopBackground(fade = 1.5) { stopAmbient(fade); stopMusic(fade); }

  /* ---------- monk motion ---------- */
  const M = { holding: false, x: 60, y: 215, ty: 215, tx: 60, speed: 28, face: 1, stick: 10, wait: 1.5, walkT: 0, mode: 'patrol', arrive: null };
  function pickPatrol() {
    let tx;
    if (Math.random() < .22) tx = SITTER_X + (Math.random() * 10 - 5);   // stop behind the sitter and watch
    else do { tx = 50 + Math.random() * 300; } while (Math.abs(tx - M.x) < 70);
    M.tx = tx; M.speed = 22 + Math.random() * 12; M.wait = 1.2 + Math.random() * 3.2;
  }
  function walkTo(x, speed) { M.tx = x; M.speed = speed; return new Promise(r => { M.arrive = r; }); }

  let last = performance.now(), stickInFront = false;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const dx = M.tx - M.x, moving = Math.abs(dx) > .4;
    if (moving) {
      M.x += Math.sign(dx) * Math.min(Math.abs(dx), M.speed * dt);
      M.face = Math.sign(dx); M.walkT += dt;
    } else {
      M.x = M.tx;
      if (M.arrive) { const r = M.arrive; M.arrive = null; r(); }
      else if (M.mode === 'patrol') { M.wait -= dt; if (M.wait <= 0) pickPatrol(); }
    }
    M.y += (M.ty - M.y) * Math.min(1, dt * 6);
    const bob = moving && !reduceMotion ? -Math.abs(Math.sin(M.walkT * 7)) * 2.4 : 0;
    const place = `translate(${M.x.toFixed(2)} ${(M.y + bob).toFixed(2)}) scale(${M.face} 1)`;
    monkEl.setAttribute('transform', place);
    stickLayer.setAttribute('transform', place);
    // the stick is always above the monk; while he strikes it also goes above the mochi
    const front = M.mode === 'task';
    if (front !== stickInFront) { stickInFront = front; (front ? sitterEl : monkEl).after(stickLayer); }
    stickEl.setAttribute('transform', `rotate(${M.stick.toFixed(1)} ${PIVOT})`);
    if (!bubbleEl.hidden) placeBubble();
    requestAnimationFrame(frame);
  }

  function placeBubble() {
    bubbleEl.style.left = Math.min(80, Math.max(20, M.x / 400 * 100)) + '%';
    bubbleEl.style.top = `calc(var(--u) * ${M.y - 92})`;   // scene units: the floor below can grow without moving it
  }
  function bubble(text) {
    if (text == null) { bubbleEl.hidden = true; return; }
    bubbleText.textContent = text; bubbleEl.hidden = false; placeBubble();
  }
  let toastTimer = 0;
  function toast(text, hit = false, ms = 3200) {
    clearTimeout(toastTimer);
    toastEl.textContent = text; toastEl.classList.toggle('hit', hit);
    toastEl.hidden = !$('#dialog').hidden;
    toastTimer = setTimeout(() => { toastEl.hidden = true; toastEl.textContent = ''; }, ms);
  }

  /* ---------- the mochi: standing while checking in, seated while sitting ---------- */
  const mochiEl = $('#mochi');
  let standing = true;
  const mochiX = () => SITTER_X + (standing ? STAND.x : 0);
  const restFace = () => standing ? (P.phase === 'break' ? 'happy' : 'peek') : 'calm';
  const placeMochi = (x, y) => mochiEl.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  async function hop(toSit) {
    if (standing !== toSit) return;              // already there
    const [fx, fy, tx, ty] = toSit ? [STAND.x, STAND.y, 0, 0] : [0, 0, STAND.x, STAND.y];
    sitterEl.classList.add('standing');          // feet show while in the air
    await tween(0, 1, reduceMotion ? 1 : 620, t => placeMochi(fx + (tx - fx) * t, fy + (ty - fy) * t - Math.sin(Math.PI * t) * 24), easeInOut);
    standing = !toSit;
    sitterEl.classList.toggle('standing', standing);
    sitterEl.classList.remove('ouch'); void sitterEl.getBoundingClientRect(); sitterEl.classList.add('ouch');
    document.querySelectorAll('#sitter .acc').forEach(a => { a.classList.remove('react'); void a.getBoundingClientRect(); a.classList.add('react'); });   // little squash on landing
    setTimeout(() => sitterEl.classList.remove('ouch'), 500);
  }
  const sitDown = () => hop(true), standUp = () => hop(false);

  /* ---------- the monk does one thing at a time ---------- */
  const queue = []; let busy = false;
  function enqueue(fn) { queue.push(fn); pump(); }
  async function pump() {
    if (busy) return; busy = true;
    while (queue.length) await queue.shift()();
    busy = false; M.ty = 215; monkEl.dataset.mood = 'calm';
    settleMonk();
  }
  // What the monk does when nothing is queued: host the dialogue, drink tea, or patrol.
  let hostAway = false, teaTalk = 0;
  function settleMonk() {
    if (busy) return;
    const talking = !$('#dialog').hidden && (P.phase === 'idle' || P.phase === 'ready');
    const want = P.phase === 'break' || hostAway ? 'rest' : talking ? 'host' : 'patrol';
    $('#tea').setAttribute('visibility', want === 'rest' ? 'visible' : 'hidden');
    if (want === M.mode) return;
    M.mode = want; M.stick = 10;
    if (want === 'rest') {
      M.ty = 215;
      walkTo(TEA_X, 40).then(() => {
        if (M.mode !== 'rest') return;
        M.face = -1; bubble(tr('喫茶去~'));                  // the tea is on the table to his left
        clearTimeout(teaTalk); teaTalk = setTimeout(() => bubble(null), 2600);
      });
    } else if (want === 'host') {
      M.ty = 220;
      walkTo(HOST_X, 70).then(() => { if (M.mode === 'host') M.face = 1; });
    } else {
      M.ty = 215; M.wait = .6; M.arrive = null; M.tx = M.x;
    }
  }

  // the monk only carries the keisaku while people are sitting; otherwise it leans against the post
  function showStick() {
    stickLayer.setAttribute('visibility', M.holding ? 'visible' : 'hidden');
    $('#rackStick').setAttribute('visibility', M.holding ? 'hidden' : 'visible');
  }
  async function goToRack() {
    M.mode = 'fetch'; M.ty = 215;
    await walkTo(RACK_X - 14, 90);
    M.face = 1; await sleep(250);
  }
  async function takeStick() {
    if (M.holding) return;
    await goToRack(); M.holding = true; M.stick = 10; showStick(); await sleep(300);
  }
  async function returnStick() {
    if (!M.holding) return;
    await goToRack(); M.holding = false; showStick(); await sleep(250);
  }

  async function strike({ reason, counted }) {
    await takeStick();
    M.mode = 'task'; M.ty = 222;
    await walkTo(mochiX() + 72, 150);
    M.face = -1;
    monkEl.dataset.mood = counted ? 'stern' : 'calm';
    bubble(counted ? tr('喝!') : tr('請。')); await sleep(420);
    await tween(M.stick, -48, 380, v => M.stick = v, easeOut);
    await sleep(160);
    await tween(-48, 95, 85, v => M.stick = v);
    impact();
    if (counted) { P.hits++; P.roundHits++; P.todayHits++; } else { P.asks++; }
    renderStats();
    toast(reason, counted, 2600);
    await sleep(480); bubble(null);
    await tween(95, 10, 480, v => M.stick = v, easeInOut);
    monkEl.dataset.mood = 'calm';
    await sleep(350);
    if (P.phase !== 'focus' && P.phase !== 'settle') await returnStick();
  }

  // after the strike's jolt the lamp goes back to its gentle flicker
  $('#andonLight').addEventListener('animationend', e => { if (e.animationName === 'jolt') e.currentTarget.classList.remove('jolt'); });
  function impact() {
    slap(); buzz(80);
    const wrap = $('#stageWrap');
    wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
    const lamp = $('#andonLight');
    lamp.classList.remove('jolt'); void lamp.getBoundingClientRect(); lamp.classList.add('jolt');
    const pow = $('#pow'); pow.style.left = (mochiX() + 24) / 4 + '%'; pow.classList.remove('go'); void pow.offsetWidth; pow.classList.add('go');
    sitterEl.dataset.face = 'ouch';
    sitterEl.classList.remove('ouch'); void sitterEl.getBoundingClientRect(); sitterEl.classList.add('ouch');
    setTimeout(() => { if (sitterEl.dataset.face === 'ouch') sitterEl.dataset.face = restFace(); sitterEl.classList.remove('ouch'); }, 1300);
    const stars = $('#stars');
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span'); s.className = 'star'; s.textContent = '✦';
      const a = Math.PI * 2 * i / 6 + Math.random() * .5;
      s.style.left = (mochiX() + 22) / 4 + '%'; s.style.top = `calc(var(--u) * ${standing ? 171 : 179})`;
      s.style.setProperty('--dx', Math.cos(a) * 46 + 'px'); s.style.setProperty('--dy', Math.sin(a) * 34 + 'px');
      stars.appendChild(s); setTimeout(() => s.remove(), 750);
    }
  }

  /* ---------- RPG dialogue ---------- */
  const SKIP = Symbol('skip');
  const dlg = $('#dialog'), dlgText = $('#dlgText'), dlgChoices = $('#dlgChoices'), dlgSkip = $('#dlgSkip');
  let finishTyping = null, pendingAsk = null, skipRequested = false;

  function openDialog(skippable) {
    dlgSkip.hidden = !skippable;
    if (dlg.hidden) { dlg.hidden = false; toastEl.hidden = true; settleMonk(); }
  }
  function closeDialog() {
    dlg.hidden = true; dlgChoices.replaceChildren(); toastEl.hidden = !toastEl.textContent;
    settleMonk();
  }
  function typeText(text) {
    return new Promise(res => {
      const chars = [...text]; let i = 0;
      dlgText.textContent = '';
      const done = () => { clearInterval(timer); dlgText.textContent = text; finishTyping = null; res(); };
      if (reduceMotion) { done(); return; }
      const timer = setInterval(() => { dlgText.textContent += chars[i++]; if (i >= chars.length) done(); }, 34);
      finishTyping = done;
    });
  }
  dlgText.addEventListener('click', () => finishTyping && finishTyping());
  dlgSkip.addEventListener('click', () => {
    skipRequested = true;
    if (finishTyping) finishTyping();
    if (pendingAsk) pendingAsk.reject(SKIP);
  });

  // choices: [{label, sub?, value, primary?, wide?, onPick?}] — onPick runs inside the click (needed for iOS permission prompts)
  async function ask(text, choices, { skippable = false, timeout = 0, timeoutValue = null, input = null } = {}) {
    openDialog(skippable);
    dlgChoices.replaceChildren();
    await typeText(text);
    if (skipRequested) { skipRequested = false; throw SKIP; }
    return new Promise((resolve, reject) => {
      let timer = 0;
      const settle = v => { clearTimeout(timer); pendingAsk = null; dlgChoices.replaceChildren(); resolve(v); };
      pendingAsk = { reject: e => { clearTimeout(timer); pendingAsk = null; skipRequested = false; dlgChoices.replaceChildren(); reject(e); } };
      if (input) {
        const row = document.createElement('form'); row.className = 'dlg-input';
        row.innerHTML = tr('<input id="dlgInput" maxlength="12" autocomplete="off"><button type="submit" class="choice primary">確定</button>');
        const field = row.querySelector('input'); field.placeholder = input.placeholder || '';
        if (input.number) {
          row.noValidate = true;                      // the monk explains out-of-range numbers, not the browser
          Object.assign(field, { type: 'number', inputMode: 'numeric', min: input.number.min, max: input.number.max, step: 1 });
          field.removeAttribute('maxlength');
          field.insertAdjacentElement('afterend', Object.assign(document.createElement('span'), { className: 'dlg-unit', textContent: input.unit || '' }));
        }
        row.addEventListener('submit', e => { e.preventDefault(); audio(); settle(field.value.trim()); });
        dlgChoices.appendChild(row);
        setTimeout(() => field.focus(), 50);
      }
      choices.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'choice' + (c.primary ? ' primary' : '') + (c.wide ? ' wide' : '');
        b.style.animationDelay = (i * 40) + 'ms';
        b.textContent = c.label;
        if (c.sub) { const s = document.createElement('small'); s.textContent = c.sub; b.appendChild(s); }
        b.addEventListener('click', () => { audio(); c.onPick && c.onPick(); settle(c.value); });
        dlgChoices.appendChild(b);
      });
      if (timeout) timer = setTimeout(() => settle(timeoutValue), timeout);
    });
  }

  /* ---------- onboarding script ---------- */
  const TASKS = [tr('讀書'), tr('工作'), tr('寫作')];
  let cfg = { ...DEFAULT_CFG };

  const RULES = [
    tr('坐禪時,手機放在桌上不要碰。我會在堂裡來回巡視。'),
    tr('只要拿起手機,或切到別的畫面超過兩秒,我就用這支香板打你一下。'),
    tr('每炷香開始時敲三聲鐘,結束時敲一聲。手機螢幕朝下也聽得到。'),
    tr('休息時我去喝茶,手機隨你用。休息結束我敲兩聲,你就回來坐。'),
    tr('臨時有事的話,可以按「暫離」暫停計時。每炷可以用一次,不會挨打。'),
    tr('想提神的話,可以按「合掌請打」,請我打你一下。這一下不會記進被打次數。')
  ];
  async function explainRules() {
    for (let i = 0; i < RULES.length; i++) {
      const v = await ask(RULES[i], [
        { label: i < RULES.length - 1 ? tr('繼續') : tr('明白了'), value: 'next', primary: true },
        ...(i < RULES.length - 1 ? [{ label: tr('略過說明'), value: 'skip' }] : [])
      ]);
      if (v === 'skip') return;
    }
  }

  async function onboarding(again = false) {
    P.phase = 'idle'; renderAll();
    sitterEl.dataset.face = 'peek';
    const lastCfg = loadLast();
    // "returning" means they have actually sat before, not just opened the page
    const log = readLog(), hasSat = log.length > 0;
    const rulesAsked = store.get('keisaku-rules-asked-v1', false);
    let introduced = false;
    if (!again && !store.get('keisaku-tour-v1', false)) {
      // first visit: say what this place is before pointing at anything
      if (!hasSat) {
        try {
          for (const [line, reply, withStick] of INTRO) {
            if (withStick) await new Promise(r => enqueue(async () => { await takeStick(); r(); }));
            await ask(line, [{ label: reply, value: 1, primary: true }], { skippable: true });
            if (withStick) enqueue(returnStick);
          }
        } catch (e) { if (e !== SKIP) throw e; enqueue(returnStick); }
        store.set('keisaku-rules-asked-v1', true);      // the essentials were just said; the board holds the rest
        introduced = true;
      }
      await tour(introSteps(hasSat));
      store.set('keisaku-tour-v1', true);
      store.set('keisaku-tip-collect-v1', true);
    } else if (!again && !store.get('keisaku-tip-collect-v1', false)) {
      store.set('keisaku-tip-collect-v1', true);
      await tour([collectStep(true)]);
    }
    const { streak, gap } = streakInfo(dayMap(log));
    const hello = streak >= 2 ? tr('施主已經連續來了 {0} 天。', streak) : gap != null && gap >= 3 ? tr('好幾天沒見了,歡迎回來。') : tr('施主又來了。');
    const goal = goalNow();
    const progress = !goal || !P.todayRounds ? '' : P.todayRounds >= goal ? tr('今日目標 {0} 炷已經達成了。', goal) : tr('今日目標 {0} 炷,還差 {1} 炷。', goal, goal - P.todayRounds);
    const greet = introduced ? tr('那麼,施主今天想做什麼呢?')          // the welcome was just said
      : again ? tr('施主還要再坐一輪嗎?{0}今天想做什麼呢?', progress)
      : hasSat ? hello + progress + tr('今天想做什麼呢?')
      : tr('歡迎來到香板禪堂。施主今天想做什麼呢?');
    try {
      let firstLine = null;
      if (introduced) firstLine = tr('那麼,施主今天想做什麼呢?');
      else if (!hasSat && !rulesAsked && !again) {
        const v = await ask(tr('歡迎來到香板禪堂。施主是第一次來吧?要先聽聽禪堂的規矩嗎?'), [
          { label: tr('請說明'), value: 'help', primary: true }, { label: tr('略過說明'), value: 'skip' }
        ]).finally(() => store.set('keisaku-rules-asked-v1', true));
        if (v === 'help') await explainRules();
        firstLine = tr('那麼,施主今天想做什麼呢?');
      }
      let next = 'new';
      for (;;) {
        const presets = loadPresets();
        if (!lastCfg && !presets.length) break;
        const opts = [];
        if (lastCfg) opts.push({ label: tr('跟上次一樣'), sub: cfgShort(lastCfg), value: { use: lastCfg }, primary: true });
        presets.forEach(p => { if (!sameCfg(p, lastCfg)) opts.push({ label: '★ ' + p.task, sub: tr('{0} 分 × {1} 炷', p.focusMin, p.rounds), value: { use: p } }); });
        opts.push({ label: tr('新的安排'), value: 'new' });
        if (presets.length) opts.push({ label: tr('整理常用'), value: 'manage' });
        opts.push({ label: tr('聽說明'), value: 'help' });
        next = await ask(greet, opts);
        if (next === 'manage') { await managePresets(); continue; }
        if (next === 'help') { await explainRules(); continue; }
        break;
      }
      if (next !== 'new') {
        cfg = { ...next.use };
        applyCfg();
        return readyCheck(tr('好,一樣是「{0}」,{1} 分 × {2} 炷。', cfg.task, cfg.focusMin, cfg.rounds));
      }
      await planNew(firstLine || (lastCfg || !presetsEmpty() ? tr('那麼,今天想做什麼呢?') : greet));
    } catch (e) {
      if (e !== SKIP) throw e;
      cfg = { ...(loadLast() || lastCfg || DEFAULT_CFG) };
      applyCfg();
      return readyCheck(tr('好,就照「{0}」,{1} 分 × {2} 炷。', cfg.task, cfg.focusMin, cfg.rounds));
    }
    return readyCheck('');
  }
  const presetsEmpty = () => !loadPresets().length;

  // one question per setting, so the plan can be made in order or changed one piece at a time
  async function askTask(line) {
    let task = await ask(line, [...TASKS.map(t => ({ label: t, value: t })), { label: tr('自訂…'), value: '*' }]);
    if (task === '*') task = await ask(tr('要做什麼呢?寫下來給我看看。'), [{ label: tr('先不說'), value: '' }], { input: { placeholder: tr('例如:背單字') } });
    return task || tr('專注');
  }
  async function askFocus(line) {
    const v = await ask(line, [
      { label: tr('15 分'), sub: tr('小坐'), value: 15 }, { label: tr('25 分'), sub: tr('番茄'), value: 25, primary: true },
      { label: tr('40 分'), sub: tr('一炷香'), value: 40 }, { label: tr('50 分'), sub: tr('長坐'), value: 50 },
      { label: tr('自訂…'), value: '*', wide: true }
    ]);
    return v === '*' ? askNumber(tr('每炷要坐幾分鐘?'), 5, 120, tr('分'), 25) : v;
  }
  async function askRounds() {
    const v = await ask(tr('要坐幾炷?'), [
      ...[1, 2, 3, 4].map(n => ({ label: tr('{0} 炷', n), value: n, primary: n === 4 })), { label: tr('自訂…'), value: '*', wide: true }
    ]);
    return v === '*' ? askNumber(tr('要坐幾炷?'), 1, 8, tr('炷'), 4) : v;
  }
  async function askBreak() {
    const v = await ask(tr('每炷之間要休息多久?'), [
      { label: tr('5 分'), value: 5, primary: true }, { label: tr('10 分'), value: 10 },
      { label: tr('15 分'), value: 15 }, { label: tr('自訂…'), value: '*' }
    ]);
    return v === '*' ? askNumber(tr('休息幾分鐘?'), 1, 30, tr('分'), 5) : v;
  }
  const recapLine = c => tr('好。施主今天要「{0}」,坐 {1} 炷香,每炷 {2} 分鐘', c.task, c.rounds, c.focusMin) +
    (c.rounds > 1 ? tr(',中間休息 {0} 分鐘', c.breakMin) : '') + tr(',一共大約 {0} 分鐘。', totalMin(c));

  async function planNew(openingLine) {
    const task = await askTask(openingLine);
    const focusMin = await askFocus(tr('「{0}」啊,好。每炷香要坐多久呢?', task));
    const rounds = await askRounds();
    const breakMin = rounds > 1 ? await askBreak() : 0;
    cfg = { task, focusMin, rounds, breakMin };
    applyCfg();
    for (;;) {
      const saved = loadPresets().some(p => sameCfg(p, cfg));
      const ok = await ask(recapLine(cfg), [
        { label: tr('沒錯'), value: 'ok', primary: true },
        ...(saved ? [] : [{ label: tr('沒錯,存成常用'), value: 'save' }]),
        { label: tr('我要改'), value: 'edit' }
      ]);
      if (ok === 'edit') { await editPlan(); continue; }
      if (ok === 'save') await savePreset(cfg);
      return;
    }
  }
  // change one setting at a time; each row shows what it is now
  async function editPlan() {
    for (;;) {
      const what = await ask(tr('要改哪裡?'), [
        { label: tr('要做的事'), sub: cfg.task, value: 'task' },
        { label: tr('每炷多久'), sub: tr('{0} 分', cfg.focusMin), value: 'focus' },
        { label: tr('坐幾炷'), sub: tr('{0} 炷', cfg.rounds), value: 'rounds' },
        ...(cfg.rounds > 1 ? [{ label: tr('休息多久'), sub: tr('{0} 分', cfg.breakMin), value: 'break' }] : []),
        { label: tr('改好了'), value: 'done', primary: true, wide: true }
      ]);
      if (what === 'done') return;
      if (what === 'task') cfg.task = await askTask(tr('要做什麼呢?'));
      if (what === 'focus') cfg.focusMin = await askFocus(tr('每炷香要坐多久?'));
      if (what === 'rounds') {
        cfg.rounds = await askRounds();
        if (cfg.rounds > 1 && !cfg.breakMin) cfg.breakMin = await askBreak();   // a break is needed once there are two
      }
      if (what === 'break') cfg.breakMin = await askBreak();
      cfg = { ...cfg };
      applyCfg();
    }
  }

  // a number typed into the dialogue box; 算了 falls back to the usual choice
  async function askNumber(text, min, max, unit, fallback) {
    for (;;) {
      const v = await ask(text, [{ label: tr('算了'), value: '' }], { input: { placeholder: `${min}–${max}`, number: { min, max }, unit } });
      if (v === '') return fallback;
      const n = Math.round(Number(v));
      if (Number.isFinite(n) && n >= min && n <= max) return n;
      text = tr('要 {0} 到 {1} {2}之間喔。{3}', min, max, unit, text);
    }
  }

  async function savePreset(c) {
    let presets = loadPresets().filter(p => !sameCfg(p, c));
    let line = tr('記下了。下次選「★ {0}」就好。', c.task);
    if (presets.length >= MAX_PRESETS) {
      const dropped = presets.shift();
      line = tr('記下了。常用最多 {0} 組,最舊的「{1}」先拿掉了。', MAX_PRESETS, dropped.task);
    }
    presets.push({ ...c });
    store.set('keisaku-presets-v1', presets);
    await ask(line, [{ label: tr('好'), value: 1, primary: true }]);
  }

  async function managePresets() {
    for (;;) {
      const presets = loadPresets();
      if (!presets.length) { await ask(tr('常用都清空了。'), [{ label: tr('好'), value: 1, primary: true }]); return; }
      const pick = await ask(tr('要拿掉哪一組常用?'), [
        ...presets.map((p, i) => ({ label: tr('拿掉 ★ ') + p.task, sub: tr('{0} 分 × {1} 炷', p.focusMin, p.rounds), value: i })),
        { label: tr('整理好了'), value: -1, primary: true }
      ]);
      if (pick === -1) return;
      presets.splice(pick, 1); store.set('keisaku-presets-v1', presets);
    }
  }

  // ④ ready check, used before the first round and after every break
  async function readyCheck(prefix) {
    const phoneLike = matchMedia('(pointer: coarse)').matches && motionWanted();
    const howTo = phoneLike
      ? tr('請把手機螢幕朝下平放在桌上。聽到三聲鐘響就開始,一聲就是休息。')
      : tr('這次請別切走畫面喔。聽到三聲鐘響就開始,一聲就是休息。');
    let delays = 0;
    if (!store.get('keisaku-leave-told-v1', false)) {
      await ask(tr('對了,坐禪時如果臨時有事,可以按計時下方的「暫離」先暫停。每炷可以用一次,不會挨打。'), [{ label: tr('知道了'), value: 1, primary: true }]);
      store.set('keisaku-leave-told-v1', true);
    }
    for (;;) {
      const beforeFirst = P.phase === 'idle';         // the plan can still change before the first stick is lit
      const v = await ask(tr('{0}準備好了嗎?{1}', prefix, howTo), [
        { label: tr('準備好了'), value: 'go', primary: true, onPick: askMotionPermission },
        { label: tr('再等一下'), value: 'wait' },
        ...(beforeFirst ? [{ label: tr('改設定'), sub: cfgShort(cfg), value: 'edit', wide: true }] : [])
      ]);
      if (v === 'go') break;
      if (v === 'edit') { await editPlan(); prefix = tr('好,改成「{0}」,{1} 分 × {2} 炷。', cfg.task, cfg.focusMin, cfg.rounds); continue; }
      delays++;
      const line = delays >= 3 ? tr('施主,拖延也是一種妄想喔。……好吧,我去喝杯茶,一分鐘後回來。')
        : tr('不急,去倒杯水、上個廁所吧。我一分鐘後回來問你。');
      hostAway = true; settleMonk();
      await ask(line, [{ label: tr('我好了'), value: 'back', primary: true }], { timeout: 60000, timeoutValue: 'timeout' });
      hostAway = false; settleMonk();
      prefix = delays >= 3 ? tr('回來了。') : '';
    }
    sitterEl.dataset.face = 'happy';
    await Promise.all([ask(tr('那麼,止靜。'), [], { timeout: 900 }), sitDown()]);
    sitterEl.dataset.face = 'calm';
    closeDialog();
    beginSettle();
  }

  /* ---------- motion sensor ("平衡儀") ---------- */
  // Low-passed gravity vector. At the start of each round we remember the phone's resting
  // orientation; tilting away from it, or jolting it, for long enough counts as picking it up.
  const Mo = { seen: false, lp: null, base: null, still: 0, score: 0, t: 0, picked: false, lastNag: 0, permission: 'unknown' };
  const angleBetween = (a, b) => {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const n = Math.hypot(...a) * Math.hypot(...b) || 1;
    return Math.acos(Math.max(-1, Math.min(1, d / n))) * 180 / Math.PI;
  };
  const lyingFlat = g => Math.abs(g[2]) / (Math.hypot(...g) || 1) > .85;
  const motionWanted = () => $('#optMotion').checked;

  function askMotionPermission() {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function' && Mo.permission !== 'granted') {
      DME.requestPermission().then(r => { Mo.permission = r; }, () => { Mo.permission = 'denied'; });
    }
  }
  window.addEventListener('devicemotion', e => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    const v = [g.x, g.y, g.z];
    Mo.seen = true;
    if (!Mo.lp) Mo.lp = v.slice();
    const jerk = Math.hypot(v[0] - Mo.lp[0], v[1] - Mo.lp[1], v[2] - Mo.lp[2]);
    for (let i = 0; i < 3; i++) Mo.lp[i] = Mo.lp[i] * .85 + v[i] * .15;
    const now = performance.now(), dt = Mo.t ? Math.min(.1, (now - Mo.t) / 1000) : 0; Mo.t = now;
    Mo.still = jerk > 1.2 ? 0 : Mo.still + dt;

    if (P.phase !== 'focus' || !Mo.base || !motionWanted()) return;
    const ang = angleBetween(Mo.lp, Mo.base);
    if (!Mo.picked) {
      const disturbed = ang > 20 || jerk > 3.5;
      Mo.score = disturbed ? Mo.score + dt : Math.max(0, Mo.score - dt * .5);
      if (Mo.score > .6) { Mo.picked = true; Mo.score = 0; Mo.lastNag = Date.now(); onPickUp(); }
    } else if ((Mo.still > 1.5 && ang < 15) || (Mo.still > 3 && lyingFlat(Mo.lp))) {
      Mo.base = Mo.lp.slice(); Mo.picked = false; onPutDown();
    } else if (Date.now() - Mo.lastNag > 20000) {
      Mo.lastNag = Date.now();
      enqueue(() => strike({ reason: tr('啪!還在滑?把手機放回去。'), counted: true }));
    }
  });
  function onPickUp() {
    setStatus(tr('拿起手機了'), 'hit');
    sitterEl.dataset.face = 'peek';
    enqueue(() => strike({ reason: tr('啪!手機拿起來了。放回原位才能繼續。'), counted: true }));
    enqueue(leaveTip);
  }
  // caught for the first time: if it was something that couldn't wait, this is the button for next time
  async function leaveTip() {
    if (P.phase !== 'focus' || P.leaveUsed || store.get('keisaku-tip-leave-v1', false)) return;
    store.set('keisaku-tip-leave-v1', true);
    tour([{ target: '#leaveBtn', act: true, skipLabel: tr('知道了'),
      text: tr('如果真的有事要用手機,先按「暫離」,計時會暫停,就不會挨打了。每炷可以用一次。'), hint: tr('👆 現在就要暫離的話,點一下「暫離」') }]);
  }
  function onPutDown() {
    setStatus(tr('坐禪中・第 {0} 炷', P.round), 'on');
    toast(tr('回座了,繼續專心。'));
  }
  // only shown when pick-ups can't be caught; the details say why
  function renderSense(why) {
    const box = $('#sense');
    box.hidden = !why; box.open = false;
    if (why) $('#senseMode').textContent = why + tr('拿起手機不會被發現,但切到別的 App 或分頁還是會被打。');
  }

  /* ---------- pomodoro phases ---------- */
  // idle (dialogue) → settle → focus → break → ready (dialogue) → settle → focus … → last focus → result → idle
  const P = { phase: 'idle', round: 1, end: 0, start: 0, hits: 0, roundHits: 0, asks: 0, focusTotal: 0,
              hiddenAt: 0, confirmEnd: 0, todayMin: 0, todayHits: 0, settleTimer: 0,
              leaveUsed: false, leaveAt: 0, leaveMs: 0, left: 0, resuming: false, breakEnd: 0, lateMin: 0, awaitReturn: false };
  function loadToday() {
    const log = readLog().filter(e => e.d === dayKey());
    P.todayMin = log.reduce((a, e) => a + e.min, 0);
    P.todayHits = log.reduce((a, e) => a + e.hits, 0);
    P.todayRounds = log.filter(e => e.full).length;
  }
  // full: the round ran to the end (only full rounds earn a stamp)
  function saveRound(min, full) {
    if (min <= 0 && P.roundHits === 0) return;
    const log = readLog();
    const e = { t: Date.now(), d: dayKey(), task: cfg.task, min, hits: P.roundHits, full };
    if (P.leaveUsed) e.leave = 1;
    const goal = goalNow();
    if (goal) e.goal = goal;
    if (full) { P.todayRounds++; if (goal && P.todayRounds === goal) P.goalJustMet = true; }
    if (P.lateMin) e.late = P.lateMin;
    log.push(e);
    P.lateMin = 0;
    renderStreakBadge(streakInfo(dayMap(log)).streak);
    writeLog(log);
    if (full) collectAfterRound(log);
    P.todayMin += min;
    askPersist();
  }
  function applyCfg() { store.set('keisaku-last-v1', cfg); renderAll(); }
  function renderStats() {
    $('#stToday').textContent = P.todayMin;
    $('#stTodayHits').textContent = P.todayHits;
    $('#todayHitsWrap').hidden = P.todayHits === 0;
    const goal = goalNow(), tg = $('#todayGoal');
    tg.hidden = !goal;
    if (goal) {
      const met = P.todayRounds >= goal;
      tg.innerHTML = tr(' · <b>{0}</b>/{1} 炷', P.todayRounds, goal) + (met ? tr(' <span class="met-mark" aria-label="達成">達</span>') : '');
      tg.classList.toggle('met', met);
    }
  }
  function renderRounds() {
    const box = $('#rounds');
    while (box.children.length < cfg.rounds) box.appendChild(document.createElement('i'));
    while (box.children.length > cfg.rounds) box.lastChild.remove();
    const started = P.phase !== 'idle';
    [...box.children].forEach((el, i) => {
      const n = i + 1;
      el.className = !started ? '' : n < P.round || (n === P.round && P.phase === 'break') ? 'done' : n === P.round ? 'now' : '';
    });
    $('#roundLabel').innerHTML = started
      ? tr('{0}・第 <b>{1}</b>/{2} 炷', escapeHtml(cfg.task), P.round, cfg.rounds)
      : tr('{0}・<b>{1}</b> 分 × {2} 炷', escapeHtml(cfg.task), cfg.focusMin, cfg.rounds);
  }
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function setStatus(text, state) {
    statusEl.textContent = text.replace(/・第 \d+ 炷$/, ''); statusEl.dataset.state = state || '';
    askBtn.hidden = P.phase !== 'focus';            // asking for a strike only makes sense while sitting
    $('#stageWrap').dataset.phase = P.phase;       // the night lamp burns low during the break
    leaveBtn.hidden = P.phase !== 'focus' || P.leaveUsed;
    backBtn.hidden = P.phase !== 'leave';
    $('#notifyAsk').hidden = !(P.phase === 'break' && notifyAskable());
  }
  function setMain(text, { warn = false } = {}) {
    mainBtn.hidden = text == null;
    if (text != null) { mainBtn.textContent = text; mainBtn.classList.toggle('warn', warn); }
  }
  function renderAll() {
    renderRounds(); renderStats(); tick();
    if (P.phase === 'idle') { setStatus(tr('報到中'), ''); setMain(null); }
  }
  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function setIncense(frac, lit) {
    const h = 44 * Math.max(0, Math.min(1, frac)), top = 140 - h;
    $('#incense').setAttribute('y', top); $('#incense').setAttribute('height', h);
    $('#ember').setAttribute('cy', top);
    $('#ember').style.opacity = lit && frac > 0 ? '' : 0;
    $('#smoke').setAttribute('transform', `translate(0 ${top - 96})`);
    $('#smoke').style.display = lit && frac > 0 ? '' : 'none';
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock && (P.phase === 'settle' || P.phase === 'focus')) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch {}
  }
  function letSleep() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }

  function beginSettle() {
    if (P.round === 1) { P.hits = 0; P.asks = 0; P.focusTotal = 0; }
    P.phase = 'settle'; P.roundHits = 0; P.leaveUsed = false; P.leaveMs = 0; P.resuming = false;
    enqueue(takeStick);
    $('#result').hidden = true;
    renderRounds(); renderStats(); keepAwake(); settleMonk();
    sitterEl.dataset.face = 'calm';
    setStatus(tr('落座中'), 'on');
    setMain(tr('取消'));
    settleCountdown(cfg.focusMin * 60000, beginFocus);
  }
  // give the phone three seconds to be put down, then remember how it lies
  function settleCountdown(showMs, done) {
    const useMotion = motionWanted();
    let count = 3;
    const step = () => {
      if (P.phase !== 'settle') return;
      if (!useMotion) { done(false); return; }
      if (count > 0) {
        toast(tr('手機放好別動… {0}', count));
        clockEl.textContent = fmt(showMs);
        count--; P.settleTimer = setTimeout(step, 1000); return;
      }
      if (!Mo.seen) { done(false); return; }             // no sensor: fall back to screen-only
      if (Mo.still < .8) { toast(tr('手機還在動,放好別碰它…')); P.settleTimer = setTimeout(step, 700); return; }
      done(true);
    };
    step();
  }
  function senseFor(withMotion) {
    if (withMotion || !motionWanted()) renderSense(null);
    else renderSense(Mo.permission === 'denied' ? tr('平衡儀的權限被拒絕了,') : tr('這台裝置讀不到平衡儀,'));
  }

  /* ---------- 暫離: step away once per round without being struck ---------- */
  function startLeave() {
    if (P.phase !== 'focus' || P.leaveUsed) return;
    P.left = Math.max(0, P.end - Date.now());
    P.phase = 'leave'; P.leaveUsed = true; P.leaveAt = Date.now();
    Mo.base = null; Mo.picked = false;
    stopBackground(1.2); letSleep(); renderSense(null);
    sitterEl.dataset.face = 'peek'; standUp();
    setStatus(tr('暫離中'), '');
    setMain(tr('出堂・結束'));
    bubble(tr('去吧,快去快回。')); P.leaveBubble = setTimeout(() => bubble(null), 2400);
    toast(tr('計時暫停。回來按「回座」繼續。'), false, 4200);
    tick();
  }
  async function endLeave() {
    if (P.phase !== 'leave') return;
    P.leaveMs += Date.now() - P.leaveAt;
    clearTimeout(P.leaveBubble); bubble(null);
    P.phase = 'settle'; P.resuming = true;
    audio(); askMotionPermission();
    sitterEl.dataset.face = 'calm';
    setStatus(tr('回座中'), 'on');
    setMain(tr('出堂・結束'));
    keepAwake();
    await sitDown();
    settleCountdown(P.left, resumeFocus);
  }
  function resumeFocus(withMotion) {
    P.phase = 'focus'; P.resuming = false;
    P.end = Date.now() + P.left;
    Mo.base = withMotion ? Mo.lp.slice() : null; Mo.picked = false; Mo.score = 0;
    senseFor(withMotion);
    setStatus(tr('坐禪中・第 {0} 炷', P.round), 'on');
    setMain(tr('出堂・結束'));
    bell(0, .2);
    Amb.timers.push(setTimeout(() => { if (P.phase === 'focus') startBackground(); }, 1500));
    toast(tr('回座了,繼續。'));
  }
  leaveBtn.addEventListener('click', () => { audio(); startLeave(); });
  backBtn.addEventListener('click', endLeave);

  function beginFocus(withMotion) {
    P.phase = 'focus';
    P.start = Date.now(); P.end = P.start + cfg.focusMin * 60000;
    Mo.base = withMotion ? Mo.lp.slice() : null; Mo.picked = false; Mo.score = 0;
    senseFor(withMotion);
    setStatus(tr('坐禪中・第 {0} 炷', P.round), 'on');
    setMain(tr('出堂・結束'));
    renderRounds();
    bells(3);
    Amb.timers.push(setTimeout(() => { if (P.phase === 'focus') startBackground(); }, 3800));
    toast(P.round === 1 ? tr('止靜。住持開始巡堂了。') : tr('第 {0} 炷,止靜。', P.round));
  }

  function endFocus() {
    stopBackground(2.5);
    P.focusTotal += cfg.focusMin;
    saveRound(cfg.focusMin, true); renderStats();
    bell(0, .26); buzz([200, 120, 200]);
    const goalMet = P.goalJustMet; P.goalJustMet = false;
    if (P.round >= cfg.rounds) { P.showGoal = goalMet; finishCycle(false); return; }
    P.phase = 'break';
    P.end = Date.now() + cfg.breakMin * 60000;
    Mo.base = null; Mo.picked = false;
    letSleep(); renderSense(null);
    sitterEl.dataset.face = 'happy'; standUp();
    setStatus(tr('休息'), '');
    setMain(tr('跳過休息'));
    toast(goalMet ? tr('今日目標 {0} 炷達成!休息 {1} 分鐘。', goalNow(), cfg.breakMin) : tr('開靜。這炷被打 {0} 下,休息 {1} 分鐘,手機可以用了。', P.roundHits, cfg.breakMin));
    enqueue(returnStick);
    renderRounds(); settleMonk();
  }

  function endBreak() {
    bells(2); buzz([120, 80, 120]);
    P.breakEnd = P.end;
    P.round++;
    P.phase = 'ready';
    sitterEl.dataset.face = 'peek';
    setStatus(tr('該回座了'), 'on');
    setMain(null);
    renderRounds(); tick();
    if (document.hidden) { P.awaitReturn = true; notifyBreakOver(); return; }   // wait until they come back
    callBack();
  }
  // back in the zendo after a break: a word from the monk if the break ran long
  function callBack() {
    P.awaitReturn = false;
    const late = Date.now() - P.breakEnd;
    P.lateMin = late >= 60000 ? Math.round(late / 60000) : 0;
    readyCheck(P.lateMin ? tr('休息超過 {0} 分鐘了喔。第 {1} 炷,', P.lateMin, P.round) : tr('休息結束。第 {0} 炷,', P.round));
  }

  /* ---------- break-over notification (best effort: the page may be frozen in the background) ---------- */
  const canNotify = () => 'Notification' in window && 'serviceWorker' in navigator && location.protocol.startsWith('http');
  const notifyAskable = () => canNotify() && Notification.permission === 'default' && !store.get('keisaku-notify-asked', false);
  async function notifyBreakOver() {
    if (!canNotify() || !$('#optNotify').checked || Notification.permission !== 'granted') return;
    const body = tr('第 {0} 炷要開始了,回來坐禪吧。', P.round);
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(tr('休息結束,該回座了'), { body, tag: 'keisaku-break', renotify: true, icon: 'icons/icon-192-v2.png', badge: 'icons/icon-192-v2.png', vibrate: [120, 80, 120] });
    } catch { try { new Notification(tr('休息結束,該回座了'), { body, tag: 'keisaku-break' }); } catch {} }
  }
  async function enableNotify() {
    store.set('keisaku-notify-asked', true);
    let perm = Notification.permission;
    if (perm !== 'granted') { try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; } }   // after a refusal this just answers 'denied' again
    $('#optNotify').checked = perm === 'granted';
    saveOpts();
    return perm;
  }

  function finishCycle(early) {
    stopBackground(2);
    clearTimeout(P.settleTimer);
    const hadFocus = P.focusTotal > 0 || P.hits > 0;
    P.phase = 'idle'; P.round = 1; P.resuming = false; P.awaitReturn = false; P.lateMin = 0;
    letSleep(); Mo.base = null; Mo.picked = false; standUp();
    setMain(null); setStatus(tr('報到中'), '');
    renderSense(null);
    enqueue(returnStick);
    renderRounds(); settleMonk();
    if (hadFocus) enqueue(async () => showResult(early));
    else onboarding(true);
  }

  function quitEarly() {
    const done = P.phase === 'focus' ? cfg.focusMin * 60000 - (P.end - Date.now())
      : P.phase === 'leave' || P.resuming ? cfg.focusMin * 60000 - P.left : -1;
    if (done >= 0) {
      const min = Math.floor(done / 60000);
      P.focusTotal += min; saveRound(min, false); renderStats();
    }
    finishCycle(true);
  }

  const KOANS = [tr('日日是好日。'), tr('喫茶去。'), tr('步步是道場。'), tr('莫妄想。'), tr('一期一會。'), tr('行住坐臥,皆是禪。'), tr('放下著。')];
  function showResult(early) {
    let seal, line2;
    const perRound = P.hits / Math.max(1, cfg.rounds);
    if (P.hits === 0) { seal = tr('不動'); line2 = tr('一下都沒被打,如山不動。'); }
    else if (perRound <= 1) { seal = tr('精進'); line2 = tr('被打了 {0} 下,還算專心。', P.hits); }
    else { seal = tr('喝'); line2 = tr('被打了 {0} 下,肩膀辛苦了。', P.hits); }
    sitterEl.dataset.face = 'happy';
    $('#seal').replaceChildren(...[...seal].map(ch => Object.assign(document.createElement('i'), { textContent: ch })));
    $('#resultTitle').textContent = early ? tr('提早出堂') : tr('坐滿 {0} 炷', cfg.rounds);
    $('#resultLine1').textContent = tr('「{0}」共坐了 {1} 分鐘', cfg.task, P.focusTotal) + (P.asks ? tr(',自己請打 {0} 下', P.asks) : '');
    $('#resultLine2').textContent = line2;
    $('#koan').textContent = KOANS[Math.floor(Math.random() * KOANS.length)];
    const goal = goalNow(), metToday = goal && P.todayRounds >= goal;
    $('#resultGoal').hidden = !metToday;
    $('#resultGoal').textContent = P.showGoal ? tr('今日目標 {0} 炷,達成。', goal) : metToday ? tr('今日目標 {0} 炷已達成,今天坐了 {1} 炷。', goal, P.todayRounds) : '';
    P.showGoal = false;
    $('#resultNew').hidden = !(P.newItems || []).length;
    $('#resultNew').textContent = (P.newItems || []).length ? newItemsLine(P.newItems) : '';
    prepareShare();
    $('#result').hidden = false; askBtn.hidden = true;
  }

  function tick() {
    if (P.phase === 'focus' || P.phase === 'break') {
      const left = P.end - Date.now();
      clockEl.textContent = fmt(left);
      if (P.phase === 'focus') setIncense(left / (cfg.focusMin * 60000), true);
      else setIncense(1, false);
      if (left <= 0) {
        if (P.phase === 'focus') { if (!document.hidden) endFocus(); }
        else endBreak();
      }
    } else if (P.phase === 'leave') {
      clockEl.textContent = fmt(P.left);
      setIncense(P.left / (cfg.focusMin * 60000), false);
    } else if (P.phase !== 'settle') {
      clockEl.textContent = fmt(cfg.focusMin * 60000);
      setIncense(1, false);
    }
  }
  setInterval(tick, 250);

  /* ---------- leaving the screen ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { P.hiddenAt = P.phase === 'focus' ? Date.now() : 0; return; }
    keepAwake();
    if (P.awaitReturn && P.phase === 'ready') { callBack(); return; }
    if (!P.hiddenAt) return;
    const away = Math.min(Date.now(), P.end) - P.hiddenAt; P.hiddenAt = 0;
    if (away < 2000) { tick(); return; }
    const secs = Math.round(away / 1000);
    const label = secs >= 60 ? tr('{0} 分 {1} 秒', Math.floor(secs / 60), secs % 60) : tr('{0} 秒', secs);
    sitterEl.dataset.face = 'peek';
    setStatus(tr('被抓到了'), 'hit');
    enqueue(() => strike({ reason: tr('啪!離開畫面 {0}。', label), counted: true }));
    if (secs >= 90) enqueue(() => strike({ reason: tr('啪!離開太久,再補一下。'), counted: true }));
    enqueue(async () => { if (P.phase === 'focus') setStatus(tr('坐禪中・第 {0} 炷', P.round), 'on'); });
    enqueue(leaveTip);
    tick();
  });

  /* ---------- controls ---------- */
  mainBtn.addEventListener('click', () => {
    switch (P.phase) {
      case 'settle': case 'leave': quitEarly(); break;
      case 'break': P.end = Date.now(); tick(); break;
      case 'focus':
        if (Date.now() - P.confirmEnd < 3000) { quitEarly(); break; }
        P.confirmEnd = Date.now();
        setMain(tr('確定要出堂?'), { warn: true });
        setTimeout(() => { if (P.phase === 'focus') setMain(tr('出堂・結束')); }, 3000);
        break;
    }
  });
  askBtn.addEventListener('click', () => {
    audio();
    if (busy) return;
    enqueue(() => strike({ reason: tr('啪!精神一振,謝謝師父。'), counted: false }));
  });
  // Install to home screen: Chrome/Android fire beforeinstallprompt; iOS Safari needs the share menu.
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const inFrame = window.top !== window;
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); installEvent = e;
    $('#installBox').hidden = false; $('#installBtn').hidden = false;
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch {}
    installEvent = null; $('#installBtn').hidden = true; $('#installBox').hidden = $('#iosTip').hidden;
  });
  window.addEventListener('appinstalled', () => { $('#installBox').hidden = true; });
  if (!standalone && !inFrame && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    $('#installBox').hidden = false; $('#iosTip').hidden = false;
  }

  // 坐禪帳 / 說明 / 設定 open as sheets over the hall, so the timer and the monk keep going underneath
  function openSheet(d) {
    document.querySelectorAll('dialog.sheet[open]').forEach(x => x.close());
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  // the 坐禪帳 scroll rolls itself back up before it closes
  // closing: roll up, then the rolled scroll turns on its side and flies back into the button that opened it
  async function closeSheet(d) {
    if (!d.open || d.classList.contains('closing')) return;
    if (!d.classList.contains('scroll') || reduceMotion || !d.animate) { d.close(); return; }
    d.classList.add('closing');
    await sleep(820);                                   // the CSS roll-up
    const wrap = d.querySelector('.scroll-wrap'), btn = $('#' + d.id + 'Btn');
    const w = wrap.getBoundingClientRect(), t = btn.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (w.left + w.width / 2), dy = t.top + t.height / 2 - (w.top + w.height / 2);
    try {
      await wrap.animate([
        { transform: 'none', opacity: 1 },
        { transform: `translate(0px, -10px) rotate(-90deg) scale(.62)`, opacity: 1, offset: .38 },
        { transform: `translate(${dx}px, ${dy}px) rotate(-90deg) scale(.1)`, opacity: .2 }
      ], { duration: 700, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished;
    } catch {}
    d.classList.remove('closing'); d.close();
    wrap.getAnimations().forEach(a => a.cancel());
    btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' });
  }
  document.querySelectorAll('dialog.sheet').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) closeSheet(d); });     // tap the dimmed backdrop
    d.addEventListener('cancel', e => { e.preventDefault(); closeSheet(d); });   // Esc
    d.querySelector('.sheet-close').addEventListener('click', () => closeSheet(d));
  });
  const helpBox = $('#help');
  $('#helpBtn').addEventListener('click', () => openSheet(helpBox));
  $('#settingsBtn').addEventListener('click', () => openSheet($('#settings')));
  // settings are remembered on this device
  const opts = store.get('keisaku-opts-v1', {});
  if (typeof opts.motion === 'boolean') $('#optMotion').checked = opts.motion;
  if (typeof opts.sound === 'boolean') $('#optSound').checked = opts.sound;
  $('#optNotify').checked = !!opts.notify && canNotify() && Notification.permission === 'granted';
  $('#optNotifyRow').hidden = !canNotify();
  const goalNow = () => +((document.querySelector('input[name="goal"]:checked') || {}).value || 0);
  if ([2, 4, 6, 8].includes(opts.goal)) document.querySelector(`input[name="goal"][value="${opts.goal}"]`).checked = true;
  document.querySelectorAll('input[name="goal"]').forEach(r => r.addEventListener('change', () => { saveOpts(); renderStats(); }));
  const langNow = () => (document.querySelector('input[name="lang"]:checked') || {}).value || 'auto';
  if (['zh', 'ja', 'en'].includes(opts.lang)) document.querySelector(`input[name="lang"][value="${opts.lang}"]`).checked = true;
  // a new language needs a fresh page; mid-sitting it waits for the next visit
  document.querySelectorAll('input[name="lang"]').forEach(r => r.addEventListener('change', () => {
    saveOpts();
    if (P.phase === 'idle' || P.phase === 'ready') location.reload();
    else toast(tr('下次打開時換成新的語言。'));
  }));
  const themeNow = () => (document.querySelector('input[name="theme"]:checked') || {}).value || 'system';
  const saveOpts = () => store.set('keisaku-opts-v1', { motion: $('#optMotion').checked, sound: $('#optSound').checked, notify: $('#optNotify').checked, goal: goalNow(), theme: themeNow(), lang: langNow(),
    ambient: ambientChoice(), ambVol: +$('#ambVol').value, music: musicOn() });
  if (typeof opts.music === 'boolean') $('#ambMusic').checked = opts.music;
  if (AMBIENT_LABEL[opts.ambient]) document.querySelector(`input[name="ambient"][value="${opts.ambient}"]`).checked = true;
  if (typeof opts.ambVol === 'number') $('#ambVol').value = opts.ambVol;
  const previewBtn = $('#ambPreview');
  let previewing = false;
  function setPreview(on) {
    previewing = on;
    previewBtn.textContent = on ? tr('停止試聽') : tr('試聽');
    previewBtn.setAttribute('aria-pressed', String(on));
    if (on || P.phase === 'focus') startBackground();   // when a sitting is on, go back to what it was playing
    else stopBackground(.8);
  }
  previewBtn.addEventListener('click', () => setPreview(!previewing));
  document.querySelectorAll('input[name="ambient"]').forEach(r => r.addEventListener('change', () => {
    saveOpts();
    syncPreviewBtn();
    if (previewing || P.phase === 'focus') startAmbient(ambientChoice());
    if (previewing && nothingChosen()) setPreview(false);
  }));
  $('#ambMusic').addEventListener('change', () => {
    saveOpts(); syncPreviewBtn();
    if (previewing || P.phase === 'focus') { if (musicOn()) startMusic(); else stopMusic(1.5); }
    if (previewing && nothingChosen()) setPreview(false);
  });
  function nothingChosen() { return ambientChoice() === 'none' && !musicOn(); }
  function syncPreviewBtn() { previewBtn.disabled = nothingChosen(); }
  syncPreviewBtn();
  $('#ambVol').addEventListener('input', () => {
    const t = audio().currentTime;
    if (Amb.out) Amb.out.gain.setTargetAtTime(ambientVolume(), t, .1);
    if (Mus.out) Mus.out.gain.setTargetAtTime(ambientVolume(), t, .1);
  });
  $('#ambVol').addEventListener('change', saveOpts);
  $('#settings').addEventListener('close', () => { if (previewing) setPreview(false); });
  ['optMotion', 'optSound'].forEach(id => $('#' + id).addEventListener('change', saveOpts));
  $('#optNotify').addEventListener('change', async e => {
    if (!e.target.checked) { saveOpts(); return; }
    if (await enableNotify() === 'denied') toast(tr('通知被封鎖了,要到手機的 App 設定裡打開。'), false, 4200);
  });
  $('#notifyAsk').addEventListener('click', async () => {
    const perm = await enableNotify();
    $('#notifyAsk').hidden = true;
    toast(perm === 'granted' ? tr('好,休息結束時會用通知叫你。') : tr('沒關係,休息結束時聽鐘聲回座。'), false, 3600);
  });

  // appearance: follow the phone, or force light / dark (the tokens already handle [data-theme])
  const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')].map(m => [m, m.content]);
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    // keep the installed app's status bar in step with the chosen look
    themeMetas.forEach(([m, original]) => { m.content = theme === 'light' ? '#e9ecdf' : theme === 'dark' ? '#141816' : original; });
  }
  const savedTheme = ['light', 'dark'].includes(opts.theme) ? opts.theme : 'system';
  document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
  applyTheme(savedTheme);
  document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', () => { applyTheme(themeNow()); saveOpts(); }));

  /* ---------- 坐禪帳: log, stamps, calendar, backup ---------- */
  const LOG_KEY = 'keisaku-log-v2';
  const pad2 = n => String(n).padStart(2, '0');
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  // an entry from a backup: dates, whole non-negative numbers in sensible ranges, text where text belongs
  const validEntry = e => !!e && typeof e === 'object' && typeof e.t === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.d)
    && isInt(e.min, 0, 240) && isInt(e.hits, 0, 999)
    && (e.task === undefined || typeof e.task === 'string') && (e.full === undefined || typeof e.full === 'boolean');
  const cleanEntry = e => {
    const c = { t: e.t, d: e.d, task: (e.task || tr('專注')).slice(0, 12), min: e.min, hits: e.hits, full: !!e.full };
    if (e.leave === 1) c.leave = 1;
    if (isInt(e.late, 1, 1440)) c.late = e.late;
    if (isInt(e.goal, 1, 8)) c.goal = e.goal;
    return c;
  };
  function readLog() {
    let log = store.get(LOG_KEY, null);
    if (!Array.isArray(log)) {
      // v1 kept 30 days with toDateString() dates and no "full" flag
      log = store.get('keisaku-log-v1', []).filter(e => e && typeof e.t === 'number')
        .map(e => ({ t: e.t, d: dayKey(e.t), task: e.task || tr('專注'), min: e.min || 0, hits: e.hits || 0, full: (e.min || 0) >= 15 }));
      store.set(LOG_KEY, log);
    }
    return log;
  }
  const writeLog = log => store.set(LOG_KEY, log.sort((a, b) => a.t - b.t));
  function askPersist() {
    if (store.get('keisaku-persist-asked', false)) return;
    store.set('keisaku-persist-asked', true);
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch {}
  }

  function dayMap(log) {
    const m = new Map();
    for (const e of log) {
      let a = m.get(e.d);
      if (!a) { a = { min: 0, hits: 0, full: 0, tasks: new Map() }; m.set(e.d, a); }
      a.min += e.min; a.hits += e.hits; if (e.full) a.full++;
      a.goal = Math.max(a.goal || 0, e.goal || 0);
      const t = a.tasks.get(e.task) || { rounds: 0, partial: 0, min: 0, hits: 0, leave: 0, late: 0 };
      t.leave += e.leave || 0; t.late += e.late || 0;
      if (e.full) t.rounds++; else t.partial++;
      t.min += e.min; t.hits += e.hits;
      a.tasks.set(e.task, t);
    }
    return m;
  }
  function stampKind(a) {
    if (!a) return null;
    if (!a.full) return a.min > 0 || a.hits > 0 ? 'dot' : null;
    if (!a.hits) return 'still';
    return a.min >= 75 ? 'full' : a.min >= 25 ? 'mid' : 'light';
  }
  function streakInfo(m) {
    const sat = k => (m.get(k)?.full || 0) > 0;
    const d = new Date(); d.setHours(12, 0, 0, 0);
    if (!sat(dayKey(d))) d.setDate(d.getDate() - 1);          // today not done yet still keeps the streak
    let streak = 0;
    while (sat(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    let lastDay = null;
    for (const [k, a] of m) if (a.full && (!lastDay || k > lastDay)) lastDay = k;
    const gap = lastDay ? Math.round((new Date(dayKey() + 'T12:00') - new Date(lastDay + 'T12:00')) / 864e5) : null;
    return { streak, gap };
  }

  // stamps (design G): 坐 seals by minutes, gassho seal for 75+ min, square 不動 for a clean day
  const OPACITY = { light: .45, mid: .75, full: 1 };
  // each day gets its own slightly crooked, slightly off-centre impression (stable for that date)
  const jitter = key => {
    let h = 2166136261;
    for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return { a: (h % 15) - 7, x: ((h >>> 5) % 9) - 4, y: ((h >>> 11) % 9) - 4 };
  };
  const HANDS = '<g transform="translate(50 52) scale(.74) translate(-50 -50)">' +
    '<path d="M34 62 L66 62 L74 84 L26 84 Z" fill="var(--shu)"/><path d="M50 64 L44 85 L56 85 Z" fill="var(--surface)"/>' +
    '<path d="M50 14 C41 16 36.5 27 36 40 L35.5 62 L64.5 62 L64 40 C63.5 27 59 16 50 14 Z" fill="var(--shu)"/>' +
    '<path d="M50 19 L50 60 M43 24 L43 38 M57 24 L57 38" stroke="var(--surface)" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="36.5" cy="47" rx="5.5" ry="11" transform="rotate(-10 36.5 47)" fill="var(--shu)" stroke="var(--surface)" stroke-width="2.4"/>' +
    '<ellipse cx="63.5" cy="47" rx="5.5" ry="11" transform="rotate(10 63.5 47)" fill="var(--shu)" stroke="var(--surface)" stroke-width="2.4"/></g>';
  function stampSvg(kind, key) {
    if (!kind) return '';
    if (kind === 'dot') { const j = jitter(key); return `<svg viewBox="0 0 100 100"><circle cx="${50 + j.x * 2}" cy="${56 + j.y}" r="7" fill="var(--shu)" opacity=".4"/></svg>`; }
    const j = jitter(key);
    if (kind === 'still') {
      return `<svg viewBox="0 0 100 100"><g filter="url(#ink)" transform="translate(${j.x} ${j.y}) rotate(${j.a - 3} 50 54)"><rect x="17" y="20" width="66" height="66" rx="7" fill="var(--shu)"/>` +
        tr('<text x="50" y="49" text-anchor="middle" class="scroll-char" font-size="26" fill="#fff7ef">不</text><text x="50" y="77" text-anchor="middle" class="scroll-char" font-size="26" fill="#fff7ef">動</text></g></svg>');
    }
    const rings = kind === 'full'
      ? '<circle cx="50" cy="52" r="36" fill="none" stroke="var(--shu)" stroke-width="5"/><circle cx="50" cy="52" r="28" fill="none" stroke="var(--shu)" stroke-width="2"/>'
      : '<circle cx="50" cy="52" r="34" fill="none" stroke="var(--shu)" stroke-width="5"/>';
    const inner = kind === 'full' ? HANDS : tr('<text x="50" y="65" text-anchor="middle" class="scroll-char" font-size="34" fill="var(--shu)">坐</text>');
    return `<svg viewBox="0 0 100 100"><g filter="url(#ink)" opacity="${OPACITY[kind]}" transform="translate(${j.x} ${j.y}) rotate(${j.a} 50 52)">${rings}${inner}</g></svg>`;
  }
  const KIND_LABEL = { light: tr('未滿 25 分'), mid: tr('25–74 分'), full: tr('75 分以上'), still: tr('坐滿、0 下'), dot: tr('沒坐滿一炷') };
  // what the big stamp in the day detail means, in words
  const KIND_MEANING = {
    light: tr('淡淡的「坐」章:這天坐了不到 25 分鐘。'), mid: tr('「坐」章:這天坐了 25 到 74 分鐘。'),
    full: tr('合掌章:這天坐了 75 分鐘以上。'), still: tr('「不動」章:坐滿一炷以上,一下都沒被打。'),
    dot: tr('小紅點:這天有來坐,但還沒坐滿一炷。')
  };

  const J = { y: 0, m: 0, sel: '' };          // shown month (m: 0-11) and selected day
  const journalBtn = $('#journalBtn'), journalBox = $('#journal');
  function renderJournal() {
    const log = readLog(), m = dayMap(log), todayK = dayKey();
    const { streak } = streakInfo(m);
    $('#streak').textContent = streak >= 1 ? tr('連續 {0} 日', streak) : '';
    renderStreakBadge(streak);
    $('#monthTitle').textContent = tr('{0} 年 {1} 月', J.y, J.m + 1);
    const now = new Date();
    $('#nextMonth').disabled = J.y > now.getFullYear() || (J.y === now.getFullYear() && J.m >= now.getMonth());
    const prefix = `${J.y}-${pad2(J.m + 1)}-`;
    let days = 0, mins = 0, hits = 0;
    for (const [k, a] of m) if (k.startsWith(prefix)) { if (a.full) days++; mins += a.min; hits += a.hits; }
    $('#monthSum').textContent = tr('本月坐禪 {0} 日・共 {1} 分・被打 {2} 下', days, mins, hits);

    const cal = $('#cal'); cal.replaceChildren();
    tr('日一二三四五六').split('').forEach(w => cal.appendChild(Object.assign(document.createElement('div'), { className: 'dow', textContent: w })));
    const first = new Date(J.y, J.m, 1).getDay(), count = new Date(J.y, J.m + 1, 0).getDate();
    for (let i = 0; i < first; i++) cal.appendChild(document.createElement('div'));
    for (let d = 1; d <= count; d++) {
      const key = prefix + pad2(d), a = m.get(key), kind = stampKind(a);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'cell' + (key === todayK ? ' today' : '') + (key === J.sel ? ' sel' : '') + (key > todayK ? ' future' : '');
      b.disabled = key > todayK;
      const met = a && a.goal && a.full >= a.goal;
      b.setAttribute('aria-label', tr('{0} 月 {1} 日', J.m + 1, d) + (a ? tr(',坐 {0} 分,被打 {1} 下', a.min, a.hits) : '') + (met ? tr(',達成每日目標') : ''));
      b.innerHTML = `<span class="d">${d}</span>` + stampSvg(kind, key) + (met ? tr('<span class="met-mark" aria-hidden="true">達</span>') : '');
      b.addEventListener('click', () => { J.sel = key; renderJournal(); });
      cal.appendChild(b);
    }
    $('#calLegend').innerHTML = ['light', 'mid', 'full', 'still', 'dot']
      .map(k => `<span><b class="key">${stampSvg(k, 'legend')}</b>${KIND_LABEL[k]}</span>`).join('')
      + (log.some(e => e.goal) ? tr('<span><b class="key"><i class="met-mark">達</i></b>達成每日目標</span>') : '');
    renderDay(m);
  }
  function renderDay(m) {
    const box = $('#dayDetail'), key = J.sel, a = m.get(key);
    const dt = new Date(key + 'T12:00');
    const title = tr('{0} 月 {1} 日({2})', dt.getMonth() + 1, dt.getDate(), tr('日一二三四五六')[dt.getDay()]);
    if (!a) {
      box.innerHTML = `<div class="big"></div><h3></h3><p class="empty"></p>`;
      box.querySelector('h3').textContent = title;
      box.querySelector('.empty').textContent = key === dayKey() ? tr('今天還沒有坐禪。') : tr('這天沒有來坐禪。');
      return;
    }
    box.innerHTML = `<div class="big">${stampSvg(stampKind(a), key)}</div><h3></h3><p class="kind"></p><ul></ul>`;
    box.querySelector('.kind').textContent = KIND_MEANING[stampKind(a)] || '';
    box.querySelector('h3').textContent = tr('{0}・共 {1} 分・被打 {2} 下', title, a.min, a.hits) + (a.goal ? (a.full >= a.goal ? tr('・目標 {0} 炷達成', a.goal) : tr('・目標 {0}/{1} 炷', a.full, a.goal)) : '');
    const ul = box.querySelector('ul');
    for (const [task, t] of a.tasks) {
      const li = document.createElement('li');
      li.textContent = tr('{0} {1} 炷・{2} 分・被打 {3} 下', task, t.rounds, t.min, t.hits) + (t.leave ? tr('・暫離 {0} 次', t.leave) : '')
        + (t.late ? tr('・休息超時 {0} 分', t.late) : '') + (t.partial ? tr('(另有 {0} 次沒坐完)', t.partial) : '');
      ul.appendChild(li);
    }
  }
  journalBtn.addEventListener('click', () => {
    const n = new Date(); J.y = n.getFullYear(); J.m = n.getMonth(); J.sel = dayKey();
    renderJournal(); showTab(false); openSheet(journalBox);
  });
  $('#prevMonth').addEventListener('click', () => { if (--J.m < 0) { J.m = 11; J.y--; } renderJournal(); });
  $('#nextMonth').addEventListener('click', () => { if (++J.m > 11) { J.m = 0; J.y++; } renderJournal(); });

  // backup: a JSON file, or the same JSON as text for phones that can't save files easily
  const backupStatus = t => { $('#backupStatus').textContent = t; };
  const backupText = () => JSON.stringify({ app: 'keisaku-dojo', version: 2, exported: new Date().toISOString(),
    log: readLog(), presets: loadPresets(), collect: { scroll: C.scroll, wear: C.wear } });
  $('#exportBtn').addEventListener('click', () => {
    try {
      const url = URL.createObjectURL(new Blob([backupText()], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `keisaku-backup-${dayKey()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      backupStatus(tr('已匯出 {0} 筆紀錄。', readLog().length));
    } catch { backupStatus(tr('這裡沒辦法存檔,請改用「複製備份文字」。')); }
  });
  $('#copyBtn').addEventListener('click', () => {
    const text = backupText();
    const fallback = () => {
      $('#pasteBox').hidden = false; const ta = $('#pasteText'); ta.value = text; ta.select();
      backupStatus(tr('沒辦法自動複製,文字已經選取好了,請手動複製。'));
    };
    try { navigator.clipboard.writeText(text).then(() => backupStatus(tr('已複製備份文字,可以貼到記事本保存。')), fallback); } catch { fallback(); }
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    f.text().then(prepareImport, () => backupStatus(tr('讀不到這個檔案。')));
  });
  $('#pasteBtn').addEventListener('click', () => { $('#pasteBox').hidden = false; $('#pasteText').value = ''; $('#pasteText').focus(); });
  $('#pasteGo').addEventListener('click', () => prepareImport($('#pasteText').value));
  let pendingImport = null;
  function prepareImport(text) {
    let data;
    try { data = JSON.parse(text); } catch { backupStatus(tr('這不是香板禪堂的備份,讀不出來。')); return; }
    const incoming = (Array.isArray(data) ? data : data && data.log || []).filter(validEntry);
    if (!incoming.length) { backupStatus(tr('備份裡沒有任何紀錄。')); return; }
    const have = new Set(readLog().map(e => e.t + '|' + e.d));
    const fresh = incoming.filter(e => !have.has(e.t + '|' + e.d));
    pendingImport = { fresh, presets: Array.isArray(data.presets) ? data.presets.filter(validCfg) : [], collect: data && data.collect };
    $('#importMsg').textContent = fresh.length
      ? tr('備份裡有 {0} 筆紀錄,其中 {1} 筆是新的。要匯入嗎?', incoming.length, fresh.length)
      : tr('備份裡的 {0} 筆紀錄都已經在了,不用匯入。', incoming.length);
    $('#importYes').hidden = !fresh.length;
    $('#importConfirm').hidden = false; backupStatus('');
  }
  $('#importNo').addEventListener('click', () => { pendingImport = null; $('#importConfirm').hidden = true; });
  $('#importYes').addEventListener('click', () => {
    if (!pendingImport) return;
    const { fresh, presets, collect: wear } = pendingImport; pendingImport = null;
    writeLog(readLog().concat(fresh.map(cleanEntry)));
    if (presets.length && !loadPresets().length) store.set('keisaku-presets-v1', presets.slice(0, MAX_PRESETS));
    const plain = C.scroll === '靜' && !C.wear.head && !C.wear.body && !C.wear.extra;
    if (wear && typeof wear === 'object' && plain) {                      // only dress up a zendo that is still plain
      if (SCROLLS.some(x => x.id === wear.scroll)) C.scroll = wear.scroll;
      const ids = wear.wear && typeof wear.wear === 'object' ? Object.values(wear.wear) : [wear.acc];   // v18 backups, or an older single one
      for (const id of ids) { const it = ACCS.find(x => x.id === id); if (it) C.wear[it.slot] = it.id; }
    }
    C.seen = [...new Set([...C.seen, ...unlockedIds(readLog())])]; saveCollect(); renderScene();   // restored rounds are not "new"
    $('#importConfirm').hidden = true; $('#pasteBox').hidden = true;
    loadToday(); renderStats(); renderJournal();
    backupStatus(tr('匯入了 {0} 筆紀錄。', fresh.length));
    askPersist();
  });

  $('#closeResult').addEventListener('click', async () => { $('#result').hidden = true; await offerNewItems(); onboarding(true); journalTip(); });

  /* ---------- guided tour: the monk points at things; the lit spot has to be tapped to go on ---------- */
  const Tour = { active: false, next() {}, skip() {} };
  function tour(steps) {
    return new Promise(resolve => {
      const block = $('#tourBlock'), ring = $('#tourRing'), card = $('#tourCard');
      let i = 0;
      const place = () => {
        const r = $(steps[i].target).getBoundingClientRect(), pad = 6;
        Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      };
      const finish = () => {
        Tour.active = false; block.hidden = card.hidden = true;
        removeEventListener('resize', place); removeEventListener('scroll', place);
        resolve();
      };
      const show = () => {
        const s = steps[i];
        $(s.target).scrollIntoView({ block: 'nearest' });
        $('#tourText').textContent = s.text;
        $('#tourHint').textContent = s.hint || tr('👆 點一下亮起來的地方');
        $('#tourSkip').textContent = s.skipLabel || tr('略過導覽');
        $('#tourNext').textContent = s.nextLabel || tr('下一步');
        place(); setTimeout(place, 300);
        // keep the card out of the way: when the lit spot is low on the screen, the card goes to the top
        card.classList.toggle('at-top', $(s.target).getBoundingClientRect().top > innerHeight / 2);
        $('#tourNext').focus({ preventScroll: true });   // keyboard and screen-reader users move on from here
      };
      Tour.next = async () => {
        const s = steps[i];
        if (s.sheet) {
          // the tap does what it would do anyway: open the sheet; the tour waits until it is rolled up again
          const sheet = $(s.sheet), closed = new Promise(r => sheet.addEventListener('close', r, { once: true }));
          block.hidden = card.hidden = true;
          $(s.target).click();
          await closed;
          if (!Tour.active) return;
          block.hidden = card.hidden = false;
        }
        if (++i < steps.length) { show(); return; }
        finish(); s.go && s.go();
        if (s.act) $(s.target).click();
      };
      Tour.skip = finish;
      Tour.active = true; block.hidden = card.hidden = false;
      addEventListener('resize', place); addEventListener('scroll', place, { passive: true });
      show();
    });
  }
  // the whole screen is covered while the tour runs: only the lit spot moves it on, anything else nudges the ring
  $('#tourBlock').addEventListener('click', e => {
    const ring = $('#tourRing'), r = ring.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { Tour.next(); return; }
    ring.classList.remove('nudge'); void ring.offsetWidth; ring.classList.add('nudge');
  });
  $('#tourNext').addEventListener('click', () => Tour.next());
  $('#tourSkip').addEventListener('click', () => Tour.skip());
  // what the dojo is, said once on the first visit before the tour
  const INTRO = [
    [tr('歡迎來到香板禪堂,我是這裡的住持。'), tr('你好')],
    [tr('這裡是讓人專心的地方:把手機放下,一次坐一炷香,就像番茄鐘,坐完再休息。'), tr('然後呢?')],
    [tr('坐禪時我會在堂裡巡視。施主只要拿起手機,或切到別的畫面,我就用這支香板輕輕打你一下。'), tr('我會專心的'), true],
    [tr('先帶施主看看禪堂裡的東西。'), tr('好')],
  ];
  const introSteps = returning => [
    { target: '#helpBtn', sheet: '#help', text: (returning ? tr('禪堂重新布置過了,我帶施主看一下。') : '') + tr('禪堂的規矩寫在左邊這塊「堂規」木牌上,點開看看,看完收起來就好。'), hint: tr('👆 點一下「堂規」木牌') },
    { target: '#journalBtn', sheet: '#journal', text: tr('右邊柱子上掛的是坐禪帳。每坐完一炷,我就在上面蓋一個章。點開看看。'), hint: tr('👆 點一下坐禪帳') },
    collectStep(false),
    { target: '#settingsBtn', sheet: '#settings', text: tr('背景聲音、每日目標、深色淺色,都在這個齒輪裡調。'), hint: tr('👆 點一下齒輪') },
  ];
  // the first time a round is stamped, point at the ledger, and this time the tap opens it
  function journalTip() {
    if (store.get('keisaku-tip-journal-v1', false) || !readLog().some(e => e.full)) return;
    store.set('keisaku-tip-journal-v1', true);
    tour([{ target: '#journalBtn', text: tr('蓋好章了。點坐禪帳,看看今天的章吧。'), hint: tr('👆 點一下坐禪帳'), skipLabel: tr('等一下再看'), go: () => $('#journalBtn').click() }]);
  }
  $('#feedbackLink').addEventListener('click', e => {
    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const body = [tr('## 發生了什麼事'), '', '', tr('## 怎麼做會出現'), '', '', '---',
      tr('版本:{0}', $('#appVersion').textContent), tr('裝置:{0}', navigator.userAgent),
      tr('開啟方式:{0}', installed ? tr('已安裝的 App') : tr('瀏覽器')), tr('外觀:{0}', dark ? tr('深色') : tr('淺色'))].join('\n');
    e.currentTarget.href = 'https://github.com/patty60723/keisaku-dojo/issues/new?body=' + encodeURIComponent(body);
  });
  $('#openRules').addEventListener('click', () => openSheet(helpBox));
  $('#openJournal').addEventListener('click', () => $('#journalBtn').click());
  $('#replayTour').addEventListener('click', () => { $('#settings').close(); tour(introSteps(true)); });

  /* ---------- 坐禪帳: 統計 tab ---------- */
  let statRange = '7';
  function showTab(stats) {
    $('#tabCal').setAttribute('aria-selected', String(!stats));
    $('#tabStats').setAttribute('aria-selected', String(stats));
    $('#calView').hidden = stats; $('#statView').hidden = !stats;
    if (stats) renderStatView();
  }
  $('#tabCal').addEventListener('click', () => showTab(false));
  $('#tabStats').addEventListener('click', () => showTab(true));
  document.querySelectorAll('#statView .range button').forEach(b => b.addEventListener('click', () => {
    statRange = b.dataset.range;
    document.querySelectorAll('#statView .range button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderStatView();
  }));

  const WEEKDAY = tr('日一二三四五六');
  const fmtMin = m => m >= 60 ? tr('{0} 小時{1}', Math.floor(m / 60), m % 60 ? tr(' {0} 分', m % 60) : '') : tr('{0} 分', m);
  // one bucket per day for the last 7 / 30 days, or one per month for everything
  function statBuckets(log, range) {
    const m = dayMap(log), out = [];
    if (range !== 'all') {
      const n = +range, d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (n - 1));
      for (let i = 0; i < n; i++) {
        const k = dayKey(d), a = m.get(k), last = i === n - 1;
        out.push({ from: k, to: k, label: last ? tr('今') : n === 7 ? WEEKDAY[d.getDay()] : (n - 1 - i) % 7 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : '',
          title: `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY[d.getDay()]})`, min: a?.min || 0, rounds: a?.full || 0, hits: a?.hits || 0 });
        d.setDate(d.getDate() + 1);
      }
      return out;
    }
    const now = new Date();
    let y = now.getFullYear(), mo = now.getMonth() - 11;
    const first = log.reduce((acc, e) => e.d < acc ? e.d : acc, dayKey());
    const [fy, fm] = first.split('-').map(Number);
    if (fy * 12 + fm - 1 > y * 12 + mo) { y = fy; mo = fm - 1; }
    for (; y * 12 + mo <= now.getFullYear() * 12 + now.getMonth(); mo++) {
      if (mo > 11) { mo -= 12; y++; }
      const p = `${y}-${pad2(mo + 1)}-`;
      let min = 0, rounds = 0, hits = 0;
      for (const [k, a] of m) if (k.startsWith(p)) { min += a.min; rounds += a.full; hits += a.hits; }
      out.push({ from: p + '01', to: p + '31', label: tr('{0}月', mo + 1), title: tr('{0} 年 {1} 月', y, mo + 1), min, rounds, hits });
    }
    return out;
  }
  // a round number at or below the tallest bar, for the one gridline
  function gridValue(max) {
    const steps = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3000, 6000];
    return steps.filter(s => s <= max).pop() || 0;
  }
  // durations the way the monk would say them
  function talkMin(m) {
    if (m < 60) return tr('{0} 分鐘', m);
    const h = Math.round(m / 30) / 2, whole = Math.floor(h);
    return h === whole ? tr('{0} 小時', whole) : whole ? tr('{0} 小時半', whole) : tr('半小時');
  }
  // the monk's words for this page: spoken to the visitor, picking the one or two things worth saying
  function monkVerdict(log, range, cur) {
    if (!log.length) return tr('坐禪帳還是空的。施主坐完第一炷,我就幫你記上。');
    if (range === 'all') {
      const first = log.reduce((acc, e) => e.d < acc ? e.d : acc, dayKey()).split('-');
      const since = +first[0] === new Date().getFullYear() ? tr('{0} 月', +first[1]) : tr('{0} 年 {1} 月', first[0], +first[1]);
      if (!cur.rounds) return tr('施主從 {0}開始來,還沒坐滿過一炷呢。下次撐到開靜的鐘聲,我幫你蓋章。', since);
      const top = [...cur.tasks].sort((a, b) => b[1].min - a[1].min)[0];
      return tr('施主從 {0}開始來,一共坐了 {1}。', since, talkMin(cur.min)) +
        (cur.tasks.size > 1 ? tr('花最多時間的是「{0}」。', top[0]) : tr('都在「{0}」上,很專一。', top[0]));
    }
    const n = +range, label = n === 7 ? tr('七日') : tr('三十日');
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (n - 1));
    const from = dayKey(d); d.setDate(d.getDate() - n); const prevFrom = dayKey(d);
    const prevLog = log.filter(e => e.d >= prevFrom && e.d < from);
    const prev = { min: prevLog.reduce((a, e) => a + e.min, 0), rounds: prevLog.filter(e => e.full).length, hits: prevLog.reduce((a, e) => a + e.hits, 0) };
    const hasHistory = log.some(e => e.d < from);
    if (!cur.min) return prev.min ? tr('這幾天沒見到施主。不要緊,想到了就回來坐一炷吧。') : tr('這段時間還沒來坐過。想到了就來坐一炷吧。');

    let line, gentle = false;                  // gentle: they sat less, so no nagging after it
    if (!hasHistory) line = !cur.rounds ? tr('施主才剛開始,已經坐了 {0}。', talkMin(cur.min))
      : n === 7 ? tr('施主這{0}坐了 {1}。好的開始。', label, talkMin(cur.min)) : tr('施主這{0}坐了 {1}。', label, talkMin(cur.min));
    else {
      const diff = cur.min - prev.min;
      gentle = diff <= -30;
      line = diff >= 30 ? tr('施主這{0}比前{1}多坐了 {2},了不起。', label, label, talkMin(diff))
        : gentle ? tr('這{0}坐得少一些。不要緊,今天來坐一炷就好。', label)
        : tr('這{0}跟前{1}差不多,穩穩的,很好。', label, label);
    }
    if (!cur.rounds) return line + tr('下次試著撐到開靜吧。');
    const a = cur.hits / cur.rounds, b = prev.rounds ? prev.hits / prev.rounds : null;
    if (!cur.hits) line += tr('一下都沒被打,如山不動。');
    else if (hasHistory && b != null && a < b - .1) line += tr('被打的也少了,有進步。');
    else if (a > 1.2 && !gentle) line += tr('最近常被打喔,手機放遠一點吧。');
    return line;
  }
  // the words appear the way the monk speaks in the zendo
  let verdictTimer = 0;
  function sayVerdict(text) {
    const el = $('#statNote');
    clearInterval(verdictTimer);
    el.setAttribute('aria-label', text);
    if (reduceMotion) { el.textContent = text; return; }
    const chars = [...text]; let i = 0;
    el.textContent = '';
    verdictTimer = setInterval(() => { el.textContent += chars[i++]; if (i >= chars.length) clearInterval(verdictTimer); }, 30);
  }
  function renderStatView() {
    const log = readLog(), buckets = statBuckets(log, statRange);
    const from = buckets.length ? buckets[0].from : dayKey();
    const inRange = log.filter(e => e.d >= from);
    const tasks = new Map();
    for (const e of inRange) {
      const t = tasks.get(e.task) || { min: 0, rounds: 0, hits: 0 };
      t.min += e.min; t.hits += e.hits; if (e.full) t.rounds++;
      tasks.set(e.task, t);
    }
    const cur = { min: inRange.reduce((a, e) => a + e.min, 0), rounds: inRange.filter(e => e.full).length,
      hits: inRange.reduce((a, e) => a + e.hits, 0), tasks };
    sayVerdict(monkVerdict(log, statRange, cur));

    // ledger: numbers big, units small
    const u = (n, unit) => `${n}<small>${unit}</small>`;
    const time = cur.min >= 60 ? u(Math.floor(cur.min / 60), tr('時')) + (cur.min % 60 ? u(cur.min % 60, tr('分')) : '') : u(cur.min, tr('分'));
    // hits as a plain count (it always has a value); the per-round average only once a round has been sat in full
    const avg = cur.rounds ? tr('<span class="sub">平均每炷 {0} 下</span>', (cur.hits / cur.rounds).toFixed(1)) : '';
    $('#statSum').innerHTML = [[tr('坐禪'), time], [tr('坐滿'), u(cur.rounds, tr('炷'))], [tr('被打'), u(cur.hits, tr('下')) + avg]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    // incense: one stick per day (or month); today's is lit
    const box = $('#dailyBars'), hint = $('#dailyHint');
    $('#dailyTitle').textContent = statRange === 'all' ? tr('每月坐了多久') : tr('每天坐了多久');
    const max = Math.max(0, ...buckets.map(b => b.min));
    box.style.setProperty('--n', buckets.length);
    box.style.setProperty('--sw', statRange === '30' ? '4px' : statRange === '7' ? '6px' : '8px');
    box.replaceChildren();
    if (!max) {
      box.innerHTML = tr('<p class="chart-empty">這段時間還沒有點過香。</p>');
      hint.hidden = true;
    } else {
      hint.hidden = false;
      const top = max * 1.15, g = gridValue(max);
      if (g) box.insertAdjacentHTML('beforeend', `<div class="grid-line" style="--p:${(g / top).toFixed(4)}"><span>${fmtMin(g)}</span></div>`);
      const slip = Object.assign(document.createElement('div'), { className: 'slip', hidden: true });
      const todayK = dayKey();
      buckets.forEach((b, i) => {
        const col = document.createElement('button'); col.type = 'button'; col.className = 'col';
        const lit = b.min && b.from <= todayK && b.to >= todayK;     // today, or this month
        const desc = tr('{0}・{1}・坐滿 {2} 炷・被打 {3} 下', b.title, fmtMin(b.min), b.rounds, b.hits);
        col.setAttribute('aria-label', desc);
        const h = (b.min / top).toFixed(4);
        col.innerHTML = `<span class="track">${lit ? `<svg class="wisp" style="--wh:${h}" viewBox="0 0 10 24" aria-hidden="true"><path d="M5 24 q-4 -6 0 -12 q4 -6 0 -12"/></svg>` : ''}` +
          `<i class="${b.min ? 'stick' : 'ash'}${lit ? ' lit' : ''}" style="--h:${h}"></i></span><span class="lbl">${b.label}</span>`;
        const show = () => {
          box.querySelectorAll('.col.on').forEach(x => x.classList.remove('on')); col.classList.add('on');
          slip.innerHTML = tr('<b>{0}</b><span>{1}・{2} 炷・被打 {3}</span>', b.title, fmtMin(b.min), b.rounds, b.hits);
          slip.hidden = false;
          // sit the slip over the stick, kept inside the chart
          const x = col.offsetLeft + col.offsetWidth / 2, w = slip.offsetWidth, W = box.clientWidth;
          const left = Math.max(0, Math.min(W - w, x - w / 2));
          slip.style.left = left + 'px';
          slip.style.setProperty('--tip', Math.max(10, Math.min(w - 10, x - left)) + 'px');   // the point stays on the paper
          hint.hidden = true;
        };
        col.addEventListener('click', show); col.addEventListener('focus', show);
        col.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(); });
        box.appendChild(col);
      });
      box.appendChild(slip);
      hint.textContent = statRange === 'all' ? tr('點一炷香,看那個月坐了多久。') : tr('點一炷香,看那天坐了多久。');
    }

    // per task: one ink stroke each
    let rows = [...tasks].sort((a, b) => b[1].min - a[1].min);
    if (rows.length > 6) {
      const rest = rows.slice(5).reduce((a, [, t]) => ({ min: a.min + t.min, rounds: a.rounds + t.rounds, hits: a.hits + t.hits }), { min: 0, rounds: 0, hits: 0 });
      rows = [...rows.slice(0, 5), [tr('其他'), rest]];
    }
    const tmax = Math.max(1, ...rows.map(([, t]) => t.min));
    $('#taskBars').innerHTML = rows.length ? rows.map(([name, t]) =>
      tr('<div class="hrow"><span class="hname">{0}<small>{1} 炷・被打 {2} 下</small></span>', escapeHtml(name), t.rounds, t.hits) +
      `<span class="htrack"><i style="--w:${(t.min / tmax).toFixed(4)}"></i></span><b class="hval">${fmtMin(t.min)}</b></div>`).join('')
      : tr('<p class="chart-empty">這段時間還沒有紀錄。</p>');

    // the same numbers as a table, for screen readers only (the calendar shows each day on screen)
    const filled = buckets.filter(b => b.min || b.hits);
    $('#statTable').innerHTML = filled.length
      ? tr('<table><caption>{0}</caption><thead><tr><th>{1}</th><th>分鐘</th><th>坐滿</th><th>被打</th></tr></thead><tbody>', $('#dailyTitle').textContent, statRange === 'all' ? tr('月份') : tr('日期')) +
        filled.map(b => `<tr><td>${b.title}</td><td>${b.min}</td><td>${b.rounds}</td><td>${b.hits}</td></tr>`).join('') + '</tbody></table>'
      : '';
  }

  /* ---------- share the result as a picture ---------- */
  // the zendo SVG, with its CSS-driven colours written onto each element so it renders as a standalone image
  function sceneImage() {
    const src = $('#stage'), clone = src.cloneNode(true);
    const a = [src, ...src.querySelectorAll('*')], b = [clone, ...clone.querySelectorAll('*')];
    const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity',
      'fill-opacity', 'stroke-opacity', 'display', 'visibility', 'font-family', 'font-size', 'font-weight', 'mix-blend-mode'];
    a.forEach((el, i) => {
      const cs = getComputedStyle(el);
      b[i].setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';'));
      b[i].removeAttribute('class');
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', 1200); clone.setAttribute('height', 840);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }
  function wrapLines(g, text, width) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (g.measureText(line + ch).width > width && line) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  async function drawShareCard() {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    const disp = v('--f-display'), bodyF = v('--f-body');
    const seal = $('#seal').textContent, title = $('#resultTitle').textContent;
    const l1 = $('#resultLine1').textContent, l2 = $('#resultLine2').textContent, koan = $('#koan').textContent;
    const goal = $('#resultGoal').hidden ? '' : $('#resultGoal').textContent;
    const all = seal + title + l1 + l2 + koan + goal + tr('香板禪堂0123456789年月日');
    try { await Promise.all([document.fonts.load(`700 60px ${disp}`, all), document.fonts.load(`400 40px ${disp}`, all)]); } catch {}

    g.fillStyle = v('--bg'); g.fillRect(0, 0, W, H);
    g.beginPath(); g.roundRect(48, 48, W - 96, H - 96, 40);
    g.fillStyle = v('--surface'); g.fill(); g.lineWidth = 3; g.strokeStyle = v('--line'); g.stroke();
    const sw = W - 168, sh = sw * .7;
    const img = await sceneImage().catch(() => null);
    if (img) { g.save(); g.beginPath(); g.roundRect(84, 84, sw, sh, 28); g.clip(); g.drawImage(img, 84, 84, sw, sh); g.restore(); }

    // the seal
    const shu = v('--shu');
    g.save(); g.translate(195, 875); g.rotate(-4 * Math.PI / 180);
    g.strokeStyle = shu; g.lineWidth = 9; g.beginPath(); g.roundRect(-92, -92, 184, 184, 14); g.stroke();
    g.fillStyle = shu; g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...seal];
    g.font = `700 ${chars.length > 1 ? 74 : 110}px ${disp}`;
    chars.forEach((ch, i) => g.fillText(ch, 0, (i - (chars.length - 1) / 2) * 80));
    g.restore();

    // the words
    let y = 820;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = v('--ink'); g.font = `700 62px ${disp}`; g.fillText(title, 330, y);
    g.font = `400 36px ${bodyF}`; g.fillStyle = v('--muted');
    for (const t of [l1, l2]) for (const line of wrapLines(g, t, W - 330 - 100)) { y += 54; g.fillText(line, 330, y); }
    if (goal) { y += 58; g.fillStyle = v('--accent'); g.font = `700 36px ${bodyF}`; g.fillText(goal, 330, y); }

    const ky = Math.max(y + 70, 1060);
    g.strokeStyle = v('--line'); g.lineWidth = 3; g.setLineDash([12, 10]);
    g.beginPath(); g.moveTo(100, ky); g.lineTo(W - 100, ky); g.stroke(); g.setLineDash([]);
    g.fillStyle = v('--ink'); g.font = `700 58px ${disp}`; g.textAlign = 'center';
    g.fillText(koan, W / 2, ky + 96);

    const d = new Date();
    g.font = `400 30px ${bodyF}`; g.fillStyle = v('--muted'); g.textAlign = 'left';
    g.fillText(tr('{0} 年 {1} 月 {2} 日', d.getFullYear(), d.getMonth() + 1, d.getDate()), 100, H - 100);
    g.textAlign = 'right'; g.fillStyle = v('--ink'); g.font = `700 40px ${disp}`;
    g.fillText(tr('香板禪堂'), W - 100, H - 100);
    return c;
  }
  function prepareShare() {
    P.sharePromise = drawShareCard().then(c => new Promise(r => c.toBlob(r, 'image/png'))).catch(() => null);
    return P.sharePromise;
  }
  function saveImage(file) {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(tr('圖片存好了。'));
  }
  $('#shareResult').addEventListener('click', async () => {
    audio();
    const blob = await (P.sharePromise || prepareShare());
    if (!blob) { toast(tr('圖片做不出來,截圖分享吧。')); return; }
    const file = new File([blob], `keisaku-${dayKey()}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: tr('{0}・{1}', $('#resultTitle').textContent, $('#resultLine1').textContent) }); }
      catch (e) { if (e.name !== 'AbortError') saveImage(file); }
      return;
    }
    saveImage(file);
  });

  /* ---------- 收藏冊: scrolls, the seasons outside, things for the mochi to wear ---------- */
  // everything is worked out from the log, so a restored backup brings the collection back; only what is on show is stored
  const COLLECT_KEY = 'keisaku-collect-v1';
  const SEASONS = [
    { id: 'spring', name: tr('春'), months: tr('2–4 月'), view: tr('窗外的櫻花,花瓣慢慢飄下來') },
    { id: 'summer', name: tr('夏'), months: tr('5–7 月'), view: tr('竹林;夜裡有螢火蟲') },
    { id: 'autumn', name: tr('秋'), months: tr('8–10 月'), view: tr('紅葉,一片一片落下') },
    { id: 'winter', name: tr('冬'), months: tr('11–1 月'), view: tr('梅花和雪') },
  ];
  const seasonOf = (t = Date.now()) => SEASONS[Math.floor(((new Date(t).getMonth() + 11) % 12) / 3)].id;
  // tallies the conditions read from: full rounds, days, streaks, minutes
  function collectStats(log) {
    const full = log.filter(e => e.full), days = new Map();
    for (const e of log) {
      const a = days.get(e.d) || { full: 0, late: 0 };
      if (e.full) a.full++;
      if (e.late) a.late++;
      days.set(e.d, a);
    }
    let best = 0, run = 0, prev = null;
    for (const k of [...days.keys()].filter(k => days.get(k).full).sort()) {
      const gap = prev ? Math.round((new Date(k + 'T12:00') - new Date(prev + 'T12:00')) / 864e5) : 0;
      run = gap === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k;
    }
    const season = {}; SEASONS.forEach(s => { season[s.id] = 0; });
    full.forEach(e => { season[seasonOf(e.t)]++; });
    return {
      rounds: full.length, still: full.filter(e => !e.hits).length, leave: full.filter(e => e.leave).length,
      long: full.filter(e => e.min >= 45).length, hours: log.reduce((a, e) => a + e.min, 0) / 60,
      bigDay: Math.max(0, ...[...days.values()].map(a => a.full)),
      onTime: [...days.values()].filter(a => a.full >= 2 && !a.late).length,
      streak: best, season,
      early: full.filter(e => { const h = new Date(e.t).getHours(); return h >= 3 && h < 7; }).length,   // finished before 7 in the morning
      night: full.filter(e => { const h = new Date(e.t).getHours(); return h >= 22 || h < 3; }).length,  // after 10 at night
      tasks: new Set(full.map(e => e.task)).size,
    };
  }
  // need(stats) -> [have, need, unit]
  const SCROLLS = [
    { id: '靜', en: 'Stillness', how: tr('一開始就掛著'), need: () => [1, 1] },
    { id: '忍', en: 'Patience', how: tr('第一次坐滿一炷'), need: s => [s.rounds, 1, tr('炷')] },
    { id: '心', en: 'Heart', how: tr('累計坐滿 10 炷'), need: s => [s.rounds, 10, tr('炷')] },
    { id: '喫茶去', en: 'Go have some tea', how: tr('一天坐滿 2 炷、休息沒超時,累計 5 天'), need: s => [s.onTime, 5, tr('天')] },
    { id: '莫妄想', en: 'No idle thoughts', how: tr('一炷都沒被打,累計 5 炷'), need: s => [s.still, 5, tr('炷')] },
    { id: '放下著', en: 'Let it go', how: tr('用過暫離,回來還是坐滿'), need: s => [s.leave, 1, tr('炷')] },
    { id: '一期一會', en: 'One time, one meeting', how: tr('同一天坐滿 4 炷'), need: s => [s.bigDay, 4, tr('炷')] },
    { id: '日日是好日', en: 'Every day is a good day', how: tr('連續 7 天都有坐滿'), need: s => [s.streak, 7, tr('天')] },
    { id: '無', en: 'Nothing', how: tr('累計坐滿 50 炷'), need: s => [s.rounds, 50, tr('炷')] },
    { id: '本來無一物', en: 'From the start, not a thing', how: tr('累計坐滿 100 炷'), need: s => [s.rounds, 100, tr('炷')] },
    { id: '花開', en: 'Flowers open', how: tr('春天坐滿 10 炷'), season: 'spring', need: s => [s.season.spring, 10, tr('炷')] },
    { id: '清風', en: 'Clear breeze', how: tr('夏天坐滿 10 炷'), season: 'summer', need: s => [s.season.summer, 10, tr('炷')] },
    { id: '明月', en: 'Bright moon', how: tr('秋天坐滿 10 炷'), season: 'autumn', need: s => [s.season.autumn, 10, tr('炷')] },
    { id: '雪', en: 'Snow', how: tr('冬天坐滿 10 炷'), season: 'winter', need: s => [s.season.winter, 10, tr('炷')] },
  ];
  const INK = 'stroke="#2a2622" stroke-width="1.3"';
  const blossom = (x, y, c, r = 2.6) => [0, 72, 144, 216, 288].map(a => { const t = a * Math.PI / 180; return `<circle cx="${(x + Math.cos(t) * r * .8).toFixed(1)}" cy="${(y + Math.sin(t) * r * .8).toFixed(1)}" r="${(r * .62).toFixed(2)}" fill="${c}"/>`; }).join('') + `<circle cx="${x}" cy="${y}" r="${(r * .35).toFixed(2)}" fill="#e8b84a"/>`;
  const MAPLE = 'M0 -5 L1.2 -2 L4 -3 L2.6 0 L4.6 1.4 L1.4 1.6 L0.8 4 L0 2.4 L-0.8 4 L-1.4 1.6 L-4.6 1.4 L-2.6 0 L-4 -3 L-1.2 -2 Z';
  const maple = (x, y, c, s = 1.15, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${c}" d="${MAPLE}"/>`;
  // slot: head / body / extra. Body things are drawn behind the arms; extra things sit on the face, in the hands,
  // or (place: 'side') on the mat beside the cushion. react: what the thing does when the keisaku lands.
  const DROP = (shape) => `<g class="acc-drop">${shape}</g>`;
  const ACCS = [
    { id: 'leaf', slot: 'head', name: tr('葉子'), gift: tr('這片葉子'), how: tr('第一次坐滿一炷'), need: s => [s.rounds, 1, tr('炷')],
      svg: `<path d="M2 -68 q-2 -10 6 -14 q4 8 -6 14z" fill="#86b061" ${INK}/><path d="M2 -68 q2 -6 5 -11" stroke="#2a2622" stroke-width=".8" fill="none"/>` },
    { id: 'bird', slot: 'head', name: tr('小鳥'), gift: tr('這隻小鳥'), how: tr('連續 3 天都有坐滿'), need: s => [s.streak, 3, tr('天')],
      svg: `<path d="M-12 -71 l-6 -3 l1 5z" fill="#7aa3c9" ${INK}/><ellipse cx="-6" cy="-73.5" rx="6.5" ry="5" fill="#9cc0e0" ${INK}/>`
        + '<path d="M-9.5 -73 q3 3 6 0" fill="none" stroke="#2a2622" stroke-width=".8"/><circle cx="-3" cy="-75" r=".9" fill="#2a2622"/>'
        + '<path d="M.3 -74.8 l3.2 .9 l-3.2 1z" fill="#e8a33a" stroke="#2a2622" stroke-width=".5"/><path d="M-7.5 -68.7 v1.5 M-4.5 -68.7 v1.5" stroke="#e8a33a" stroke-width="1"/>' },
    { id: 'hachimaki', slot: 'head', name: tr('頭巾'), gift: tr('這條頭巾'), how: tr('坐滿一炷 45 分鐘以上'), need: s => [s.long, 1, tr('炷')],
      svg: `<path d="M-27 -54 Q0 -62 27 -54 L28 -49 Q0 -57 -28 -49Z" fill="#f8f5ec" ${INK}/><circle cx="0" cy="-54" r="3.4" fill="#c8434b"/><path d="M27 -53 l9 -4 l-1 6z M27 -52 l8 3 l-3 4z" fill="#f8f5ec" ${INK}/>` },
    { id: 'hat', slot: 'head', name: tr('斗笠'), gift: tr('這頂斗笠'), how: tr('累計坐滿 30 炷'), need: s => [s.rounds, 30, tr('炷')], hidesBump: true,
      svg: `<path d="M-36 -60 Q0 -96 36 -60 Q0 -66 -36 -60Z" fill="#d9b56b" ${INK}/><path d="M-20 -70 Q0 -74 20 -70" stroke="#a5813e" stroke-width="1" fill="none"/>` },
    { id: 'sakura', slot: 'head', name: tr('櫻花'), gift: tr('這朵櫻花'), how: tr('春天坐滿 5 炷'), season: 'spring', need: s => [s.season.spring, 5, tr('炷')],
      svg: `<g transform="translate(-15 -58)">${blossom(0, 0, '#f4b6c4', 4.4)}</g>` + DROP('<ellipse cx="-12" cy="-56" rx="2" ry="1.3" fill="#f4b6c4"/>') },
    { id: 'lotus', slot: 'head', name: tr('蓮花'), gift: tr('這朵蓮花'), how: tr('夏天坐滿 5 炷'), season: 'summer', need: s => [s.season.summer, 5, tr('炷')],
      svg: '<g transform="translate(-3 -69)"><ellipse cx="0" cy="0" rx="8" ry="2.2" fill="#86b061" stroke="#2a2622" stroke-width=".8"/>'
        + [-52, -18, 18, 52].map(a => `<ellipse cx="0" cy="-4.5" rx="2.6" ry="5.4" fill="#f4b3c8" stroke="#2a2622" stroke-width=".8" transform="rotate(${a})"/>`).join('')
        + '<ellipse cx="0" cy="-5" rx="2.6" ry="5.8" fill="#f7c6d6" stroke="#2a2622" stroke-width=".8"/></g>' + DROP('<ellipse cx="2" cy="-72" rx="1.6" ry="3" fill="#f4b3c8"/>') },
    { id: 'maple', slot: 'head', name: tr('紅葉'), gift: tr('這片紅葉'), how: tr('秋天坐滿 5 炷'), season: 'autumn', need: s => [s.season.autumn, 5, tr('炷')],
      svg: maple(-15, -59, '#d4572e', 1.6, -20) + DROP(maple(-12, -56, '#e39a2f', .9, 30)) },
    { id: 'beanie', slot: 'head', name: tr('毛帽'), gift: tr('這頂毛帽'), how: tr('冬天坐滿 5 炷'), season: 'winter', need: s => [s.season.winter, 5, tr('炷')], hidesBump: true,
      svg: `<path d="M-24 -56 Q-22 -78 0 -79 Q22 -78 24 -56 Q0 -61 -24 -56Z" fill="#7d8fb3" ${INK}/><path d="M-25 -57 Q0 -62 25 -57 L25 -52 Q0 -57 -25 -52Z" fill="#5f6f94" ${INK}/><circle cx="0" cy="-81" r="4.5" fill="#eef0f4" ${INK}/>` },

    { id: 'mino', slot: 'body', name: tr('蓑衣'), gift: tr('這件蓑衣'), how: tr('累計坐滿 20 炷'), need: s => [s.rounds, 20, tr('炷')],
      svg: `<path d="M-31 -31 Q0 -25 31 -31 L35 -13 Q0 -7 -35 -13Z" fill="#c9a85c" ${INK}/><path d="M-24 -29 l-2 15 M-14 -27.5 l-1 15 M-4 -27 v15 M6 -27 v15 M16 -27.5 l1 15 M26 -29 l2 15" stroke="#9c7d3a" stroke-width=".9"/>` },
    { id: 'yukata', slot: 'body', name: tr('浴衣'), gift: tr('這件浴衣'), how: tr('夏天坐滿 10 炷'), season: 'summer', need: s => [s.season.summer, 10, tr('炷')],
      svg: `<path d="M-31.5 -28 Q0 -22 31.5 -28 L32 -14 Q0 -9 -32 -14Z" fill="#5b7bb5" ${INK}/><path d="M-10 -27 L0 -16 L10 -27" fill="none" stroke="#f8f5ec" stroke-width="2.2"/>`
        + [[-22, -21], [-16, -16], [17, -21], [23, -16], [-27, -16], [27, -21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#f8f5ec"/>`).join('') },
    { id: 'blanket', slot: 'body', name: tr('膝上毯'), gift: tr('這條膝上毯'), how: tr('冬天坐滿 10 炷'), season: 'winter', need: s => [s.season.winter, 10, tr('炷')],
      svg: `<path d="M-37 -18 Q0 -25 37 -18 L39 -6 Q0 1 -39 -6Z" fill="#b5654a" ${INK}/><path d="M-37 -12 Q0 -18 37 -12 M-20 -21 v18 M0 -22 v20 M20 -21 v18" stroke="#e7c9a0" stroke-width=".9" fill="none"/>` },
    { id: 'scarf', slot: 'body', name: tr('圍巾'), gift: tr('這條圍巾'), how: tr('連續 14 天都有坐滿'), need: s => [s.streak, 14, tr('天')],
      svg: `<path d="M-30 -27 Q0 -19 30 -27 L31 -21 Q0 -13 -31 -21Z" fill="#c8434b" ${INK}/><path d="M18 -22 l4 14 l7 -2 l-3 -13z" fill="#c8434b" ${INK}/><path d="M20 -12 h7 M21 -15 h6" stroke="#f8e2c8" stroke-width="1"/>` },
    { id: 'kesa', slot: 'body', name: tr('小袈裟'), gift: tr('這件小袈裟'), how: tr('累計坐滿 100 炷'), need: s => [s.rounds, 100, tr('炷')],
      svg: `<path d="M-29 -36 Q-6 -30 26 -14 L16 -11 Q-8 -24 -31 -26Z" fill="#8a5d34" ${INK}/><path d="M-22 -32 l3 6 M-12 -28 l3 6 M-2 -24 l3 6 M8 -20 l3 6" stroke="#5d3f22" stroke-width=".8"/>` },
    { id: 'samue', slot: 'body', name: tr('作務衣'), gift: tr('這件作務衣'), how: tr('累計坐滿 200 炷'), need: s => [s.rounds, 200, tr('炷')],
      svg: `<path d="M-31.5 -29 Q0 -23 31.5 -29 L32 -14 Q0 -9 -32 -14Z" fill="#3e4f6e" ${INK}/><path d="M-12 -28 L5 -15 M12 -28 L-1 -18" stroke="#e9e3d3" stroke-width="2"/><path d="M9 -21 l4 5 M9 -21 l-1 6" stroke="#e9e3d3" stroke-width="1"/>` },

    { id: 'glasses', slot: 'extra', name: tr('眼鏡'), gift: tr('這副眼鏡'), how: tr('累計坐禪 25 小時'), need: s => [Math.floor(s.hours), 25, tr('小時')],
      svg: '<g fill="none" stroke="#2a2622" stroke-width="1.3"><circle cx="-9" cy="-43" r="5.5"/><circle cx="9" cy="-43" r="5.5"/><path d="M-3.5 -43 h7 M-14.5 -44 l-8 -2 M14.5 -44 l8 -2"/></g>' },
    { id: 'beads', slot: 'extra', name: tr('念珠'), gift: tr('這串念珠'), how: tr('累計坐禪 50 小時'), need: s => [Math.floor(s.hours), 50, tr('小時')],
      svg: [...Array(9)].map((_, i) => { const a = Math.PI * i / 8; return `<circle cx="${(-Math.cos(a) * 9).toFixed(1)}" cy="${(-13.5 + Math.sin(a) * 6.5).toFixed(1)}" r="1.9" fill="#6b3f2a" stroke="#2a2622" stroke-width=".6"/>`; }).join('') + '<path d="M0 -6.5 v5" stroke="#b44a3a" stroke-width="2"/>' },
    { id: 'chawan', slot: 'extra', place: 'side', name: tr('茶碗'), gift: tr('這只茶碗'), how: tr('一天坐滿 2 炷、休息沒超時,累計 10 天'), need: s => [s.onTime, 10, tr('天')],
      svg: `<path d="M38 -9 h15 q-1 8 -7.5 8 q-6.5 0 -7.5 -8z" fill="#7c9a74" ${INK}/><path class="smoke" d="M43 -12 q-2 -3 0 -6 M48 -12 q2 -3 0 -6" stroke-width=".9"/>` },
    { id: 'uchiwa', slot: 'extra', place: 'side', name: tr('團扇'), gift: tr('這把團扇'), how: tr('在 3 種不同的事上坐滿過'), need: s => [s.tasks, 3, tr('種')],
      svg: `<path d="M44 -2 L49 -15" stroke="#8a5d34" stroke-width="1.6" stroke-linecap="round"/><circle cx="51" cy="-22" r="8" fill="#f3e2b3" ${INK}/><path d="M45 -24 q6 -5 12 1" stroke="#d4572e" stroke-width="1.3" fill="none"/>` },
    { id: 'cat', slot: 'extra', place: 'side', name: tr('小貓'), gift: tr('這隻小貓'), how: tr('一炷都沒被打,累計 20 炷'), need: s => [s.still, 20, tr('炷')],
      svg: '<path d="M59.5 -4.5 q6 1.5 2.5 5 q-3.5 2.6 -11 1.2" stroke="#2a2622" stroke-width="4.4" stroke-linecap="round" fill="none"/><path d="M59.5 -4.5 q6 1.5 2.5 5 q-3.5 2.6 -11 1.2" stroke="#e8b07a" stroke-width="2.2" stroke-linecap="round" fill="none"/>'                                   // the tail grows from behind the body…
        + `<ellipse cx="50" cy="-5" rx="11" ry="6" fill="#e8b07a" ${INK}/>`
        + '<path d="M46.5 -10.6 q1.6 2.4 .6 5 M50.5 -11 q1.7 2.5 .7 5.2 M54.5 -10.4 q1.5 2.3 .6 4.8 M58 -8.6 q1.1 1.7 .4 3.6" stroke="#c07a45" stroke-width="1.1" stroke-linecap="round" fill="none"/>'
        + '<path d="M61 -4.1 q4.6 1.5 1 4.6 q-3.5 2.6 -11 1.2" stroke="#2a2622" stroke-width="4.4" stroke-linecap="round" fill="none"/><path d="M61 -4.1 q4.6 1.5 1 4.6 q-3.5 2.6 -11 1.2" stroke="#e8b07a" stroke-width="2.2" stroke-linecap="round" fill="none"/>'                                         // …and its end curls round in front
        + '<path d="M60.6 .2 l1.4 1.4 M57 1.9 l.8 1.6" stroke="#c07a45" stroke-width="1" stroke-linecap="round"/>'
        + '<ellipse cx="41.6" cy="-1.7" rx="2.6" ry="1.5" fill="#f6e3cc" stroke="#2a2622" stroke-width=".9"/>'   // a paw tucked under the chin
        + '<path d="M35.4 -10.4 L35.9 -16.4 L39.6 -12.8 Z M44.6 -10.4 L44.1 -16.4 L40.4 -12.8 Z" fill="#e8b07a" stroke="#2a2622" stroke-width="1.1" stroke-linejoin="round"/>'
        + '<path d="M36.6 -12.3 l.3 -2.2 l1.5 1.4 Z M43.4 -12.3 l-.3 -2.2 l-1.5 1.4 Z" fill="#f2b9b0"/>'
        + `<circle cx="40" cy="-8" r="5.2" fill="#e8b07a" ${INK}/>`
        + '<path d="M38.7 -12.2 v1.6 M40 -12.6 v2 M41.3 -12.2 v1.6" stroke="#c07a45" stroke-width=".9" stroke-linecap="round"/>'
        + '<path d="M37.3 -8.3 q1 .9 2 0 M40.7 -8.3 q1 .9 2 0" stroke="#2a2622" stroke-width=".8" stroke-linecap="round" fill="none"/>'
        + '<path d="M39.5 -6.9 h1 l-.5 .6 Z" fill="#d9777a"/>'
        + '<path d="M38.6 -5.9 q.7 .9 1.4 0 q.7 .9 1.4 0" stroke="#2a2622" stroke-width=".7" stroke-linecap="round" fill="none"/>' },
    { id: 'mokugyo', slot: 'extra', place: 'side', name: tr('木魚'), gift: tr('這個木魚'), how: tr('早上 7 點前坐滿一炷'), need: s => [s.early, 1, tr('炷')],
      svg: `<path d="M56 -3 L62 -13" stroke="#8a5d34" stroke-width="1.6" stroke-linecap="round"/><circle cx="62.5" cy="-14" r="2.2" fill="#d9b56b" ${INK}/>`
        + `<ellipse cx="47" cy="-7" rx="10" ry="6.5" fill="#a5582f" ${INK}/><path d="M39 -6 q8 3 16 0" stroke="#2a2622" stroke-width="1" fill="none"/><circle cx="52" cy="-9" r="1.2" fill="#2a2622"/>` },
    { id: 'lantern', slot: 'extra', place: 'side', name: tr('小提燈'), gift: tr('這盞小提燈'), how: tr('晚上 10 點後坐滿一炷'), need: s => [s.night, 1, tr('炷')],
      svg: '<circle class="night" cx="47" cy="-17" r="18" fill="url(#andonGlow)"/><path d="M47 -7.5 v6.5" stroke="#5d4230" stroke-width="1.2"/>'
        + `<rect x="43" y="-27.5" width="8" height="2" fill="#5d4230"/><ellipse cx="47" cy="-17" rx="6.5" ry="8.5" fill="#f4e3c1" ${INK}/>`
        + '<path d="M40.6 -20 h12.8 M40.6 -14 h12.8" stroke="#c9a85c" stroke-width=".7"/><rect x="43" y="-9.5" width="8" height="2" fill="#5d4230"/>' },
  ];
  const SLOTS = [['head', tr('頭')], ['body', tr('身體')], ['extra', tr('配飾')]];
  const unlocked = (item, s) => { const [have, need] = item.need(s); return have >= need; };
  const unlockedIds = log => { const s = collectStats(log); return [...SCROLLS.filter(x => unlocked(x, s)).map(x => 's:' + x.id), ...ACCS.filter(x => unlocked(x, s)).map(x => 'a:' + x.id)]; };

  // the view outside: the same picture fills the round window and, mirrored, the square one; drift is the falling part
  const drift = (cls, shape, n, dur) => [...Array(n)].map((_, i) => {
    const x = 56 + (i * 61 % 62), d = dur * (.8 + (i * 37 % 10) / 25);
    return `<g class="drift ${cls}" style="--dur:${d.toFixed(1)}s;--delay:-${(d * i / n).toFixed(1)}s"><g transform="translate(${x} 60)">${shape}</g></g>`;
  }).join('');
  const SEASON_ART = {
    spring: () => '<path d="M50 140 Q66 116 84 104 Q98 94 116 86 M76 110 Q78 96 72 84 M98 96 Q106 104 118 104" stroke="#6b4a33" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + [[84, 104], [72, 84], [96, 94], [110, 89], [118, 104], [64, 118], [104, 102], [78, 96]].map(([x, y], i) => blossom(x, y, i % 3 ? '#f4c4cf' : '#eea9b8')).join('')
      + drift('petal', '<ellipse rx="1.6" ry="1" fill="#f4c4cf"/>', 5, 9),
    summer: () => '<g stroke-linecap="round">' + [[66, '#7aa35a'], [78, '#8fb76a'], [108, '#6f9a52']].map(([x, c]) => `<path d="M${x} 140 V58" stroke="${c}" stroke-width="3.2"/><path d="M${x - 1.5} 120 h3 M${x - 1.5} 96 h3 M${x - 1.5} 74 h3" stroke="#5c7f44" stroke-width="1"/>`).join('')
      + [[66, 96, -1], [78, 80, 1], [108, 90, -1], [78, 110, 1], [108, 70, 1]].map(([x, y, d]) => `<path d="M${x} ${y} q${d * 8} -3 ${d * 14} 2 q${-d * 7} 2 ${-d * 14} -2z" fill="#86b061"/>`).join('') + '</g>'
      + '<g class="night">' + [[70, 100, 0], [96, 84, 1.3], [106, 112, 2.1], [84, 122, .7], [116, 96, 2.8]].map(([x, y, dl]) => `<g class="firefly" style="--delay:-${dl}s"><circle cx="${x}" cy="${y}" r="4" fill="#f3e48a" opacity=".25"/><circle cx="${x}" cy="${y}" r="1.6" fill="#f3e48a"/></g>`).join('') + '</g>',
    autumn: () => '<path d="M124 64 Q104 74 92 70 Q80 66 66 76 M100 72 Q98 84 104 92" stroke="#6b4a33" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + [[92, 72, '#d4572e', 0], [80, 70, '#e07a2f', 20], [68, 78, '#c8432b', -15], [104, 92, '#e39a2f', 10], [100, 74, '#cf4f2c', 35], [70, 124, '#d4572e', -40]].map(([x, y, c, r]) => maple(x, y, c, 1.15, r)).join('')
      + drift('leaf', maple(0, 0, '#e07a2f', .9), 3, 12),
    winter: () => '<path d="M50 128 Q86 116 122 126 V140 H50Z" fill="#f4f6f8"/><path d="M58 126 Q70 100 86 90 M70 108 Q62 98 64 88" stroke="#5a4030" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + [[86, 90], [64, 88], [76, 100], [66, 112]].map(([x, y]) => blossom(x, y, '#c8434b', 2.3)).join('')
      + drift('snow', '<circle r="1.3" fill="#fff"/>', 8, 7),
  };
  // a hanging scroll holds one to five characters, top to bottom
  function scrollSvg(text, cx = 200, cy = 96, h = 68) {
    const ch = [...text], n = ch.length;
    if (n === 1) return `<text class="scroll-char f-sink" x="${cx}" y="${cy - 4}" font-size="22" text-anchor="middle">${text}</text><rect class="f-shu" x="${cx + 4}" y="${cy + 22}" width="6" height="6" rx="1"/>`;
    const fs = Math.min(18, h / (n * 1.06)), step = fs * 1.06, top = cy - n * step / 2;
    return ch.map((c, i) => `<text class="scroll-char f-sink" x="${cx}" y="${(top + i * step + fs * .86).toFixed(1)}" font-size="${fs.toFixed(1)}" text-anchor="middle">${c}</text>`).join('')
      + `<rect class="f-shu" x="${cx + 8}" y="${cy + 32}" width="4" height="4" rx=".8"/>`;
  }
  const C = (() => {
    const v = store.get(COLLECT_KEY, null) || {}, wear = { head: null, body: null, extra: null };
    const put = id => { const it = ACCS.find(x => x.id === id); if (it) wear[it.slot] = it.id; };
    if (v.wear && typeof v.wear === 'object') Object.values(v.wear).forEach(put);
    else if (typeof v.acc === 'string') put(v.acc);                        // before v18 there was one accessory
    return { scroll: typeof v.scroll === 'string' ? v.scroll : '靜', wear, seen: Array.isArray(v.seen) ? v.seen.filter(x => typeof x === 'string') : null };
  })();
  const saveCollect = () => store.set(COLLECT_KEY, { scroll: C.scroll, wear: C.wear, seen: C.seen });
  if (!C.seen) { C.seen = unlockedIds(readLog()); saveCollect(); }   // what was earned before the 收藏冊 existed is not "new"
  function renderScene() {
    const stats = collectStats(readLog());
    if (!SCROLLS.some(x => x.id === C.scroll && unlocked(x, stats))) C.scroll = '靜';
    for (const [slot] of SLOTS) if (C.wear[slot] && !ACCS.some(x => x.id === C.wear[slot] && unlocked(x, stats))) C.wear[slot] = null;
    const season = seasonOf(), art = SEASON_ART[season]();
    $('#stage').dataset.season = season;
    $('#winView').innerHTML = art; $('#sqView').innerHTML = art;
    $('#scrollText').innerHTML = scrollSvg(tr(C.scroll));         // the scroll's words, in this language's characters
    const worn = slot => ACCS.find(x => x.id === C.wear[slot]);
    const g = it => it ? `<g class="acc acc-${it.id}">${it.svg}</g>` : '';
    const head = worn('head'), body = worn('body'), extra = worn('extra');
    $('#mochiAccBack').innerHTML = g(body);                                   // under the arms
    $('#mochiAcc').innerHTML = g(head) + (extra && extra.place !== 'side' ? g(extra) : '');
    $('#accSide').innerHTML = extra && extra.place === 'side' ? g(extra) : '';   // on the mat beside the cushion
    sitterEl.dataset.head = head ? head.id : '';
    sitterEl.classList.toggle('no-bump', !!(head && head.hidesBump));      // a hat or beanie hides the bump
  }
  const sittingNow = () => ['settle', 'focus', 'leave'].includes(P.phase) || P.resuming;
  const progressText = (item, s) => { const [have, need, unit] = item.need(s); return have >= need ? '' : tr('還差 {0} {1}', need - have, unit); };
  const MOCHI_BODY = '<path d="M-31 -14 C-34 -40 -20 -68 0 -68 C20 -68 34 -40 31 -14 C22 -9 -22 -9 -31 -14 Z" fill="#fffdf7" stroke="#2a2622" stroke-width="1.6"/>'
    + '<ellipse fill="#f2a49a" cx="-17" cy="-36" rx="4.5" ry="2.8" opacity=".75"/><ellipse fill="#f2a49a" cx="17" cy="-36" rx="4.5" ry="2.8" opacity=".75"/>';
  const MOCHI_HANDS = '<path d="M-26 -33 Q-23 -21 -9 -18.5 M26 -33 Q23 -21 9 -18.5" fill="none" stroke="#2a2622" stroke-width="1.3" stroke-linecap="round"/>'
    + '<ellipse fill="#fffdf7" cx="0" cy="-17" rx="10" ry="4.6" stroke="#2a2622" stroke-width="1.3"/>';
  const MOCHI_FACE = '<g fill="none" stroke="#2a2622" stroke-width="1.5" stroke-linecap="round"><path d="M-13 -44 q4 3.2 8 0"/><path d="M5 -44 q4 3.2 8 0"/><path d="M-2 -35 q2 1.4 4 0"/></g>';
  const WIN = '<circle cx="86" cy="98" r="33" class="f-window"/>';
  const LATTICE = '<g class="s-wood" stroke-width="1.6" clip-path="url(#winClip)"><line x1="70" y1="60" x2="70" y2="140"/><line x1="86" y1="60" x2="86" y2="140"/><line x1="102" y1="60" x2="102" y2="140"/><line x1="50" y1="82" x2="120" y2="82"/><line x1="50" y1="98" x2="120" y2="98"/><line x1="50" y1="114" x2="120" y2="114"/></g><circle cx="86" cy="98" r="33" class="s-wood" fill="none" stroke-width="5"/>';
  function renderCollect() {
    const stats = collectStats(readLog()), locked = sittingNow(), now = seasonOf();
    const got = [...SCROLLS, ...ACCS].filter(x => unlocked(x, stats)).length;
    $('#collectSum').textContent = tr('已經收到 {0} / {1} 樣。坐滿的炷越多,能換的就越多。', got, SCROLLS.length + ACCS.length);
    $('#collectNote').hidden = !locked;
    const card = (kind, item, inner) => {
      const ok = unlocked(item, stats), on = kind === 's' ? C.scroll === item.id : C.wear[item.slot] === item.id;
      const label = kind === 's' ? tr(item.id) : item.name;
      return `<li><button type="button" class="c-item${ok ? '' : ' locked'}${on ? ' on' : ''}" data-kind="${kind}" data-id="${item.id}"`
        + ` aria-pressed="${on}" ${ok && !locked ? '' : 'aria-disabled="true"'} aria-label="${label}${ok ? (on ? tr(',使用中') : '') : tr(',還沒拿到:') + item.how}">`
        + inner + `<b>${label}</b>` + (LANG === 'en' && item.en ? `<small class="c-mean">${item.en}</small>` : '') + (on ? tr('<span class="c-on">使用中</span>') : ok ? '' : `<small>${item.how}</small><small class="c-left">${progressText(item, stats)}</small>`)
        + '</button></li>';
    };
    $('#scrollList').innerHTML = SCROLLS.map(x => card('s', x, `<span class="c-paper" data-n="${[...tr(x.id)].length}" aria-hidden="true">${[...tr(x.id)].map(c => `<i>${c}</i>`).join('')}</span>`)).join('');
    // a small mochi wearing just this one thing; things beside the cushion get a wider picture
    const mini = x => `<svg class="c-mochi${x.place === 'side' ? ' wide' : ''}" viewBox="${x.place === 'side' ? '-36 -90 104 96' : '-40 -90 80 84'}" aria-hidden="true">`
      + MOCHI_BODY + (x.slot === 'body' ? x.svg : '') + MOCHI_HANDS + MOCHI_FACE + (x.slot !== 'body' ? x.svg : '') + '</svg>';
    $('#accList').innerHTML = SLOTS.map(([slot, label]) => `<li class="c-slot"><h3>${label}</h3><ul class="c-grid c-accs">`
      + ACCS.filter(x => x.slot === slot).map(x => card('a', x, mini(x))).join('') + '</ul></li>').join('');
    $('#seasonList').innerHTML = SEASONS.map(se => {
      const items = [...SCROLLS, ...ACCS].filter(x => x.season === se.id);
      return `<li class="c-season${se.id === now ? ' now' : ''}"><svg viewBox="50 62 72 72" aria-hidden="true">${WIN}<g clip-path="url(#winClip)">${SEASON_ART[se.id]()}</g>${LATTICE}</svg>`
        + `<div><h3>${se.name}<small>${se.months}</small>${se.id === now ? tr('<span class="c-on">現在</span>') : ''}</h3><p>${se.view}</p><ul>`
        + items.map(x => '<li>' + tr('{0}「{1}」:{2}', x.name ? tr('配件') : tr('掛軸'), x.name || tr(x.id), unlocked(x, stats) ? tr('已收到') : tr('{0},{1}', x.how, progressText(x, stats))) + '</li>').join('')
        + '</ul></div></li>';
    }).join('');
  }
  function equip(kind, id, toggle = false) {
    if (kind === 's') C.scroll = id;
    else { const slot = ACCS.find(x => x.id === id).slot; C.wear[slot] = toggle && C.wear[slot] === id ? null : id; }
    saveCollect(); renderScene();
  }
  ['scrollList', 'accList'].forEach(l => $('#' + l).addEventListener('click', e => {
    const b = e.target.closest('.c-item');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    equip(b.dataset.kind, b.dataset.id, true); renderCollect();
  }));
  function showCollectTab(which) {
    [['tabScrolls', 'scrollView'], ['tabSeasons', 'seasonView'], ['tabAccs', 'accView']].forEach(([t, v]) => {
      $('#' + t).setAttribute('aria-selected', String(t === which)); $('#' + v).hidden = t !== which;
    });
  }
  ['tabScrolls', 'tabSeasons', 'tabAccs'].forEach(t => $('#' + t).addEventListener('click', () => showCollectTab(t)));
  $('#collectBtn').addEventListener('click', () => { renderCollect(); showCollectTab('tabScrolls'); openSheet($('#collect')); });
  $('#windowBtn').addEventListener('click', () => {
    bubble(tr('方的叫「迷之窗」,四個角是生老病死。圓的叫「悟之窗」。京都的源光庵就是這樣開窗的。'));
    clearTimeout(P.bubbleTimer); P.bubbleTimer = setTimeout(() => bubble(null), 5200);
  });
  // after a full round: anything newly earned is kept for the result card
  function collectAfterRound(log) {
    const fresh = unlockedIds(log).filter(id => !C.seen.includes(id));
    if (!fresh.length) return;
    C.seen.push(...fresh); saveCollect();
    P.newItems = (P.newItems || []).concat(fresh);
  }
  const itemOf = id => id[0] === 's' ? SCROLLS.find(x => 's:' + x.id === id) : ACCS.find(x => 'a:' + x.id === id);
  const newItemsLine = ids => tr('收藏冊多了:') + ids.map(id => id[0] === 's' ? tr('掛軸「{0}」', tr(itemOf(id).id)) : tr('配件「{0}」', itemOf(id).name)).join(tr('、'));
  // the monk hands over the first new scroll and the first new thing to wear
  async function offerNewItems() {
    const ids = P.newItems || []; P.newItems = [];
    const s = ids.find(id => id[0] === 's'), a = ids.find(id => id[0] === 'a');
    if (s) {
      const v = await ask(tr('施主坐得不錯。這幅「{0}」送你,要掛起來嗎?', tr(itemOf(s).id)), [{ label: tr('掛上去'), value: 1, primary: true }, { label: tr('先收著'), value: 0 }]);
      if (v) equip('s', itemOf(s).id);
    }
    if (a) {
      const v = await ask(tr('{0}{1}也送你,要幫麻糬戴上嗎?', s ? tr('還有') : tr('施主坐得不錯。'), itemOf(a).gift), [{ label: tr('戴上'), value: 1, primary: true }, { label: tr('先收著'), value: 0 }]);
      if (v) equip('a', itemOf(a).id);
    }
  }
  const collectStep = returning => ({ target: '#collectBtn', sheet: '#collect',
    text: (returning ? tr('禪堂多了一本收藏冊,就是中間這幅掛軸。') : tr('中間的掛軸是收藏冊。')) + tr('坐滿的炷越多,能換的掛軸和麻糬的配件就越多。點開看看。'),
    hint: tr('👆 點一下中間的掛軸') });
  renderScene();

  // the journal button carries the current streak (2 days or more) like a small seal
  function renderStreakBadge(streak) {
    const badge = $('#streakBadge');
    badge.hidden = streak < 2; badge.textContent = streak;
    $('#journalBtn').setAttribute('aria-label', streak >= 2 ? tr('坐禪帳,連續 {0} 日', streak) : tr('坐禪帳'));
  }
  renderStreakBadge(streakInfo(dayMap(readLog())).streak);

  cfg = { ...(loadLast() || DEFAULT_CFG) };
  loadToday(); renderAll();
  requestAnimationFrame(frame);
  onboarding();
})();
