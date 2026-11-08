/* =====================================================================
   Round 5 — the monk in the production app.

   One controller owns the monk: nothing else moves him or changes what he is drawing. It puts together the
   accepted Round 4 pieces as they are:
   • NaturalPatrol (Round 4.2B): the candidate-B walks and turns on the Round 4.1 safe paths, drawn from a bank of
     poses built once (<defs> + one <use>), and the walk to the reminder stance;
   • MonkActor (Round 4): the accepted Round 3.5 reminder (MONK4.art + KEISAKU_ANIM), from the stance.

   The app says what is going on (its own phases, its own timer) through mode(); it sends distractions through
   remind(). A reminder that is already under way (walking to the stance or striking) takes any new one in: it is
   not queued or replayed (the app has already counted it), and the reminder says how many more there were.

   Coordinates: the monk lives in the Round 4 scene's units. The production scene (viewBox 400 × 280) has its mochi
   at (200, 240); the Round 4 scene had her at (206, 257). The monk's three layers sit in groups translated by
   OFF = (−6, −17), so the two mochi coincide and every Round 4 path, stance and safe zone keeps its numbers.
   ===================================================================== */
(function () {
  'use strict';
  const P = PATROL, OFF = { x: -6, y: -17 };
  // the production app's own places for him, as stops on the safe paths (Round 4 units)
  P.addStop('HO', { x: 72, y: 238, zh: '對話時（麻糬左邊）' }, ['BL']);       // was HOST_X = 72 (production units)
  P.addStop('TE', { x: 196, y: 228, zh: '休息時（香案旁喝茶）' }, ['BC', 'BL']);   // was TEA_X = 190
  const PARK = { host: ['HO', 'R'], rest: ['TE', 'L'], leave: ['BL', 'R'] };

  class MonkDirector {
    constructor({ slot, lip, fx, defs, rm = () => false, seed = 1 + Math.floor(Math.random() * 99999) }) {
      const back = document.createElementNS('http://www.w3.org/2000/svg', 'g'), front = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      back.id = 'monk'; front.id = 'monkFx';
      slot.appendChild(back); fx.appendChild(front);
      this.K = new MonkActor(back, front, { rm, depth: P.depth });
      this.K.s.x = P.N.HO.x; this.K.s.y = P.N.HO.y;
      this.NP = new NaturalPatrol({ actor: this.K, defs, lip, slot, seed, rm });
      this.rm = rm; this.want = 'host'; this.applied = null; this.busy = false; this.tok = 0; this.merged = 0;
      this.stats = { reminders: 0, merged: 0, aborted: 0 };
      this.NP.placeAt('HO', 'R');
      this.apply();
    }
    // where he is, in the host scene's units (for the speech bubble)
    pos() { const s = this.K.s; return { x: s.x + OFF.x, y: s.y + OFF.y, depth: P.depth(s.y) }; }
    // what he should be doing when he is not reminding: 'patrol' | 'host' | 'rest' | 'leave'
    mode(want) { this.want = want; if (!this.busy) this.apply(); }
    apply() {
      if (this.busy || this.applied === this.want) return;
      const want = this.applied = this.want;
      if (want === 'patrol') { this.NP.start(this.rm() ? 0 : 400); return; }
      const [stop, fam] = PARK[want]; this.NP.park(stop, fam);
    }
    // a distraction. Resolves when the reminder it started is over (or at once, if it was merged into one under way).
    //   o.ask: asked for (合掌請打) — ignored while one is under way, as in the app
    //   o.onCall(): the 喝 / 請 beat; o.onImpact(): the keisaku lands; returns 'merged' | 'ignored' | a Promise
    remind(o = {}) {
      if (this.busy) { if (o.ask) return 'ignored'; this.merged++; this.stats.merged++; return 'merged'; }
      this.busy = true; this.merged = 0; this.stats.reminders++;
      const tok = ++this.tok, K = this.K, NP = this.NP;
      return (async () => {
        try {
          if (!NP.active) NP.claim();
          const r0 = await NP.toStance({});
          if (r0.aborted || tok !== this.tok) return { aborted: true, merged: this.merged };
          const res = await K.perform({ quick: true,
            onSeg: id => { if (id === 'call' && tok === this.tok) o.onCall && o.onCall(); },
            onImpact: () => { if (tok === this.tok) o.onImpact && o.onImpact(); } });
          return { aborted: !!res.aborted || tok !== this.tok, merged: this.merged };
        } finally {
          if (tok === this.tok) { this.busy = false; this.applied = null; this.apply(); }
        }
      })();
    }
    // 出堂 or a reset: the reminder stops now, he is put straight back in the hanging pose and goes to his place
    abort() {
      if (!this.busy) return;
      this.tok++; this.busy = false; this.stats.aborted++;
      if (this.K.busy) this.K.abort();
      if (this.NP.pendingStance) this.NP.halt();
      this.applied = null; this.apply();
    }
    frame(dt, now) { this.NP.update(dt, now); this.K.render(dt, now); }
    state() {
      const k = this.K.state(), n = this.NP.state();
      return { busy: this.busy, want: this.want, merged: this.merged, x: +this.K.s.x.toFixed(2), y: +this.K.s.y.toFixed(2), monk: k, patrol: n, stats: { ...this.stats } };
    }
  }
  window.MonkDirector = MonkDirector;
  window.MONK_OFF = OFF;
})();
