/* =====================================================================
   Round 4.2B — the monk's natural patrol (candidate B views) on the Round 4.1 safe paths.

   Drawing: every pose the patrol needs (walk-cycle phases, turn frames, standing variants) is built ONCE, on first
   use, into a hidden <defs>; the monk on stage is a single <use> whose href changes only when the pose changes.
   Moving him is a transform. So walking does not rebuild any SVG; the accepted reminder (MonkActor + Round 3.5)
   is untouched and takes over only at the reminder stance, in exactly the pose he arrives in.

   Views ("families"): R = the accepted 3/4 facing right (rebuilt from its own parts, identical when still),
   L = facing left with the keisaku still in his right hand, F = front, K = back (all candidate B).
   Turns go through the in-between frames: R↔F (P3), L↔F, R↔K (side, back-3/4), L↔K; R↔L through F.

   Behaviour: from each stop a next route is drawn by weight from a seeded random generator (same seed, same
   patrol), never the same route twice in a row; stops last 1.2–3 s, sometimes a quiet 4–7 s; at the front stops he
   turns to watch the mochi. Left and right front are only reached from the back, so changing sides goes round
   behind her. A reminder: he slows to a stop, notices (stern), walks briskly by safe paths to the accepted stance,
   faces the mochi and hands over to the accepted reminder; afterwards he walks back to the patrol.
   ===================================================================== */
(function () {
  'use strict';
  const V = MONK_VIEWS2, P = PATROL;
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- poses ---------- */
  const PHASES = 8, STRIDE = 24;               // units walked per full step cycle (two steps)
  const TURN = { 'R>F': ['p3mid'], 'F>R': ['p3mid'], 'L>F': ['p3midL'], 'F>L': ['p3midL'], 'R>K': ['profile', 'back34'], 'K>R': ['back34', 'profile'],
    'L>K': ['profileL', 'back34L'], 'K>L': ['back34L', 'profileL'], 'R>L': ['p3mid', '@F', 'p3midL'], 'L>R': ['p3midL', '@F', 'p3mid'],
    'F>K': ['p3mid', '@R', 'profile', 'back34'], 'K>F': ['back34', 'profile', '@R', 'p3mid'] };
  const TURN_MS = 85;
  const VIEW_OF = { R: 'q34R', L: 'q34L', F: 'front', K: 'back' };
  // a walking step, as small moves of the parts (see MONK_VIEWS2 o.mod): unhurried, a little sway, the free arm swings
  // more than the one holding the keisaku
  function walkMod(fam, ph) {
    if (ph === 0 && fam !== 'X') return null;
    const s = Math.sin(TAU * ph / PHASES);
    if (fam === 'R') return { feet: [[2.6 * s, -1.9 * Math.max(0, s)], [-2.6 * s, -1.9 * Math.max(0, -s)]], near: 1.3 * s, far: -2.4 * s, stick: -1.6 * s, hem: -.7 * s };
    if (fam === 'L') return { feet: [[2.6 * s, -1.9 * Math.max(0, s)], [-2.6 * s, -1.9 * Math.max(0, -s)]], near: 2.6 * s, far: -1.1 * s, stick: 1.3 * s, hem: -.7 * s };
    return { feet: [[0, -2 * Math.max(0, s)], [0, -2 * Math.max(0, -s)]], right: 1 * s, left: -2 * s, stick: -1.2 * s, hem: .6 * s };
  }
  function buildPose(key, id) {   // key: 'W:fam:phase:face:tilt' or 'T:view:face'
    const [kind, a, b, c, d] = key.split(':');
    if (kind === 'T') return V.view(a, 'B', { id, face: b });
    const fam = a, ph = +b, face = c, tilt = +d || 0, mod = walkMod(fam, ph);
    const m = mod || tilt ? Object.assign({}, mod || {}, tilt ? { tilt } : {}) : undefined;
    return V.view(VIEW_OF[fam], 'B', { id, face, mod: m });
  }
  class Poses {
    constructor(defs) { this.defs = defs; this.ids = new Map(); this.n = 0; this.built = 0; }
    id(key) {
      let id = this.ids.get(key);
      if (!id) { id = 'np' + (++this.n); this.defs.insertAdjacentHTML('beforeend', buildPose(key, id)); this.ids.set(key, id); this.built++; }
      return id;
    }
    warm(keys, perFrame = 1) { this.queue = (this.queue || []).concat(keys.filter(k => !this.ids.has(k))); this.perFrame = perFrame; }
    tick() { for (let i = 0; i < (this.perFrame || 1) && this.queue && this.queue.length; i++) this.id(this.queue.shift()); }
  }
  const allKeys = (faces = ['kind']) => { const k = []; for (const f of faces) { for (const fam of 'RLFK') for (let p = 0; p < PHASES; p++) k.push(`W:${fam}:${p}:${f}:0`);
    for (const v of ['p3mid', 'p3midL', 'profile', 'back34', 'profileL', 'back34L']) k.push(`T:${v}:${f}`); } return k; };

  /* ---------- routes: from each stop, where he may go next, and how much he likes to ---------- */
  const ROUTES = {
    BL: [['BL-BC', ['BC'], 3], ['BL-LF', ['LS', 'LF'], 2.2], ['BL-BR', ['BC', 'BR'], 1.2]],
    BC: [['BC-BL', ['BL'], 3], ['BC-BR', ['BR'], 3]],
    BR: [['BR-BC', ['BC'], 3], ['BR-RF', ['RS', 'RF'], 2.2], ['BR-BL', ['BC', 'BL'], 1.2]],
    LF: [['LF-BL', ['LS', 'BL'], 1]],
    RF: [['RF-BR', ['RS', 'BR'], 1]],
    ST: [['ST-BL', ['BL'], 1]],
  };
  // which way he faces while standing at a stop: toward the mochi (at the back stops he looks over the hall)
  const STOP_FACE = { BL: 'R', BC: 'F', BR: 'L', LF: 'R', RF: 'L', ST: 'R', LS: 'R', RS: 'L' };

  class NaturalPatrol {
    constructor({ actor, defs, lip, slot, seed = 1, rm = () => false, log = () => {} }) {
      Object.assign(this, { actor, lip, slot, rm, log });
      this.poses = new Poses(defs); this.seed = seed; this.rand = rng(seed);
      this.s = { x: P.N.BL.x, y: P.N.BL.y, fam: 'R', face: 'kind', phase: 0, tilt: 0 };
      this.active = false; this.t = 0; this.tok = 0; this.waits = []; this.mode = 'off'; this.history = []; this.routes = []; this.at = 'BL';
      this.key = ''; this.useEl = null; this.stats = { swaps: 0 };
      this.poses.warm(allKeys(['kind']), 2);
    }
    /* --- the clock: everything waits on it, so a hidden page (no frames) simply pauses the patrol --- */
    sleep(ms) { const tok = this.tok; return new Promise(r => this.waits.push({ at: this.t + ms, r, tok })); }
    frame() { return new Promise(r => this.waits.push({ at: this.t, r, tok: this.tok, frame: true })); }
    alive(tok) { return tok === this.tok && this.active; }
    /* --- taking the monk over from the actor, and giving him back --- */
    claim() {
      if (this.active) return; const a = this.actor;
      this.s.x = a.s.x; this.s.y = a.s.y; this.s.fam = a.s.dir < 0 ? 'L' : 'R';
      this.active = true; a.external = true;
      a.back.innerHTML = '<use/>'; a.front.innerHTML = ''; this.useEl = a.back.firstChild; this.key = '';
    }
    release() {   // the actor draws him again (at the stance this is the very same drawing)
      if (!this.active) return; this.active = false; this.tok++; this.mode = 'off';
      const a = this.actor; Object.assign(a.s, { x: this.s.x, y: this.s.y, dir: this.s.fam === 'L' ? -1 : 1, moving: false });
      a.external = false; a.key = ''; a.lastHtml = null; a.lastFront = null;
      if (this.slot && a.back.parentNode !== this.slot) this.slot.appendChild(a.back);
    }
    /* --- turning and walking --- */
    async turnTo(fam) {
      const tok = this.tok, from = this.s.fam; if (fam === from) return;
      if (!this.rm()) for (const step of TURN[from + '>' + fam] || []) { if (step[0] === '@') { this.s.fam = step.slice(1); this.s.turnKey = null; } else this.s.turnKey = step; this.mode = 'turn'; await this.sleep(TURN_MS); if (!this.alive(tok)) return; }
      this.s.turnKey = null; this.s.fam = fam; if (this.mode === 'turn') this.mode = 'stand';
    }
    famFor(q) { return Math.abs(q.tx) >= .5 ? (q.tx > 0 ? 'R' : 'L') : (q.ty > 0 ? 'F' : 'K'); }
    async walk(leg, { brisk = false } = {}) {
      const tok = this.tok;
      if (this.rm()) { const q = leg.at(leg.total); this.s.x = q.x; this.s.y = q.y; await this.sleep(400); return; }
      await this.turnTo(this.famFor(leg.at(Math.min(leg.total, 250)))); if (!this.alive(tok)) return;
      this.mode = 'walk'; this.leg = leg; this.legT = 0; this.brisk = brisk; let want = this.s.fam, since = 0;
      while (this.alive(tok) && this.legT < leg.total) {
        const before = this.t; await this.frame(); if (!this.alive(tok)) return;
        const dt = this.t - before, q0 = leg.at(this.legT); this.legT = Math.min(leg.total, this.legT + dt * (this.slow ?? 1));
        const q = leg.at(this.legT); this.s.phase += dist(q0, q) / STRIDE; this.s.x = q.x; this.s.y = q.y;
        // the way he faces follows the way he goes (after a moment, so a curve does not make him flicker)
        const f = this.famFor(q); if (f !== this.s.fam) { since = f === want ? since + dt : 0; want = f; if (since > 140) { await this.turnTo(f); if (!this.alive(tok)) return; this.mode = 'walk'; since = 0; } }
        if (this.stopRequest) { this.stopRequest(); this.stopRequest = null; break; }
      }
      await this.settleFeet(); this.mode = 'stand';
    }
    async settleFeet() {   // at a stop his feet come together (the step finishes rather than snapping)
      const tok = this.tok, target = Math.ceil(this.s.phase * 2 - 1e-6) / 2;
      while (this.alive(tok) && this.s.phase < target) { const b = this.t; await this.frame(); this.s.phase = Math.min(target, this.s.phase + (this.t - b) / 1000 * 1.6); }
      this.s.phase = Math.round(this.s.phase * 2) / 2;
    }
    async dwell(ms, stop) {
      const tok = this.tok; this.mode = 'stand';
      await this.turnTo(STOP_FACE[stop] || this.s.fam); if (!this.alive(tok)) return;
      // once in a longer stop: a small tilt of the head toward the mochi and back
      if (ms > 1800 && !this.rm()) { await this.sleep(ms * .35); for (const t of [.5, 1, 1.5, 1.5, 1, .5, 0]) { this.s.tilt = t; await this.sleep(t === 1.5 ? 700 : 90); if (!this.alive(tok)) return; } await this.sleep(ms * .35); }
      else await this.sleep(ms);
    }
    pick(stop) {
      const opts = ROUTES[stop] || ROUTES.BL, last = this.history[this.history.length - 1], prev = this.history[this.history.length - 2];
      // not the same route again, and rather not straight back to the stop he has just come from
      const cameFrom = this.cameFrom, w = opts.map(([id, names, wt]) => wt * (id === last ? .15 : 1) * (id === prev ? .6 : 1) * (names[names.length - 1] === cameFrom ? .35 : 1)), sum = w.reduce((a, b) => a + b, 0);
      let r = this.rand() * sum, i = 0; while (r > w[i] && i < w.length - 1) { r -= w[i]; i++; }
      return opts[i];
    }
    async loop(tok) {
      while (this.alive(tok)) {
        const [id, names] = this.pick(this.at), to = names[names.length - 1];
        this.history.push(id); this.routes.push({ t: Math.round(this.t), id }); if (this.routes.length > 200) this.routes.shift();
        this.log(`巡堂：${P.N[this.at].zh} → ${P.N[to].zh}`);
        await this.walk(P.makeLeg([this.at, ...names])); if (!this.alive(tok)) return;
        this.cameFrom = this.at; this.at = to;
        const quiet = this.rand() < .22, front = to === 'LF' || to === 'RF';
        await this.dwell(front ? 2400 + this.rand() * 1600 : quiet ? 4000 + this.rand() * 3000 : 1200 + this.rand() * 1800, to);
      }
    }
    /* --- public --- */
    start(delay = 0, from) {
      this.claim(); const tok = ++this.tok;
      if (from) this.at = from; else this.at = this.nearestStop();
      this.mode = 'stand';
      (async () => { await this.sleep(delay); if (!this.alive(tok)) return;
        if (dist(this.s, P.N[this.at]) > 1) { await this.walk(P.makeLeg([{ x: this.s.x, y: this.s.y }, this.at])); if (!this.alive(tok)) return; }
        this.loop(tok); })();
    }
    nearestStop(here = this.s) { let best = 'BL', d = 1e9; for (const k of ['BL', 'BC', 'BR', 'LF', 'RF', 'ST']) { const e = dist(here, P.N[k]); if (e < d) { d = e; best = k; } } return best; }
    halt() {   // stop where he is (drawn, standing); a walk to the stance that was under way ends as aborted
      this.tok++; this.mode = this.active ? 'stand' : 'off'; this.slow = 1; this.s.face = 'kind'; this.s.turnKey = null;
      if (this.pendingStance) { const r = this.pendingStance; this.pendingStance = null; r({ aborted: true }); }
    }
    off() { this.halt(); this.release(); }
    // Round 5: stop patrolling, walk by the safe paths to a stop and stand there facing fam (unhurried; at once with
    // reduced motion). Resolves { aborted } like toStance.
    park(stop, fam, { speed = 40 } = {}) {
      this.claim(); this.halt();
      const tok = ++this.tok, alive = () => tok === this.tok && this.active;
      this.parked = stop;
      return (async () => {
        if (this.mode === 'walk' || this.leg) { await this.settleFeet(); if (!alive()) return { aborted: true }; }
        const leg = this.wayLeg(stop, undefined, null, this.nearestStop(), speed);
        if (leg) { this.leg = null; await this.walk(leg); if (!alive()) return { aborted: true }; }
        this.s.x = P.N[stop].x; this.s.y = P.N[stop].y; this.at = stop;
        await this.turnTo(fam); if (!alive()) return { aborted: true };
        this.mode = 'stand'; this.render(this.t);
        return { aborted: false };
      })();
    }
    placeAt(n, fam) { this.claim(); this.halt(); Object.assign(this.s, { x: P.N[n].x, y: P.N[n].y, phase: 0, turnKey: null }); if (fam) this.s.fam = fam; this.at = n; this.render(this.t); }
    // to the reminder stance. Resolves { aborted } once he stands there facing the mochi (or was stopped).
    toStance(o) {
      if (!this.active) return Promise.resolve({ aborted: false });
      return new Promise(res => { this.pendingStance = res; this._toStance(o).then(v => { if (this.pendingStance === res) { this.pendingStance = null; res(v); } }); });
    }
    async _toStance({ quick = false } = {}) {
      const tok = ++this.tok, alive = () => tok === this.tok && this.active;
      const wasWalking = this.mode === 'walk' && !!this.leg, legThen = wasWalking ? this.leg : null;
      // 1. finish the step and stop (if he was walking): slow to a halt over a quarter of a second along his path
      if (this.mode === 'walk' && this.leg && !this.rm()) {
        const leg = this.leg; let u = 0;
        while (alive() && u < 1 && this.legT < leg.total) { const b = this.t; await this.frame(); const dt = this.t - b; u += dt / 260; const q0 = leg.at(this.legT); this.legT = Math.min(leg.total, this.legT + dt * (1 - u)); const q = leg.at(this.legT); this.s.phase += dist(q0, q) / STRIDE; this.s.x = q.x; this.s.y = q.y; }
      }
      if (!alive()) return { aborted: true };
      await this.settleFeet(); if (!alive()) return { aborted: true };
      // 2. notice: serious, a look toward the mochi
      this.s.face = 'stern'; this.s.tilt = 0; this.mode = 'stand';
      if (!quick) { await this.turnTo(this.s.x < P.MOCHI.x ? 'R' : 'L'); if (!alive()) return { aborted: true }; await this.sleep(this.rm() ? 200 : 380); if (!alive()) return { aborted: true }; }
      // 3. by the safe paths to the stance: through whichever nearby stop is shorter
      const leg = this.stanceLeg(undefined, legThen);
      if (leg) { this.leg = null; await this.walk(leg, { brisk: true }); if (!alive()) return { aborted: true }; }
      this.s.x = P.N.ST.x; this.s.y = P.N.ST.y; this.at = 'ST';
      await this.turnTo('R'); if (!alive()) return { aborted: true };
      this.s.face = 'kind'; this.render(this.t);
      this.release();
      return { aborted: false };
    }
    // the way to the stance from where he is now (null if he is there): his current leg's ends and the nearest stop are
    // tried, the shortest wins; the first stretch runs back along (or on along) the leg he was on
    stanceLeg(here = { x: this.s.x, y: this.s.y }, leg = this.leg, at = this.at) { return this.wayLeg('ST', here, leg, at); }
    // Round 5: the same, to any stop (the production app parks him by the mochi while talking, at the tea table on a break)
    wayLeg(target, here = { x: this.s.x, y: this.s.y }, leg = this.leg, at = this.at, speed = 62) {
      const T = P.N[target];
      if (dist(here, T) <= .5) return null;
      const via = leg ? [leg.names[0], leg.names[leg.names.length - 1]] : [at], cands = [];
      const near = Object.keys(P.N).sort((a, b) => dist(here, P.N[a]) - dist(here, P.N[b])).slice(0, 2);
      for (const n of new Set([...via.filter(v => typeof v === 'string'), this.nearestStop(here), ...near])) { const path = P.pathTo(n, target); if (!path) continue;
        let L = dist(here, P.N[n]); for (let i = 1; i < path.length; i++) L += dist(P.N[path[i - 1]], P.N[path[i]]);
        const way = (dist(here, P.N[n]) > 1 ? [here] : []).concat(path);
        cands.push({ n, way: way.length > 1 ? way : [here, target], L }); }
      // shortest first, but only a way whose footprint keeps the safe-zone margin (it may touch it only at the stance)
      const pt = w => typeof w === 'string' ? P.N[w] : w, clear = way => { for (let i = 1; i < way.length; i++) { const a = pt(way[i - 1]), b = pt(way[i]), n = Math.ceil(dist(a, b) / 1.5);
        for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n; if (dist({ x, y }, T) > 12 && P.footHits(x, y).length) return false; } } return true; };
      cands.sort((a, b) => a.L - b.L);
      const c = cands.find(c => clear(c.way)) || cands[0];
      return P.makeLeg(c.way, { speed, straight: true });
    }
    /* --- one frame (dt ms, already clamped by the host) --- */
    update(dt, now) {
      this.poses.tick();
      if (!this.active) return 0;
      const t0 = performance.now();
      this.t += dt;
      for (const w of this.waits.slice()) if (w.tok !== this.tok) { this.waits.splice(this.waits.indexOf(w), 1); }
      const due = this.waits.filter(w => w.frame || w.at <= this.t); this.waits = this.waits.filter(w => !due.includes(w)); due.forEach(w => w.r());
      this.render(now);
      return performance.now() - t0;
    }
    poseKey() {
      const s = this.s, rm = this.rm();
      if (s.turnKey && !rm) return `T:${s.turnKey}:${s.face}`;
      const ph = rm ? 0 : (((Math.floor((s.phase % 1) * PHASES + .5)) % PHASES) + PHASES) % PHASES;
      return `W:${s.fam}:${ph}:${s.face}:${rm ? 0 : s.tilt}`;
    }
    render(now = 0) {
      if (!this.active || !this.useEl) return;
      const key = this.poseKey();
      if (key !== this.key) { this.useEl.setAttribute('href', '#' + this.poses.id(key)); this.key = key; this.stats.swaps++; }
      const s = this.s, d = P.depth(s.y), walking = this.mode === 'walk' && !this.rm();
      const bob = walking ? -Math.abs(Math.sin(TAU * s.phase)) * 1.2 : 0, breath = this.rm() || walking ? 0 : Math.sin(now / 1000 * 1.5) * .3;
      this.actor.back.setAttribute('transform', `translate(${s.x.toFixed(2)} ${(s.y + bob + breath).toFixed(2)}) scale(${d.toFixed(4)})`);
      Object.assign(this.actor.s, { x: s.x, y: s.y, depth: d, dir: s.fam === 'L' ? -1 : 1 });
      // layer by depth: behind the mochi while his feet are behind hers
      const front = P.inFront(s.y), back = this.actor.back;
      if (front && back.previousElementSibling !== this.lip) this.lip.after(back);
      if (!front && back.parentNode !== this.slot) this.slot.appendChild(back);
    }
    state() { return { active: this.active, mode: this.mode, x: +this.s.x.toFixed(2), y: +this.s.y.toFixed(2), fam: this.s.fam, face: this.s.face, key: this.key, at: this.at, seed: this.seed, routes: this.routes.slice(), built: this.poses.built }; }
  }
  window.NaturalPatrol = NaturalPatrol;
  window.NATURAL_PATROL = { ROUTES, TURN, STOP_FACE, PHASES, walkMod, buildPose, allKeys };
})();
