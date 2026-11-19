# Round 6-2: before/after sheets from the state tool's screenshots (before = main @ 6-1, after = this branch).
#   python3 design/round6/6-2/make-sheets.py
# Each sheet: the top row is before, the bottom row after; each column is one profile and state.
import glob, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'compare'); os.makedirs(OUT, exist_ok=True)
SHEETS = {
    '01_first_visit_390': [('390x844', s) for s in ['first-welcome', 'first-tour', 'first-checkin']] + [('320x640', 'first-welcome'), ('320x640', 'first-tour')],
    '02_sitting_390': [('390x844', s) for s in ['checkin', 'focus-note', 'focus-quiet', 'focus-after-strikes', 'focus-quit-confirm', 'leave', 'break']],
    '03_small_screens': [(p, s) for p in ['320x640', '360x780'] for s in ['focus-after-strikes', 'focus-quit-confirm', 'leave']] + [('412x915', 'focus-after-strikes')],
    '04_text130': [(p, s) for p in ['390x844-text130', '320x640-text130'] for s in ['focus-note', 'focus-after-strikes', 'focus-quit-confirm', 'leave']],
    '05_languages': [(p, s) for p in ['390x844-en', '320x640-en', '390x844-ja'] for s in ['focus-after-strikes', 'focus-quit-confirm']],
    '06_dark_dusk_reduced': [(p, s) for p in ['390x844-dark', '390x844-dusk', '390x844-reduced-motion'] for s in ['focus-note', 'focus-quit-confirm']],
}
H = 760
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except OSError: font = ImageFont.load_default()

def find(side, prof, state):
    m = glob.glob(os.path.join(HERE, side, prof, f'*_{state}.jpg'))
    return Image.open(m[0]).convert('RGB') if m else None

for name, cols in SHEETS.items():
    cells = []
    for prof, state in cols:
        pair = [find(side, prof, state) for side in ('before', 'after')]
        w = max(int(i.width * H / i.height) for i in pair if i) if any(pair) else 300
        cells.append((prof, state, pair, w))
    W = sum(c[3] for c in cells) + 12 * (len(cells) + 1) + 90
    sheet = Image.new('RGB', (W, 2 * H + 3 * 12 + 40), 'white'); d = ImageDraw.Draw(sheet)
    d.text((10, 40 + H // 2), 'before', fill='black', font=font); d.text((10, 52 + H + H // 2), 'after', fill='black', font=font)
    x = 90
    for prof, state, pair, w in cells:
        d.text((x, 10), f'{prof} / {state}', fill='black', font=font)
        for r, im in enumerate(pair):
            if im: sheet.paste(im.resize((int(im.width * H / im.height), H)), (x, 40 + r * (H + 12)))
            else: d.text((x + 10, 40 + r * (H + 12) + H // 2), '(not in this version)', fill='gray', font=font)
        x += w + 12
    sheet.save(os.path.join(OUT, name + '.jpg'), quality=82)
    print(name, sheet.size)
