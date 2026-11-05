/* =====================================================================
   Round 4 — the Round 3.5 monk as an actor for the game prototype.

   The game decides WHAT happens (a distraction was caught, walk there, stop); this module decides how it LOOKS,
   using the accepted Round 3.5 drawing (MONK4) and timeline (KEISAKU_ANIM) as they are:
   • the reminder is one timeline: notice → raise → approach (→ turn) → call → the accepted pre … rest segments
     (their poses and times are not changed; the hit lands where Round 3.5 put it, with the monk at x = 132);
   • every frame of it is computed by KEISAKU_ANIM.poseAt (joints, keisaku from the fist, skinned sleeves, lag) and
     drawn by MONK4.art in two layers: the body behind the mochi, the keisaku and its fist in front while striking;
   • the actor has its own clock. It only advances while frames are drawn, so a hidden page simply pauses the
     performance and it carries on from the same frame when the page comes back (no jump, no replay);
   • between performances the monk stands in the static poses (香板垂放 with the keisaku, 站姿 without), and only
     redraws when something visible changes.
   ===================================================================== */
(function () {
  'use strict';
  const A = KEISAKU_ANIM, MK = MONK4;
  const HIT_X = A.MONK_AT[0], WALK = 170;            // the Round 1 approach speed (units / s)
  const inOut = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  // the accepted Round 3.5 segments, as rows for KEISAKU_ANIM.makePlan
  const ACCEPTED = () => A.SEG().map(s => [s.id, s.zh, s.a, s.b, s.e, s.t1 - s.t0]);
  // eyes / mouth names used by the Round 1 prototype → the Round 3 monk's faces
  const EYES = { open: 'kind', smile: 'relief', shut: 'relief', stern: 'stern' };

  class MonkActor {
    constructor(back, front, { rm = () => false } = {}) {
      this.back = back; this.front = front; this.rm = rm;
      this.s = { x: 72, y: 254, dir: 1, head: 0, bobY: 0, arm: 0, lean: 0, squash: 1, moving: false };
      this.stickOn = true; this.faceK = 'kind'; this.walk = 0; this.sway = 1; this.t = 0;
      this.mv = null; this.turnTo = null; this.perf = null; this.key = ''; this.stats = { redraws: 0, ms: 0 };
    }
    /* ---- the Round 1 prototype's monk API (so its patrol, idle beats and ceremony keep working) ---- */
    eyes(k) { this.faceK = EYES[k] || 'kind'; }
    mouth() {}
    holdStick(on) { this.stickOn = on; }
    setFace(f) { this.faceK = f; }
    walkTo(x, speed = 150) {
      const from = this.s.x, d = Math.abs(x - from);
      if (this.mv) this.mv.done();
      if (d < 1 || this.rm()) { this.s.x = x; return Promise.resolve(); }
      this.s.dir = x > from ? 1 : -1;
      return new Promise(done => { this.mv = { from, to: x, t: 0, ms: d / speed * 1000, done: () => { this.mv = null; this.s.moving = false; done(); } }; });
    }
    face(dir) {
      if (this.s.dir === dir) return Promise.resolve();
      if (this.rm()) { this.s.dir = dir; return Promise.resolve(); }
      return new Promise(done => { this.turnTo = { from: this.s.dir, to: dir, t: 0, ms: 180, done: () => { this.turnTo = null; done(); } }; });
    }
    get busy() { return !!this.perf; }

    /* ---- the reminder ----
       opts: { quick: skip notice + approach (Round 1 rule: he is still standing there), onSeg(id), onImpact() }
       resolves { aborted } when the monk is back in the hanging pose (or was stopped) */
    perform(opts = {}) {
      if (this.perf) this.abort();
      if (this.mv) this.mv.done();
      if (this.turnTo) { this.s.dir = this.turnTo.to; this.turnTo.done(); }
      this.stickOn = true; this.s.head = 0;
      const x0 = this.s.x, rows = [], rm = this.rm();
      let walkDir = Math.sign(HIT_X - x0) || 1;
      if (rm) {   // reduced motion: no walking, no swing — the key poses held, cut from one to the next
        this.s.x = HIT_X; this.s.dir = 1;
        rows.push(['notice', '察覺', 'idleNotice', 'idleNotice', 'lin', 350], ['stop', '命中', 'strike', 'strike', 'lin', 600], ['rest', '待機', 'idle', 'idle', 'lin', 350]);
      } else {
        if (!opts.quick) rows.push(['notice', '察覺', 'idle', 'idleNotice', 'sine', 450], ['raise', '舉板', 'idleNotice', 'ready3', 'inOut', 420]);
        else rows.push(['raise', '舉板', 'idle', 'ready3', 'inOut', 420]);
        const d = Math.abs(HIT_X - x0);
        if (d >= 1) rows.push(['approach', '走近', 'ready3', 'ready3', 'lin', d / WALK * 1000]);
        if (walkDir < 0 || (d < 1 && this.s.dir < 0)) rows.push(['turn', '轉身', 'ready3', 'ready3', 'lin', 180]);
        rows.push(['call', '喝', 'ready3', 'ready3', 'lin', 300], ...ACCEPTED());
      }
      // he turns to face the mochi in the first 180 ms of noticing (she may be on his other side)
      const faceDir = rm ? 1 : (Math.abs(HIT_X - x0) < 1 ? this.s.dir : walkDir);
      const plan = A.makePlan(rows);
      return new Promise(resolve => {
        this.perf = { plan, t: 0, x0, rm, seg: '', impacted: false, opts, resolve, dirStart: this.s.dir, faceDir };
        this.key = '';
      });
    }
    abort() {    // e.g. a reset: straight back to the hanging pose, no count
      const p = this.perf; if (!p) return;
      this.perf = null; this.s.x = HIT_X; this.s.dir = 1; this.s.moving = false; this.key = '';
      p.resolve({ aborted: true });
    }
    // what the mochi should look like right now, if the monk's performance decides it (null otherwise)
    mochi() {
      const p = this.perf; if (!p || !p.impacted) return null;
      if (p.rm) { const st = A.segOf(p.plan, 'stop'); return p.t < st.t1 ? { sx: 1.07, sy: .88, face: 'ouch' } : { sx: 1, sy: 1, face: 'teary' }; }
      return A.mochiAt(p.t, p.plan);
    }
    state() { const p = this.perf; return { performing: !!p, seg: p ? p.seg : (this.mv ? 'walk' : 'still'), t: p ? Math.round(p.t) : 0, total: p ? Math.round(A.total(p.plan)) : 0, x: +this.s.x.toFixed(1), dir: this.s.dir, pose: p ? 'anim' : (this.stickOn ? 'idle' : 'stand'), face: this.faceK }; }

    /* ---- one frame: dt = ms since the last drawn frame (the host clamps it), now = rAF time ---- */
    render(dt, now) {
      const s = this.s, rm = this.rm(), t0 = performance.now();
      this.t += dt;
      // walking and turning (between performances)
      if (this.mv) { const m = this.mv; m.t += dt; const u = Math.min(1, m.t / m.ms); s.x = lerp(m.from, m.to, inOut(u)); s.moving = true; if (u >= 1) { s.x = m.to; m.done(); } }
      if (this.turnTo) { const m = this.turnTo; m.t += dt; const u = Math.min(1, m.t / m.ms); s.dir = lerp(m.from, m.to, inOut(u)); if (u >= 1) { s.dir = m.to; m.done(); } }
      const p = this.perf;
      let html, front = '', key, walking = s.moving;
      // the standing sway fades out for a performance and back in after it, so neither end jumps
      this.sway += ((p ? 0 : 1) - this.sway) * Math.min(1, dt / 250);
      if (p) {
        p.t += dt;
        const T = A.total(p.plan), tt = Math.min(p.t, T), r = A.poseAt(tt, {}, p.plan), j = r.j, id = j.s.id;
        if (id !== p.seg) { p.seg = id; p.opts.onSeg && p.opts.onSeg(id); }
        if (tt < 180 && p.dirStart !== p.faceDir) s.dir = lerp(p.dirStart, p.faceDir, inOut(tt / 180));
        else if (id === 'notice' || id === 'raise') s.dir = p.faceDir;
        if (id === 'approach') { const u = (tt - j.s.t0) / (j.s.t1 - j.s.t0); s.x = lerp(p.x0, HIT_X, inOut(u)); s.dir = Math.sign(HIT_X - p.x0) || s.dir; walking = true; }
        else if (A.segOf(p.plan, 'approach') && tt >= A.segOf(p.plan, 'approach').t1) s.x = HIT_X;
        if (id === 'turn') { const u = (tt - j.s.t0) / (j.s.t1 - j.s.t0); s.dir = lerp(-1, 1, inOut(u)); }
        else if (A.segOf(p.plan, 'turn') && tt >= A.segOf(p.plan, 'turn').t1) s.dir = 1;
        const st = A.segOf(p.plan, 'stop');
        if (!p.impacted && tt >= st.t0) { p.impacted = true; p.opts.onImpact && p.opts.onImpact(); }
        const facing = s.dir < 0 ? 'left' : 'right';
        const art = MK.art({ id: 'k4', poseObj: r.p, face: j.face, tilt: j.tilt, split: true, stickBack: !A.stickFrontAt(tt, p.plan), armOverHead: id === 'swing', frontUnder: rm ? '' : r.trail, facing });
        html = art.back; front = art.front; key = 'anim';
        this.faceK = 'kind';
        if (p.t >= T) {   // back in the hanging pose: the static pose takes over (the same drawing, verified in Round 3.5)
          this.perf = null; s.moving = false; this.key = ''; p.resolve({ aborted: false });
        }
      } else {
        const pose = this.stickOn ? 'idle' : 'stand', tilt = 2 + s.head * .6, facing = s.dir < 0 ? 'left' : 'right';
        key = `${pose}|${this.faceK}|${tilt.toFixed(1)}|${facing}`;
        if (key !== this.key) html = MK.art({ id: 'k4', pose, face: this.faceK, tilt, facing });
      }
      if (walking && !rm) this.walk += dt / 1000 * 9.5;
      const step = walking && !rm ? Math.sin(this.walk) : 0;
      const bob = -Math.abs(step) * 2.2 + s.bobY + (rm ? 0 : Math.sin(now / 1000 * 1.6) * .35 * this.sway);
      const sc = Math.max(.05, Math.abs(s.dir));
      const place = `translate(${s.x.toFixed(2)} ${(s.y + bob).toFixed(2)}) scale(${sc.toFixed(3)} 1)`;
      this.back.setAttribute('transform', place); this.front.setAttribute('transform', place);
      // held poses (walking over, the call, the hit-stop, settling) give the same markup frame after frame: only the
      // placement changes then, so the SVG is not re-parsed
      if (html !== undefined && (html !== this.lastHtml || front !== this.lastFront)) { this.back.innerHTML = html; this.front.innerHTML = front; this.lastHtml = html; this.lastFront = front; this.stats.redraws++; }
      if (html !== undefined) this.key = key;
      const ms = performance.now() - t0; this.stats.ms += ms;
      return ms;
    }
  }
  window.MonkActor = MonkActor;
  window.MONK_HIT_X = HIT_X;
})();
