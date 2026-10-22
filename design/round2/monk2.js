/* =====================================================================
   住持 v2 — rebuilt from a structure, not patched from the Round 1 paths.

   Base view: three-quarter, facing right. Every part follows the same turn:
     head      centre (3,-74); the face's centre line sits at x≈12, the ear on the back side
     neck      centre x≈4 (shifted toward the facing side), hidden by the collar
     shoulders near (character's right) at x≈-19, far (left) at x≈11, behind the chest
     body axis x≈0 at the hem, belly forward on the facing side, weight on the heels
     collar    kimono rule: the wearer's LEFT panel is always on top
     feet      both point toward the facing side, the far one behind
   Facing left is the mirror image EXCEPT the collar, which is rebuilt so the wearer's
   left panel still lies on top (a plain mirror would cross it the wrong way).

   Line system: every part carries a thin inner stroke (1.3). A second copy of the
   same parts, filled and stroked with ink at 4.0 and drawn behind, makes ONE outer
   contour around the union — so the silhouette has one even weight and joints never
   stack two heavy outlines. Details (collar, rakusu, folds, face) are excluded from
   that copy. Props (the keisaku) draw their own lighter 1.1 line.
   ===================================================================== */
(function () {
  const BODY = 'M4 -55.2 C-4 -55.2 -11 -53.5 -15.5 -49 L-18.5 -30 C-19.8 -20 -21.2 -10 -22.4 -2.4 Q-1 1.4 20.6 -2.6 C21.6 -10 22.6 -19 21.2 -28 C19.8 -37.5 16.4 -45.5 11.4 -50.8 C9.2 -53 7 -55.2 4 -55.2 Z';
  const HEAD = 'M2 -94 C-9 -94 -17.5 -86 -17.5 -75 C-17.5 -66 -13 -59 -6 -56.2 C-1 -54.4 6 -54.2 11 -55.4 C17 -57 21.5 -62 22.2 -68.5 C23 -76 21.5 -84 16 -89.5 C12 -92.8 7 -94 2 -94 Z';
  const SLEEVE = {
    carryNear: 'M0 -55.4 C-7 -56 -14.6 -53.8 -19 -48.6 C-22.2 -44.6 -23.2 -37.6 -23.2 -30 C-23.2 -19.6 -20.6 -8.6 -14 -8.6 C-9.8 -8.6 -7.6 -11.2 -7.2 -15 L-7.6 -24.6 C-8 -27 -9.4 -28.6 -11.2 -29.6 C-12.4 -34 -11.6 -40.6 -9 -45.2 C-7 -48.6 -3.8 -52.8 0 -55.4 Z',
    carryFar: 'M12 -49 C15.8 -47.6 18.6 -44.6 20.6 -40.4 C24.4 -33.6 27.4 -27 27.4 -19.4 C27.4 -12 24.4 -8.4 20.4 -8.6 C16.6 -8.8 14 -11.6 13.6 -16 L12 -44 Z',
    tuckNear: 'M0 -55.4 C-7 -56 -14.6 -53.8 -19 -48.6 C-22.2 -44.6 -23.2 -37.6 -23.2 -30 C-23.2 -19 -20.4 -9.4 -14 -9.4 C-10 -9.4 -7.4 -11.6 -6.4 -14.8 C-1.6 -15.6 5.6 -16.4 10.2 -17.8 C12.6 -18.8 13.6 -22.2 13 -25 C12.4 -27.6 10.2 -28.8 7.4 -28.8 C1.4 -28.8 -5.4 -29.6 -9.8 -31.4 C-11.4 -36.6 -10.6 -42.6 -8.4 -46.4 C-6.4 -49.6 -3.4 -53 0 -55.4 Z',
    tuckFar: 'M6 -29.8 C12 -31 18.2 -31.4 21.8 -29.4 C24.8 -27.4 26.2 -21.6 25.8 -15.6 C25.4 -10.2 22.4 -7.6 18.4 -8 C14.8 -8.4 12.8 -11.4 12.4 -15.8 L6 -18 Z',
  };
  const FOOT_FAR = 'M5 -0.8 C5 -3.4 8.4 -4.4 12.2 -4.2 C15.8 -4 18.4 -2.6 18.4 -0.8 C18.4 0.8 15.4 1.4 11.8 1.4 C8.2 1.4 5 1.1 5 -0.8 Z';
  const FOOT_NEAR = 'M-13.2 -0.2 C-13.2 -3 -9.8 -4.2 -5.6 -4.2 C-1.6 -4.2 1.8 -2.8 1.8 -0.4 C1.8 1.4 -1.6 2.2 -5.6 2.2 C-9.8 2.2 -13.2 1.8 -13.2 -0.2 Z';
  const FIST = 'M-6.6 -21.6 C-6.4 -24.4 -3.8 -25.2 -1.2 -24.2 C1 -23.4 1.8 -20.8 1.2 -18.6 C0.6 -16 -2.2 -14.8 -4.6 -15.6 C-6.4 -16.2 -6.8 -18.8 -6.6 -21.6 Z';
  // the keisaku rests on the near shoulder (-18.5,-48.5); the fist holds it at (-4.4,-19.8)
  const STICK_BASE = { x: 1.86, y: -10.8, rot: -28.4 };

  // fill / stroke through custom properties so the same parts can be re-drawn as the silhouette
  const part = (d, fill, extra = '') => `<path class="m2p" d="${d}" style="--c:${fill}" ${extra}/>`;
  const line = (d, w = 1, o = 1, extra = '') => `<path class="m2l" d="${d}" style="--w:${w};opacity:${o}" ${extra}/>`;

  const FACES = {
    kind: `<ellipse cx="8.4" cy="-72.6" rx="1.9" ry="2.3" class="m2ink"/><ellipse cx="16.6" cy="-72.6" rx="1.6" ry="2.2" class="m2ink"/>
           ${line('M11.4 -64 q2.6 2 5 -.2', 1.4)}`,
    laugh: `${line('M6.2 -72 q2.2 -2.8 4.4 0 M14.6 -72 q2 -2.6 4 0', 1.5)}
            <path class="m2f" d="M10.6 -65.2 q3.2 5 6.6 -.4 z" style="--c:#b5534b"/>`,
    stern: `<ellipse cx="8.4" cy="-72.2" rx="1.9" ry="1.9" class="m2ink"/><ellipse cx="16.6" cy="-72.2" rx="1.6" ry="1.8" class="m2ink"/>
            ${line('M11.6 -63.6 h4.6', 1.5)}`,
  };
  const BROWS = {
    kind:  ['M4.4 -77.4 C5.6 -80.4 9.6 -81 11.4 -78.6 C10 -77.6 6.6 -77 4.4 -77.4 Z', 'M14.4 -78.4 C15.6 -80.8 18.8 -80.8 20 -78.4 C18.8 -77.6 16 -77.4 14.4 -78.4 Z'],
    laugh: ['M4.6 -78 C5.8 -81 9.8 -81.4 11.4 -79 C10 -78 6.8 -77.6 4.6 -78 Z', 'M14.4 -79 C15.6 -81.4 18.8 -81.2 20 -78.8 C18.8 -78 16 -77.8 14.4 -79 Z'],
    stern: ['M5 -79.6 C7 -80.6 10.2 -79.4 11.8 -76.6 C9.6 -76.4 6.6 -77.4 5 -79.6 Z', 'M13.6 -76.8 C15 -79.4 18 -80.4 19.8 -79.4 C18.4 -77.4 15.8 -76.6 13.6 -76.8 Z'],
  };

  /* collar: A = start of the near-side lapel at the neck, B = far-side lapel, C = where they cross (under the rakusu).
     topNear=false (facing right): the far lapel (wearer's left) is on top and its edge runs on down toward the near side.
     topNear=true  (facing left, drawn before the mirror): the near lapel (wearer's left) is on top. */
  function collar(topNear) {
    const A = [-1.5, -56], B = [11.5, -55.6], C = [6, -43];
    const band = (p, q, ext = 0) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), e = [q[0] + dx / L * ext, q[1] + dy / L * ext];
      return `<path d="M${p} L${e}" class="m2band-o"/><path d="M${p} L${e}" class="m2band"/>`; };
    const under = topNear ? band(B, C, 1) : band(A, C, 1), top = topNear ? band(A, C, 3.5) : band(B, C, 3.5);
    // the top panel's front edge (okumi) runs from the crossing down to the hem, toward the wearer's right hip
    const okumi = topNear ? line('M6 -43 C7.8 -30 9.8 -15 11 -2', 1.1, .85) : line('M6 -43 C5.4 -30 4.4 -15 3.6 -1.8', 1.1, .85);
    return `<g class="m2det">
      <path class="m2f m2s" d="M${A} L${C} L${B} Z" style="--c:#f6f2e8;--w:1.1"/>
      ${under}${top}${okumi}</g>`;
  }
  // rakusu: hung from the neck, panel on the chest just below the crossing. The ring sits on the wearer's left strap.
  function rakusu(ringOnNear) {
    const strap = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" class="m2strap"/>`;
    const ring = [1.3, -46.8];
    return `<g class="m2det">
      ${strap(1.6, -44, 0.6, -56)}${strap(15.4, -44, 14.6, -56.4)}
      ${ringOnNear ? `<circle cx="${ring[0]}" cy="${ring[1]}" r="1.8" class="m2ring"/>` : ''}
      <rect x="-0.8" y="-44.6" width="18" height="10.8" rx="1.4" class="m2f m2s" style="--c:var(--kesa);--w:1.3"/>
      <rect x="1.4" y="-42.6" width="13.6" height="6.8" rx=".6" class="m2l" style="--w:.8;opacity:.4;fill:none"/>
      ${line('M6 -42.6 v6.8 M10.4 -42.6 v6.8', .7, .3)}
    </g>`;
  }

  function stick(pose) {
    if (pose !== 'carry') return '';
    const s = STICK_BASE;
    return `<g class="m2det m2stick" transform="translate(${s.x} ${s.y}) rotate(${s.rot})">
      <rect x="-1.35" y="-62" width="2.7" height="62" rx="1.2"/>
      <rect x="-2.8" y="-85" width="5.6" height="25" rx="2.2"/>
      <path d="M-1.6 -66 v-15" class="m2l" style="--w:.6;opacity:.35"/>
    </g>`;
  }

  /* the layers, back to front. Order is per pose: in "carry" the keisaku goes over the
     shoulder sleeve and under the fist; in "tuck" the far forearm is in front of the body. */
  function layers(o) {
    const { pose, face, facing } = o, L = facing === 'left';
    const near = pose === 'carry' ? SLEEVE.carryNear : SLEEVE.tuckNear, far = pose === 'carry' ? SLEEVE.carryFar : SLEEVE.tuckFar;
    const clipId = o.id + '-clip';
    const farSleeve = { name: '後側袖', svg: `${part(far, 'var(--robe)')}<g class="m2det" clip-path="url(#${clipId}-far)"><path d="M10 -30 C20 -22 22 -12 16 -4 L30 -4 L30 -30 Z" style="fill:var(--robe-lo);opacity:.75"/></g>
      ${line(pose === 'carry' ? 'M26.4 -25 C24.4 -23.4 23.4 -20.4 23.8 -16.8' : 'M14 -16 C16 -20 19 -25 21.5 -28.6', .9, .4, 'class="m2l m2det"')}` };
    const feet = { name: '雙腳', svg: `${part(FOOT_FAR, '#f2ede2')}${part(FOOT_NEAR, '#f2ede2')}` };
    const body = { name: '外袍', svg: `${part(BODY, 'var(--robe)')}
      <g class="m2det" clip-path="url(#${clipId}-body)">
        <path d="M-26 -16 C-20 -10 -17 -5 -15.6 2 L-26 2 Z" style="fill:var(--robe-lo)"/>
        <ellipse cx="-13" cy="-7" rx="8" ry="2.2" style="fill:var(--robe-lo);opacity:.5"/>
        <path d="M12 2 C17 -1 20 -5 21.6 -11 L26 -11 L26 2 Z" style="fill:var(--robe-lo);opacity:.45"/>
      </g>
      ${line('M15.6 -15 C17.4 -10.6 17.6 -6.4 16.6 -2.8', .9, .4, 'class="m2l m2det"')}` };
    const coll = { name: '衣領', svg: collar(L) };
    const rak = { name: '絡子', svg: rakusu(L) };
    const nearSleeve = { name: '前側袖', svg: `${part(near, 'var(--robe)')}
      <g class="m2det" clip-path="url(#${clipId}-near)"><path d="M-27 -22 C-22 -12.6 -15.6 -10.6 -5 -13.6 L-5 0 L-27 0 Z" style="fill:var(--robe-lo);opacity:.85"/>
        <path d="M-30 -60 L-19.6 -60 C-21.6 -48 -21.8 -36 -20 -24 L-30 -24 Z" style="fill:var(--robe-lo);opacity:.5"/></g>
      ${pose === 'carry' ? `<ellipse cx="-7.2" cy="-19.8" rx="2.5" ry="5.2" transform="rotate(-6 -7.2 -19.8)" class="m2f m2s m2det" style="--c:var(--robe-in);--w:1.1"/>
          ${line('M-16.8 -33.6 C-14.4 -29 -11.6 -26 -9.4 -24.6', .9, .4, 'class="m2l m2det"')}`
        : `${line('M9.6 -18.4 C11 -21 11 -25.2 9 -28.2', 1, .7, 'class="m2l m2det"')}${line('M-15.5 -33 C-13 -28 -10 -24 -7.5 -20.5', .9, .4, 'class="m2l m2det"')}`}` };
    const stk = { name: '香板', svg: stick(pose) };
    const hand = { name: '手', svg: pose === 'carry' ? `${part(FIST, 'var(--skin)')}${line('M-2.2 -23.8 C-0.8 -21.6 -0.8 -18.8 -2 -16.4', .9, .55, 'class="m2l m2det"')}` : '' };
    const head = { name: '頭部', svg: `${part(HEAD, 'var(--skin)')}
      <g class="m2det" clip-path="url(#${clipId}-head)"><path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.55"/></g>
      ${part('M-14.4 -76.6 C-17.6 -76.6 -18.8 -73.4 -18.4 -70.8 C-18 -68 -16 -66.4 -13.8 -66.8 C-12.6 -68.6 -12.4 -73.6 -14.4 -76.6 Z', 'var(--skin)')}
      ${line('M-15 -74 q-2 1.8 -.4 4.4', .9, .55, 'class="m2l m2det"')}
      <g class="m2det">
        <path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>
        <ellipse cx="5.6" cy="-66.4" rx="3.6" ry="2" style="fill:var(--blush);opacity:.6"/><ellipse cx="19.6" cy="-66.2" rx="1.8" ry="1.6" style="fill:var(--blush);opacity:.6"/>
        ${FACES[face]}
        ${BROWS[face].map(d => `<path d="${d}" class="m2f m2s" style="--c:#f6f1e6;--w:1"/>`).join('')}
      </g>` };
    return pose === 'carry'
      ? [farSleeve, feet, body, coll, rak, nearSleeve, stk, hand, head]
      : [feet, body, coll, rak, farSleeve, nearSleeve, head];
  }

  function clips(o) {
    const c = o.id + '-clip', p = o.pose === 'carry';
    return `<clipPath id="${c}-body"><path d="${BODY}"/></clipPath><clipPath id="${c}-head"><path d="${HEAD}"/></clipPath>
      <clipPath id="${c}-near"><path d="${p ? SLEEVE.carryNear : SLEEVE.tuckNear}"/></clipPath><clipPath id="${c}-far"><path d="${p ? SLEEVE.carryFar : SLEEVE.tuckFar}"/></clipPath>`;
  }

  /* public: markup for one monk. o = { id, facing: 'right'|'left', pose: 'carry'|'tuck', face, upto (number of layers, for the build-up diagram), mode: 'art'|'sil'|'lines' } */
  window.monkV2 = function (o) {
    o = Object.assign({ facing: 'right', pose: 'carry', face: 'kind', mode: 'art', shadow: true }, o);
    const ls = layers(o).slice(0, o.upto || 99), art = ls.map(l => `<g data-layer="${l.name}">${l.svg}</g>`).join('');
    const flip = o.facing === 'left' ? ' transform="scale(-1 1)"' : '';
    const sil = o.mode === 'lines' ? 'm2-sil m2-sil-diag' : 'm2-sil';
    return `<g class="m2 ${o.mode === 'lines' ? 'm2-lines' : ''}" id="${o.id}">
      <defs>${clips(o)}<g id="${o.id}-art">${art}</g></defs>
      ${o.shadow ? '<ellipse cx="1" cy="1.4" rx="25" ry="4.2" class="m2shadow"/>' : ''}
      <g${flip}>${o.mode !== 'nosil' ? `<use href="#${o.id}-art" class="${sil}"/>` : ''}<use href="#${o.id}-art"${o.mode === 'silonly' ? ' style="--flat:#fff;--inner:transparent;--det:none"' : ''}/></g>
    </g>`;
  };
  window.monkV2Layers = o => layers(Object.assign({ facing: 'right', pose: 'carry', face: 'kind', id: 'x' }, o)).map(l => l.name);
})();
