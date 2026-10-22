/* copied verbatim from round1/proto.html: scene, Round 1 mochi and Round 1 monk markup */
const MOCHI_BODY = 'M-34 0 C-38 -10 -36 -30 -26 -48 C-18 -62 -8 -68 0 -68 C8 -68 18 -62 26 -48 C36 -30 38 -10 34 0 C22 4.5 -22 4.5 -34 0 Z';
function sceneDefs() { return `
<defs>
  <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--wall-hi)"/><stop offset="1" style="stop-color:var(--wall)"/></linearGradient>
  <linearGradient id="gAlcove" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--alcove-lo)"/><stop offset=".35" style="stop-color:var(--alcove)"/><stop offset="1" style="stop-color:var(--alcove)"/></linearGradient>
  <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tatami-back)"/><stop offset="1" style="stop-color:var(--tatami)"/></linearGradient>
  <linearGradient id="gAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d14" stop-opacity=".22"/><stop offset="1" stop-color="#2a1d14" stop-opacity="0"/></linearGradient>
  <linearGradient id="gWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--win-a)"/><stop offset="1" style="stop-color:var(--win-b)"/></linearGradient>
  <radialGradient id="gMochi" cx=".36" cy=".26" r=".85"><stop offset="0" style="stop-color:var(--mochi-hi)"/><stop offset=".55" style="stop-color:var(--mochi)"/><stop offset="1" style="stop-color:var(--mochi-lo)"/></radialGradient>
  <linearGradient id="gRobe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--robe-lo)"/><stop offset=".45" style="stop-color:var(--robe)"/><stop offset="1" style="stop-color:var(--robe-lo)"/></linearGradient>
  <radialGradient id="gHead" cx=".38" cy=".32" r=".8"><stop offset="0" style="stop-color:var(--skin)"/><stop offset="1" style="stop-color:var(--skin-lo)"/></radialGradient>
  <linearGradient id="gShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--shaft)" stop-opacity=".0"/><stop offset=".3" style="stop-color:var(--shaft)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--shaft)" stop-opacity=".1"/></linearGradient>
  <radialGradient id="gPatch"><stop offset="0" style="stop-color:var(--shaft)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--shaft)" stop-opacity="0"/></radialGradient>
  <radialGradient id="gAndon"><stop offset="0" stop-color="#ffc583" stop-opacity=".5"/><stop offset=".4" stop-color="#ffb46e" stop-opacity=".18"/><stop offset="1" stop-color="#ffb46e" stop-opacity="0"/></radialGradient>
  <radialGradient id="gVig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#1a120c" stop-opacity="0"/><stop offset="1" stop-color="#1a120c" stop-opacity=".28"/></radialGradient>
  <radialGradient id="gSun"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".4" stop-color="#ff9d52" stop-opacity=".6"/><stop offset="1" stop-color="#ff8a4a" stop-opacity="0"/></radialGradient>
  <filter id="fBlur2" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="fBlur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <pattern id="pWeave" width="6" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 1.2 H6" stroke="var(--tatami-line)" stroke-width=".55" opacity=".7"/></pattern>
  <clipPath id="cRwin"><circle cx="84" cy="100" r="30"/></clipPath>
  <clipPath id="cSwin"><rect x="288" y="70" width="60" height="60"/></clipPath>
</defs>`; }

function windowView(clip) { return `<g clip-path="url(#${clip})">
  <rect x="0" y="40" width="400" height="120" fill="url(#gWin)"/>
  <g class="day-only"><path d="M40 132 Q90 112 140 124 Q220 108 360 126 L360 160 L40 160 Z" fill="#b9c8ad" opacity=".75"/>
    <path d="M250 112 Q300 98 360 110 L360 160 L250 160Z" fill="#a7b99b" opacity=".6"/></g>
  <g class="dusk-only"><circle cx="96" cy="116" r="22" fill="url(#gSun)"/><circle cx="96" cy="116" r="9" fill="#ec6a3e"/>
    <path d="M40 132 Q90 116 140 126 L140 160 L40 160 Z M250 118 Q300 106 360 116 L360 160 L250 160Z" fill="#7d6a8a" opacity=".6"/></g>
  <g class="night-only"><circle cx="330" cy="88" r="16" fill="#f3ecd2" opacity=".14"/><circle cx="330" cy="88" r="7" fill="#f3ecd2"/>
    <circle cx="70" cy="84" r=".9" fill="#fff"/><circle cx="98" cy="76" r=".7" fill="#fff"/><circle cx="300" cy="104" r=".8" fill="#fff"/><circle cx="76" cy="112" r=".6" fill="#fff"/></g>
  <g fill="#3f4a33" opacity=".85"><path d="M48 76 q14 -6 30 2 q-8 4 -18 3 q-6 4 -12 -5z"/><path d="M60 70 q10 -8 22 -2" stroke="#3f4a33" stroke-width="1.6" fill="none"/></g>
</g>`; }

function sceneMarkup() { return `
<g id="world">
  <!-- ===== background: wall, woodwork, alcove ===== -->
  <rect x="0" y="0" width="400" height="190" fill="url(#gWall)"/>
  <rect x="0" y="0" width="400" height="12" fill="var(--wood-d)"/>
  <rect x="0" y="12" width="400" height="2" fill="#000" opacity=".12"/>
  <rect x="0" y="29" width="400" height="7" fill="var(--wood)"/><rect x="0" y="29" width="400" height="1.2" fill="#fff" opacity=".12"/>
  <rect x="0" y="36" width="400" height="3" fill="#2a1d14" opacity=".1"/>

  <!-- tokonoma: a recessed alcove gives the room a back plane -->
  <rect x="150" y="36" width="100" height="150" fill="var(--wood-d)" opacity=".25"/>
  <rect x="156" y="42" width="88" height="134" fill="url(#gAlcove)"/>
  <rect x="156" y="42" width="88" height="8" fill="var(--wood)"/>
  <rect x="156" y="50" width="88" height="6" fill="#2a1d14" opacity=".12"/>
  <rect x="148" y="36" width="8" height="152" fill="var(--post)"/><path d="M150 40 V186" stroke="#fff" stroke-width=".8" opacity=".18"/>
  <path d="M152 60 q1 6 0 12 M152.6 110 q-1 5 0 9" stroke="var(--wood-d)" stroke-width=".7" opacity=".5" fill="none"/>
  <rect x="244" y="36" width="5" height="152" fill="var(--wood)"/>
  <!-- the scroll -->
  <rect x="176" y="54" width="48" height="3.5" rx="1.7" fill="var(--wood-d)"/>
  <rect x="181" y="57" width="38" height="90" fill="var(--mount)"/>
  <rect x="185.5" y="64" width="29" height="76" fill="var(--scroll-paper)"/>
  <text x="200" y="100" font-size="21" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">靜</text>
  <rect x="204" y="121" width="5.5" height="5.5" rx="1" fill="var(--shu)" opacity=".85"/>
  <rect x="178" y="146" width="44" height="4.5" rx="2.2" fill="var(--wood-d)"/>
  <rect x="181" y="150" width="38" height="5" fill="#2a1d14" opacity=".08" class="blurred" filter="url(#fBlur2)"/>
  <!-- toko board, incense on it (it still doubles as the timer) -->
  <rect x="156" y="172" width="88" height="10" fill="var(--wood-l)"/><rect x="156" y="172" width="88" height="1.4" fill="#fff" opacity=".2"/>
  <rect x="156" y="182" width="88" height="4" fill="var(--wood-d)"/>
  <g id="incenseG" transform="translate(231 172)">
    <ellipse cx="0" cy="0" rx="9" ry="2" fill="#2a1d14" opacity=".25"/>
    <path d="M-8 -7 h16 q-1 7 -8 7 q-7 0 -8 -7z" fill="var(--wood)" stroke="var(--line)" stroke-width=".8"/>
    <rect id="incStick" x="-.9" y="-44" width="1.8" height="37" fill="var(--kesa)"/>
    <circle id="ember" cx="0" cy="-44" r="1.5" fill="#ff7a45"/>
    <path id="smoke" d="M0 -48 q-4 -7 0 -14 q4 -7 0 -14" fill="none" stroke="var(--ink-3)" stroke-width="1" opacity=".45" stroke-linecap="round"/>
  </g>

  <!-- pillars -->
  <rect x="8" y="0" width="10" height="190" fill="var(--wood)"/><rect x="8" y="0" width="2" height="190" fill="#fff" opacity=".08"/>
  <rect x="382" y="0" width="10" height="190" fill="var(--wood)"/><rect x="390" y="0" width="2" height="190" fill="#000" opacity=".12"/>

  <!-- 悟之窗 (round) -->
  <circle cx="84" cy="100" r="31" fill="var(--wood-d)" opacity=".2" transform="translate(1.5 2)"/>
  ${windowView('cRwin')}
  <g clip-path="url(#cRwin)" stroke="var(--wood)" stroke-width="1.5" opacity=".9"><path d="M69 66 V134 M84 66 V134 M99 66 V134 M50 85 H118 M50 100 H118 M50 115 H118"/></g>
  <circle cx="84" cy="100" r="30" fill="none" stroke="var(--wood)" stroke-width="5"/>
  <circle cx="84" cy="100" r="27.5" fill="none" stroke="#000" stroke-width="1" opacity=".12"/>
  <!-- 迷之窗 (square) -->
  <rect x="289.5" y="72" width="60" height="60" fill="var(--wood-d)" opacity=".2"/>
  ${windowView('cSwin')}
  <g stroke="var(--wood)" stroke-width="1.5" opacity=".9"><path d="M303 70 V130 M318 70 V130 M333 70 V130 M288 85 H348 M288 100 H348 M288 115 H348"/></g>
  <rect x="288" y="70" width="60" height="60" fill="none" stroke="var(--wood)" stroke-width="5"/>

  <!-- 堂規 board, 坐禪帳 ledger -->
  <path d="M36 42 L27 56 M36 42 L45 56" stroke="var(--line)" stroke-width=".7" fill="none"/>
  <rect x="25" y="56" width="22" height="56" rx="1.5" fill="#c69b62" stroke="var(--wood)" stroke-width="1.2"/>
  <rect x="27" y="112" width="22" height="2" fill="#2a1d14" opacity=".12"/>
  <text x="36" y="79" font-size="11.5" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">堂</text>
  <text x="36" y="96" font-size="11.5" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">規</text>
  <path d="M369 42 L360 56 M369 42 L378 56" stroke="var(--line)" stroke-width=".7" fill="none"/>
  <rect x="358" y="56" width="22" height="60" rx="1" fill="var(--scroll-paper)" stroke="var(--line)" stroke-width=".8"/>
  <rect x="358" y="56" width="22" height="5" fill="var(--wood-l)"/>
  <text x="369" y="76" font-size="9" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">坐</text>
  <text x="369" y="89" font-size="9" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">禪</text>
  <text x="369" y="102" font-size="9" text-anchor="middle" fill="#2a2622" style="font-family:var(--f-story)">帳</text>

  <!-- ===== midground: floor in perspective ===== -->
  <rect x="0" y="186" width="400" height="114" fill="url(#gFloor)"/>
  <rect x="0" y="186" width="400" height="114" fill="url(#pWeave)" opacity=".7"/>
  <path d="M0 216 H400" stroke="var(--heri)" stroke-width="2.2"/>
  <path d="M0 262 H400" stroke="var(--heri)" stroke-width="3"/>
  <path d="M130 188 L115.6 216 M274.7 216 L294.3 262 M63.2 262 L39.7 300" stroke="var(--heri)" stroke-width="2.2"/>
  <rect x="0" y="182" width="400" height="7" fill="var(--wood-d)"/>
  <rect x="0" y="189" width="400" height="18" fill="url(#gAO)"/>

  <!-- ===== light: window shafts and their patches (day/dusk/night differ) ===== -->
  <g id="lights" style="mix-blend-mode:screen" opacity="var(--shaft-o)">
    <g class="day-only">
      <path d="M58 80 L110 80 L196 252 L120 258 Z" fill="url(#gShaft)" opacity=".28" class="blurred" filter="url(#fBlur6)"/>
      <ellipse cx="158" cy="248" rx="46" ry="11" fill="url(#gPatch)" opacity=".7" class="blurred" filter="url(#fBlur2)"/>
      <ellipse cx="350" cy="240" rx="32" ry="8" fill="url(#gPatch)" opacity=".4" class="blurred" filter="url(#fBlur2)"/>
    </g>
    <g class="dusk-only">
      <path d="M56 92 L112 84 L270 246 L180 262 Z" fill="url(#gShaft)" opacity=".45" class="blurred" filter="url(#fBlur6)"/>
      <ellipse cx="226" cy="254" rx="70" ry="13" fill="url(#gPatch)" opacity=".75" class="blurred" filter="url(#fBlur2)"/>
      <ellipse cx="226" cy="140" rx="30" ry="40" fill="url(#gPatch)" opacity=".18" class="blurred" filter="url(#fBlur6)"/>
    </g>
    <g class="night-only">
      <path d="M290 76 L348 76 L300 254 L214 254 Z" fill="url(#gShaft)" opacity=".3" class="blurred" filter="url(#fBlur6)"/>
      <ellipse cx="258" cy="252" rx="48" ry="11" fill="url(#gPatch)" opacity=".55" class="blurred" filter="url(#fBlur2)"/>
    </g>
  </g>
  <g id="dust" data-heavy class="day-only"></g>

  <!-- andon: stands under the square window; lit only at night -->
  <g transform="translate(334 214)">
    <g class="night-only"><circle cx="0" cy="-16" r="80" fill="url(#gAndon)"/><ellipse cx="0" cy="2" rx="40" ry="8" fill="#ffb874" opacity=".22" class="blurred" filter="url(#fBlur2)"/></g>
    <ellipse class="cshadow blurred" cx="0" cy="1" rx="14" ry="2.6" filter="url(#fBlur2)"/>
    <rect x="-8" y="-8" width="2" height="9" fill="var(--wood)"/><rect x="6" y="-8" width="2" height="9" fill="var(--wood)"/>
    <rect x="-10" y="-34" width="20" height="26" fill="#efe6cf" stroke="var(--wood)" stroke-width=".8"/>
    <rect class="night-only" x="-10" y="-34" width="20" height="26" fill="#ffe3ac"/>
    <path d="M0 -34 V-8 M-10 -25 H10 M-10 -16.5 H10" stroke="var(--wood)" stroke-width=".55" opacity=".55"/>
    <rect x="-12" y="-37" width="24" height="3" rx="1" fill="var(--wood)"/><rect x="-12" y="-9" width="24" height="3" rx="1" fill="var(--wood)"/>
  </g>
  <!-- the keisaku rests against the right pillar until the monk takes it -->
  <g id="rack" transform="translate(377 214) rotate(5)">
    <rect x="-1.4" y="-62" width="2.8" height="62" rx="1.2" fill="#c69b62" stroke="var(--line)" stroke-width=".8"/>
    <rect x="-2.8" y="-82" width="5.6" height="24" rx="2" fill="#c69b62" stroke="var(--line)" stroke-width=".8"/>
  </g>

  <!-- ===== characters ===== -->
  <g id="monkSlot"></g>
  <g id="seat" transform="translate(206 262)">
    <ellipse class="cshadow blurred" cx="0" cy="8" rx="62" ry="6" filter="url(#fBlur2)"/>
    <path d="M-54 0 L54 0 L62 12 L-62 12 Z" fill="var(--mat)" stroke="var(--line)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-54 0 L54 0" stroke="#fff" stroke-width=".8" opacity=".12"/>
    <path d="M-38 -6 V0 A38 9 0 0 0 38 0 V-6" fill="var(--zafu-lo)" stroke="var(--line)" stroke-width="1.3"/>
    <ellipse cx="0" cy="-6" rx="38" ry="9" fill="var(--zafu)" stroke="var(--line)" stroke-width="1.3"/>
    <path d="M-30 -9 Q0 -15 30 -9" stroke="#fff" stroke-width="1.2" opacity=".14" fill="none"/>
    <path d="M0 -15 V3" stroke="var(--zafu-lo)" stroke-width=".9" opacity=".6"/>
  </g>
  <g id="mochiSlot"></g>
  <path id="seatLip" d="M174 256.5 A38 9 0 0 0 238 256.5 A38 9 0 0 0 244 254 L244 256 A38 9 0 0 1 168 256 L168 254 A38 9 0 0 0 174 256.5 Z" fill="var(--zafu)" opacity="0"/>
  <g id="fxSlot"></g>

  <!-- ===== foreground: a sill, the room's lip, and a soft vignette ===== -->
  <rect x="0" y="291" width="400" height="9" fill="var(--wood-d)"/><rect x="0" y="291" width="400" height="1.2" fill="#fff" opacity=".14"/>
  <rect x="0" y="0" width="400" height="300" fill="var(--amb)" opacity=".16" style="mix-blend-mode:multiply" pointer-events="none"/>
  <rect x="0" y="0" width="400" height="300" fill="url(#gVig)" pointer-events="none"/>
</g>`; }


function mochiMarkup(id) { return `
<g id="${id}">
  <clipPath id="${id}-clip"><path d="${MOCHI_BODY}"/></clipPath>
  <ellipse class="cshadow blurred" id="${id}-sh" cx="0" cy="1" rx="32" ry="4.6" filter="url(#fBlur2)"/>
  <g id="${id}-lean"><g id="${id}-sq">
    <g id="${id}-feet"><ellipse cx="-13" cy="-1.5" rx="8.5" ry="4.2" fill="var(--mochi)" class="ln" stroke-width="1.8"/><ellipse cx="13" cy="-1.5" rx="8.5" ry="4.2" fill="var(--mochi)" class="ln" stroke-width="1.8"/></g>
    <path d="${MOCHI_BODY}" fill="url(#gMochi)"/>
    <g clip-path="url(#${id}-clip)">
      <ellipse cx="4" cy="6" rx="42" ry="15" fill="var(--mochi-lo)" opacity=".55"/>
      <path d="M-31 -34 C-27 -50 -15 -63 -2 -65.5" stroke="var(--shaft)" stroke-width="3" fill="none" opacity="var(--rim-l)" stroke-linecap="round"/>
      <path d="M31 -34 C27 -50 15 -63 2 -65.5" stroke="var(--shaft)" stroke-width="3" fill="none" opacity="var(--rim-r)" stroke-linecap="round"/>
      <g id="${id}-garment"></g>
    </g>
    <path d="${MOCHI_BODY}" fill="none" class="ln" stroke-width="2.2"/>
    <ellipse cx="-14" cy="-52" rx="6.5" ry="3.4" fill="#fff" opacity=".85" transform="rotate(-32 -14 -52)"/>
    <g id="${id}-face"></g>
    <g id="${id}-hands"><ellipse id="${id}-hl" fill="var(--sleeve, var(--mochi))" class="ln" stroke-width="1.8"/><ellipse id="${id}-hr" fill="var(--sleeve, var(--mochi))" class="ln" stroke-width="1.8"/></g>
    <g id="${id}-fx"></g>
  </g></g>
  <g id="${id}-hat"></g>
  <g id="${id}-tail"></g>
</g>`; }

/* faces: eyes at y −30, x ±11; mouth at y −21; fx at the upper right of the head.
   Each entry is the drawing; motion is applied by the rig (blink/gaze/bob). */
const FACE = {
  peek:     { eyes: 'dot',   mouth: '<path d="M-2.6 -20.5 h5.2" class="ln" stroke-width="2" fill="none"/>', blink: true },
  calm:     { eyes: '<path d="M-15 -30 q4 3.4 8 0 M7 -30 q4 3.4 8 0" class="ln" stroke-width="2" fill="none"/>', mouth: '<path d="M-2.4 -21 q2.4 1.6 4.8 0" class="ln" stroke-width="1.8" fill="none"/>' },
  happy:    { eyes: '<path d="M-15 -28.5 q4 -5 8 0 M7 -28.5 q4 -5 8 0" class="ln" stroke-width="2.1" fill="none"/>', mouth: '<path d="M-5 -22.5 q5 6 10 0 z" fill="#b5534b" class="ln" stroke-width="1.6"/>' },
  ouch:     { eyes: '<path d="M-16 -34 l7 3.6 l-7 3.6 M16 -34 l-7 3.6 l7 3.6" class="ln" stroke-width="2.1" fill="none"/>', mouth: '<path d="M-5.5 -20 q2.75 -2.6 5.5 0 q2.75 2.6 5.5 0" class="ln" stroke-width="1.8" fill="none"/>',
              fx: '<path class="fx-pop fx-drip" d="M27 -50 q3.4 4.6 0 7 q-3.4 -2.4 0 -7z" fill="#9ccbe8" stroke="var(--line)" stroke-width="1"/>' },
  focus:    { eyes: '<path d="M-15 -30 h8 M7 -30 h8" class="ln" stroke-width="2.1"/><path d="M-15.5 -37 l7.5 2 M15.5 -37 l-7.5 2" class="ln" stroke-width="1.8"/>', mouth: '<path d="M-2 -21 h4" class="ln" stroke-width="1.8"/>' },
  sleepy:   { eyes: '<path d="M-15 -30.5 q4 2 8 .6 M7 -29.9 q4 1.4 8 -.6" class="ln" stroke-width="2" fill="none"/>', mouth: '<ellipse cx="0" cy="-20.5" rx="2.3" ry="3" fill="#5a3430" class="ln" stroke-width="1.4"/>',
              fx: '<path class="fx-pop fx-float" d="M24 -58 h4.4 l-4.4 4.4 h4.4" class="ln" stroke-width="1.3" fill="none"/>' },
  content:  { eyes: '<path d="M-15 -28.5 q4 -5 8 0 M7 -28.5 q4 -5 8 0" class="ln" stroke-width="2.1" fill="none"/>', mouth: '<path d="M-3.4 -22 q3.4 2.6 6.8 0" class="ln" stroke-width="1.8" fill="none"/>',
              fx: '<path class="fx-pop fx-float" d="M26 -58 c-1.5 -2.6 -5 -.6 -2.8 1.8 l2.8 2.8 l2.8 -2.8 c2.2 -2.4 -1.3 -4.4 -2.8 -1.8z" fill="#e8798a" stroke="var(--line)" stroke-width=".8"/>' },
  proud:    { eyes: '<path d="M-15 -28.5 l4 -3.8 l4 3.8 M7 -28.5 l4 -3.8 l4 3.8" class="ln" stroke-width="2.1" fill="none"/>', mouth: '<path d="M-3.8 -22.4 q4 3.2 8 -1" class="ln" stroke-width="1.8" fill="none"/>',
              fx: '<path class="fx-pop fx-twinkle" d="M22 -39 l1.1 2.5 l2.5 1.1 l-2.5 1.1 l-1.1 2.5 l-1.1 -2.5 l-2.5 -1.1 l2.5 -1.1z" fill="var(--kin)" stroke="#8a6420" stroke-width=".5"/>' },
  surprised:{ eyes: '<circle cx="-11" cy="-30" r="4" fill="#fff" class="ln" stroke-width="1.6"/><circle cx="11" cy="-30" r="4" fill="#fff" class="ln" stroke-width="1.6"/><circle cx="-11" cy="-29.6" r="1.7" fill="var(--line)"/><circle cx="11" cy="-29.6" r="1.7" fill="var(--line)"/>',
              mouth: '<ellipse cx="0" cy="-20" rx="2.2" ry="2.8" fill="none" class="ln" stroke-width="1.6"/>', fx: '<path class="fx-pop fx-pulse" d="M26 -60 l2 -5 M30.6 -56.6 l4.4 -3.4 M33.4 -52.4 l5 -1.6" class="ln" stroke-width="1.6" fill="none"/>' },
  teary:    { eyes: '<path d="M-15 -30 h8 M7 -30 h8" class="ln" stroke-width="2.1"/><path d="M-15 -36 l6.6 -2.2 M15 -36 l-6.6 -2.2" class="ln" stroke-width="1.5"/><path class="fx-pop fx-drip" d="M-11 -29 q-2 3.8 0 5 q2 -1.2 0 -5z M11 -29 q-2 3.8 0 5 q2 -1.2 0 -5z" fill="#9ccbe8" stroke="var(--line)" stroke-width=".9"/>',
              mouth: '<path d="M-4.4 -20.5 q1.1 -1.7 2.2 0 q1.1 1.7 2.2 0 q1.1 -1.7 2.2 0 q1.1 1.7 2.2 0" class="ln" stroke-width="1.5" fill="none"/>' },
  shy:      { eyes: '<circle cx="-12.5" cy="-29" r="2.3" fill="var(--line)"/><circle cx="9.5" cy="-29" r="2.3" fill="var(--line)"/>', mouth: '<path d="M-2.4 -20.6 q1.2 -1.2 2.4 0 q1.2 1.2 2.4 0" class="ln" stroke-width="1.5" fill="none"/>',
              extra: '<path d="M-24 -21 l2 -3 M-20.6 -21 l2 -3 M-17.2 -21 l2 -3 M15.2 -21 l2 -3 M18.6 -21 l2 -3 M22 -21 l2 -3" stroke="#d9645f" stroke-width="1.1" stroke-linecap="round"/>' },
  daze:     { eyes: '<circle cx="-11" cy="-30" r="2.8" fill="none" class="ln" stroke-width="1.6"/><circle cx="11" cy="-30" r="2.8" fill="none" class="ln" stroke-width="1.6"/>', mouth: '<path d="M-2.6 -20.5 h5.2" class="ln" stroke-width="1.6"/>',
              fx: '<g class="fx-pop fx-seq"><circle cx="24" cy="-56" r="2" fill="var(--line)"/><circle cx="30" cy="-58" r="2" fill="var(--line)"/><circle cx="36" cy="-60" r="2" fill="var(--line)"/></g>' },
};
const FACE_ZH = { peek: '張望', calm: '平靜', happy: '開心', ouch: '吃痛', focus: '專注', sleepy: '想睡', content: '滿足', proud: '得意', surprised: '驚訝', teary: '委屈', shy: '害羞', daze: '發呆' };

const HANDS = {   // [cx, cy, rx, ry, rot] for left and right
  side:   [[-33, -19, 5.6, 7.6, 28], [33, -19, 5.6, 7.6, -28]],
  lap:    [[-2.6, -5, 7.6, 4.2, -4], [2.6, -6.2, 7.6, 4.2, 4]],
  gassho: [[-3.2, -14, 4.2, 7.4, 16], [3.2, -14, 4.2, 7.4, -16]],
  rub:    [[-21, -60, 5.6, 7.2, -40], [33, -19, 5.6, 7.6, -28]],
  cheer:  [[-37, -44, 5.6, 7.6, 62], [37, -44, 5.6, 7.6, -62]],
  tuck:   [[-30, -13, 5.4, 6.6, 50], [30, -13, 5.4, 6.6, -50]],
};


function monkMarkup(id) { return `
<g id="${id}">
  <ellipse class="cshadow blurred" cx="1" cy="1" rx="24" ry="4.4" filter="url(#fBlur2)"/>
  <g id="${id}-flip"><g id="${id}-lean"><g id="${id}-bob">
    <ellipse id="${id}-f1" cx="-7" cy="-1.5" rx="7" ry="3.2" fill="#f2ede2" class="ln" stroke-width="1.4"/>
    <ellipse id="${id}-f2" cx="9" cy="-1.5" rx="7" ry="3.2" fill="#f2ede2" class="ln" stroke-width="1.4"/>
    <path d="M-15 -45 Q-22 -42 -23 -32 L-24 -22 Q-20 -18 -14.5 -20 Z" fill="var(--robe-lo)" class="ln" stroke-width="1.6"/>
    <path d="M-21 0 C-23 -16 -21 -34 -16 -44 Q-10 -53 1 -53 Q12 -53 17 -44 C22 -34 24 -16 22 0 C9 3.4 -8 3.4 -21 0 Z" fill="url(#gRobe)" class="ln" stroke-width="2.2"/>
    <path d="M-20 -6 C-8 -3 8 -3 21.4 -6" stroke="#000" stroke-width="1" opacity=".18" fill="none"/>
    <path d="M-5 -30 Q-4 -16 -6 -3 M9 -24 Q10.5 -12 10 -2.5" class="ln" stroke-width="1.1" opacity=".3" fill="none"/>
    <path d="M-7 -52 L4 -37.5 L11 -52" fill="#f4efe4" class="ln" stroke-width="1.3"/>
    <path d="M-8.4 -51.6 L3.4 -36.6 M12.6 -51 L8.4 -38.4" stroke="var(--robe-lo)" stroke-width="2.8" stroke-linecap="round"/>
    <g><path d="M-4 -51 L-6 -40 M10.5 -50.5 L12 -40" stroke="var(--kesa)" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="-8" y="-40.5" width="22" height="14" rx="1.8" fill="var(--kesa)" class="ln" stroke-width="1.3"/>
      <rect x="-5.5" y="-38" width="17" height="9" rx=".8" fill="none" class="ln" stroke-width=".8" opacity=".35"/>
      <circle cx="-5.4" cy="-46" r="1.6" fill="none" stroke="#e9dcc0" stroke-width="1"/></g>
    <g id="${id}-head">
      <circle cx="-15" cy="-70" r="4.2" fill="var(--skin)" class="ln" stroke-width="1.5"/>
      <circle cx="1.5" cy="-71" r="19" fill="url(#gHead)" class="ln" stroke-width="2.2"/>
      <path d="M-10 -84 q5 -4.6 11 -4.4" stroke="#fff" stroke-width="2.4" opacity=".45" fill="none" stroke-linecap="round"/>
      <ellipse cx="2.4" cy="-63.5" rx="3.6" ry="2.1" fill="var(--blush)" opacity=".6"/><ellipse cx="17.5" cy="-63.5" rx="1.8" ry="1.6" fill="var(--blush)" opacity=".6"/>
      <g id="${id}-eyes"></g>
      <g id="${id}-mouth"></g>
    </g>
    <g id="${id}-arm">
      <g id="${id}-stick"><rect x="15.8" y="-86" width="2.8" height="62" rx="1.2" fill="#c69b62" class="ln" stroke-width=".9"/><rect x="14.4" y="-106" width="5.6" height="24" rx="2" fill="#c69b62" class="ln" stroke-width=".9"/></g>
      <g id="${id}-cup" opacity="0"><path d="M12 -34 h10 l-1.3 7 h-7.4 z" fill="#efe6cf" class="ln" stroke-width="1"/></g>
      <path d="M6 -49 Q16 -51 19.5 -42 L22.4 -27 Q22.6 -20.4 16.4 -20.4 Q10.4 -20.4 9.4 -26.6 Z" fill="var(--robe)" class="ln" stroke-width="1.8"/>
      <path d="M11.5 -24.5 Q16 -23 21.5 -25" class="ln" stroke-width=".9" opacity=".3" fill="none"/>
      <circle cx="17.2" cy="-29" r="4.6" fill="var(--skin)" class="ln" stroke-width="1.5"/>
    </g>
  </g></g></g>
</g>`; }
const MONK_EYES = {
  open:  '<ellipse cx="6.5" cy="-71" rx="1.9" ry="2.4" fill="var(--line)"/><ellipse cx="14.5" cy="-71" rx="1.9" ry="2.4" fill="var(--line)"/>',
  smile: '<path d="M4 -70.5 q2.5 -3 5 0 M12 -70.5 q2.5 -3 5 0" class="ln" stroke-width="1.7" fill="none"/>',
  shut:  '<path d="M4 -71 q2.5 2 5 0 M12 -71 q2.5 2 5 0" class="ln" stroke-width="1.7" fill="none"/>',
  stern: '<ellipse cx="6.5" cy="-70.5" rx="1.9" ry="2" fill="var(--line)"/><ellipse cx="14.5" cy="-70.5" rx="1.9" ry="2" fill="var(--line)"/><path d="M3 -77 l6 2 M18 -77 l-5.6 2" class="ln" stroke-width="1.7"/>',
  wide:  '<circle cx="6.5" cy="-71" r="2.6" fill="var(--line)"/><circle cx="14.5" cy="-71" r="2.6" fill="var(--line)"/>',
};
const MONK_MOUTH = {
  smile: '<path d="M8 -63.5 q2.6 2 5.2 0" class="ln" stroke-width="1.5" fill="none"/>',
  flat:  '<path d="M8 -63.2 h5" class="ln" stroke-width="1.6"/>',
  laugh: '<path d="M7.4 -64.4 q3.2 4.6 6.4 0 z" fill="#b5534b" class="ln" stroke-width="1.3"/>',
  o:     '<ellipse cx="10.5" cy="-63" rx="1.8" ry="2.2" fill="none" class="ln" stroke-width="1.4"/>',
  sip:   '<path d="M9 -63.4 q1.6 -.8 3.2 0" class="ln" stroke-width="1.4" fill="none"/>',
};
