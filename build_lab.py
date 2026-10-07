# Builds soundlab.html (the background-sound tuning page) from the sound engine in src/app.js.
import os
ROOT = os.path.dirname(os.path.abspath(__file__))
src=open(os.path.join(ROOT, 'src', 'app.js'), encoding='utf-8').read()
engine=src[src.index('/*SND-START*/'):src.index('/*SND-END*/')]
knobs = [
 ('雨聲', [('rainBed','遠處的雨聲底(風聲感)',0,.15,.005,True), ('dropGain','雨滴音量',.5,5,.1,False), ('dropGapMin','雨滴最短間隔(毫秒,越小越密)',2,60,1,False), ('dropGapMax','雨滴最長間隔(毫秒)',20,300,5,False)]),
 ('海浪', [('waveCrash','衝上岸那一下的大小',0,2,.05,False), ('waveBackMin','退潮最短(秒)',3,14,.5,False), ('waveBackMax','退潮最長(秒)',4,18,.5,False)]),
 ('森林', [('leafVol','風吹過樹葉',0,.1,.002,False), ('frogVol','蛙鳴',0,.12,.002,False)]),
 ('風鈴', [('chimeRing','每個音的長度',.15,1.5,.05,False), ('chimeVerb','殘響',0,.8,.02,False), ('gustChance','起風的機率',0,.8,.02,False), ('gustKnocksMin','風起時最少撞幾次',1,10,1,False), ('gustKnocksMax','風最大時最多撞幾次',2,20,1,False), ('chimeOctave','風鈴高幾個八度(0 / 1 / 2)',0,2,1,False)]),
]
rows=''
for group, ks in knobs:
    rows+=f'<section class="grp"><h2>{group}</h2>'
    for key,label,lo,hi,step,restart in ks:
        rows+=f'<label class="knob"><span class="lbl">{label}</span><input type="range" data-k="{key}" data-restart="{int(restart)}" min="{lo}" max="{hi}" step="{step}"><output></output></label>'
    rows+='</section>'
html=f'''<title>聲音試聽台</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Fredoka:wght@500;600&display=swap">
<style>
/* Layout: a single tuning column — play buttons on top, one card of sliders per sound, copy-out at the bottom. */
:root {{ --bg:#e9ecdf; --surface:#f8f9f1; --line:#d3d6c2; --ink:#2a2622; --muted:#696557; --accent:#33456b; --on-accent:#fff;
  --f-display:"LXGW WenKai TC","Kaiti TC",serif; --f-body:"LXGW WenKai TC","PingFang TC","Noto Sans TC",sans-serif; --f-num:"Fredoka",ui-rounded,system-ui,sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#141816; --surface:#1d2320; --line:#323a36; --ink:#ebe6d8; --muted:#a39e8f; --accent:#a8bbe6; --on-accent:#141816; color-scheme:dark; }} }}
:root[data-theme="dark"] {{ --bg:#141816; --surface:#1d2320; --line:#323a36; --ink:#ebe6d8; --muted:#a39e8f; --accent:#a8bbe6; --on-accent:#141816; color-scheme:dark; }}
* {{ box-sizing:border-box; }}
body {{ background:var(--bg); color:var(--ink); font-family:var(--f-body); margin:0; padding-inline:16px; padding-block:18px 32px; line-height:1.5; }}
.wrap {{ max-width:560px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }}
h1 {{ font-family:var(--f-display); margin:0; font-size:1.7rem; letter-spacing:.06em; }}
.lead {{ margin:0; color:var(--muted); font-size:.92rem; }}
.play {{ display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }}
.play button, .btn {{ font:inherit; cursor:pointer; border:1.5px solid var(--accent); color:var(--accent); background:transparent; border-radius:12px; padding:8px 4px; font-weight:700; }}
.play button[aria-pressed="true"], .btn.primary {{ background:var(--accent); color:var(--on-accent); }}
.grp {{ background:var(--surface); border:1.5px solid var(--line); border-radius:16px; padding:12px 14px; display:flex; flex-direction:column; gap:8px; }}
.grp h2 {{ margin:0; font-family:var(--f-display); font-size:1.05rem; }}
.knob {{ display:grid; grid-template-columns:1fr 3.2rem; grid-template-rows:auto auto; gap:2px 8px; align-items:center; }}
.knob .lbl {{ grid-column:1 / -1; font-size:.88rem; }}
.knob input {{ width:100%; min-width:0; accent-color:var(--accent); }}
.knob output {{ font-family:var(--f-num); font-variant-numeric:tabular-nums; text-align:right; font-size:.9rem; }}
.row {{ display:flex; gap:8px; flex-wrap:wrap; }}
textarea {{ width:100%; font:.8rem ui-monospace,monospace; border-radius:10px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink); padding:8px; }}
.status {{ color:var(--muted); font-size:.85rem; min-height:1.3em; margin:0; }}
</style>
<div class="wrap">
  <h1>聲音試聽台</h1>
  <p class="lead">跟 App 裡完全相同的聲音程式。點一種聲音開始播,拉滑桿會直接改變接下來的聲音(雨的底聲會重新開始)。調好後按「複製設定」貼回聊天就好。</p>
  <div class="play" id="play">
    <button type="button" data-kind="rain" aria-pressed="false">雨聲</button>
    <button type="button" data-kind="waves" aria-pressed="false">海浪</button>
    <button type="button" data-kind="forest" aria-pressed="false">森林</button>
    <button type="button" data-kind="chimes" aria-pressed="false">風鈴</button>
    <button type="button" id="musicBtn" aria-pressed="false">和音</button>
  </div>
  <div class="row"><button type="button" class="btn" id="beep">先測試有沒有聲音</button></div>
  <label class="knob"><span class="lbl">總音量</span><input type="range" id="ambVol" min="5" max="100" step="1" value="100"><output id="volOut">100</output></label>
  {rows}
  <div class="row"><button type="button" class="btn primary" id="copy">複製設定</button><button type="button" class="btn" id="reset">還原預設</button></div>
  <p class="status" id="status" aria-live="polite"></p>
  <textarea id="out" rows="5" readonly hidden></textarea>
  <input type="checkbox" id="ambMusic" hidden>
</div>
<script>
(() => {{
  const $ = s => document.querySelector(s);
  let ac = null;
  function audio() {{ if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }}
  let current = null;
  {engine}
  const DEFAULTS = JSON.parse(JSON.stringify(SND));
  const knobs = [...document.querySelectorAll('input[data-k]')];
  const fmt = v => (Math.round(v * 1000) / 1000).toString();
  function sync() {{ knobs.forEach(k => {{ k.value = SND[k.dataset.k]; k.nextElementSibling.textContent = fmt(SND[k.dataset.k]); }}); }}
  sync();
  let restartTimer = 0;
  knobs.forEach(k => k.addEventListener('input', () => {{
    SND[k.dataset.k] = +k.value; k.nextElementSibling.textContent = fmt(+k.value);
    if (k.dataset.restart === '1' && current) {{ clearTimeout(restartTimer); restartTimer = setTimeout(() => startAmbient(current), 250); }}
  }}));
  document.querySelectorAll('#play button[data-kind]').forEach(b => b.addEventListener('click', () => {{
    const kind = b.dataset.kind;
    document.querySelectorAll('#play button[data-kind]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    if (current === kind) {{ current = null; stopAmbient(.6); return; }}
    current = kind; b.setAttribute('aria-pressed', 'true'); startAmbient(kind);
  }}));
  $('#musicBtn').addEventListener('click', () => {{
    const on = $('#musicBtn').getAttribute('aria-pressed') !== 'true';
    $('#musicBtn').setAttribute('aria-pressed', String(on)); $('#ambMusic').checked = on;
    on ? startMusic() : stopMusic(1);
  }});
  $('#ambVol').addEventListener('input', () => {{
    $('#volOut').textContent = $('#ambVol').value;
    const t = audio().currentTime;
    if (Amb.out) Amb.out.gain.setTargetAtTime(ambientVolume(), t, .1);
    if (Mus.out) Mus.out.gain.setTargetAtTime(ambientVolume(), t, .1);
  }});
  $('#beep').addEventListener('click', () => {{
    const a = audio(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.frequency.value = 660; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .8);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + .85);
    $('#status').textContent = a.state === 'running' ? '應該聽到「叮」一聲。沒聽到的話,請把手機的媒體音量調大、關掉靜音模式。' : '這個環境不讓網頁播放聲音(' + a.state + ')。';
  }});
  $('#reset').addEventListener('click', () => {{ Object.assign(SND, DEFAULTS); sync(); if (current) startAmbient(current); $('#status').textContent = '已還原預設。'; }});
  $('#copy').addEventListener('click', () => {{
    const text = JSON.stringify({{ ...SND, volume: +$('#ambVol').value }});
    const show = () => {{ const o = $('#out'); o.hidden = false; o.value = text; o.select(); $('#status').textContent = '沒辦法自動複製,文字已選取好,請手動複製。'; }};
    try {{ navigator.clipboard.writeText(text).then(() => {{ $('#status').textContent = '已複製,貼到聊天給 Claude 就好。'; $('#out').hidden = false; $('#out').value = text; }}, show); }} catch (e) {{ show(); }}
  }});
}})();
</script>
'''
open(os.path.join(ROOT, 'soundlab.html'),'w').write('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="robots" content="noindex">\n</head>\n<body>\n' + html + '</body>\n</html>\n')
