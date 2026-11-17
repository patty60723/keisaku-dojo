# Round 6 audit tool: builds index.md and the contact sheets from data.json and shots/ (run after capture.mjs)
import json, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'data.json')))
try: FONT = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
except Exception: FONT = ImageFont.load_default()
NAMES = {'390x844': '390×844（完整流程，淺色、中文）', '320x640': '320×640', '360x780': '360×780', '412x915': '412×915', '844x390': '844×390 橫向',
         '390x844-text130': '390×844，網頁字體 130%', '390x844-dark': '390×844，深色', '390x844-dusk': '390×844，黃昏（強制套用 data-theme="dusk"）',
         '390x844-ja': '390×844，日本語', '390x844-en': '390×844，English', '390x844-reduced-motion': '390×844，減少動態效果'}
def sheet(prof, shots, cols, scale):
    ims = []
    for s in shots:
        im = Image.open(os.path.join(HERE, 'shots', prof, s['file'])).convert('RGB'); ims.append((im.resize((int(im.size[0] * scale), int(im.size[1] * scale))), s['file'][:-4]))
    W = max(i.size[0] for i, _ in ims); H = max(i.size[1] for i, _ in ims); rows = (len(ims) + cols - 1) // cols
    o = Image.new('RGB', (cols * (W + 10) + 10, rows * (H + 40) + 10), '#ffffff'); d = ImageDraw.Draw(o)
    for k, (im, lab) in enumerate(ims):
        x = 10 + (k % cols) * (W + 10); y = 10 + (k // cols) * (H + 40)
        d.text((x, y), lab, fill='#222', font=FONT); o.paste(im, (x, y + 30)); d.rectangle([x - 1, y + 29, x + im.size[0], y + 30 + im.size[1]], outline='#999')
    return o
os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
out = ['# Round 6 審查：截圖索引', '', f'截圖時間：{D["taken"][:16].replace("T", " ")} UTC。全部由 `capture.mjs` 操作正式版 `index.html` 截下（無頭 Chromium，Playwright；**不是真實手機**）。',
       '每個設定一個資料夾 `shots/<設定>/`，總覽圖在 `sheets/`。量測數據（可點範圍、字級、對比、是否水平捲動）在 `data.json`。', '']
total = 0
out += ['| 設定 | 張數 | 沒截到 | 頁面錯誤 | 總覽圖 |', '|---|---|---|---|---|']
for prof, P in D['profiles'].items():
    shots = P['shots']; total += len(shots)
    cols = 4 if prof == '844x390' else 8; per = cols * (6 if prof == '844x390' else 3); files = []
    for i in range(0, len(shots), per):
        name = f'{prof}_{i // per + 1}.jpg'; sheet(prof, shots[i:i + per], cols, .34 if prof != '844x390' else .3).save(os.path.join(HERE, 'sheets', name), quality=80); files.append(name)
    P['_sheets'] = files
    out.append(f'| {NAMES.get(prof, prof)} | {len(shots)} | {len(P["notCaptured"])} | {len(P["errors"])} | ' + ' '.join(f'[{k + 1}](sheets/{f})' for k, f in enumerate(files)) + ' |')
out += ['', f'共 {total} 張。', '']
for prof, P in D['profiles'].items():
    out += [f'## {NAMES.get(prof, prof)}', '', '| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |', '|---|---|---|---|---|---|---|']
    for s in P['shots']:
        m = s['m']
        out.append(f'| {s["file"][:2]} | [{s["id"]}](shots/{prof}/{s["file"]}) | {s["note"]} | {m.get("pageH", "")} / {m.get("vh", "")} | {len(m.get("smallTaps", []))} | {len(m.get("smallText", []))} | {len(m.get("lowContrast", []))} |')
    out.append('')
out += ['## 沒有截到的狀態（NOT TESTED）', '',
        '| 狀態 | 原因 |', '|---|---|',
        '| 真的平衡儀偵測（拿起手機、每 20 秒、放回去的提示） | 無頭瀏覽器沒有感測器；所以每張坐禪截圖都出現「只能偵測是否切出畫面」的紅字。實機有感測器時這行不會出現 |',
        '| iOS 動作權限詢問、權限被拒 | 需要實機 |', '| 休息結束通知、通知權限詢問列 | 需要通知權限與背景頁面 |', '| 安裝到主畫面的提示（Android 安裝鈕、iOS 分享選單說明） | 需要瀏覽器的安裝事件或 iOS |',
        '| 系統分享選單、分享圖本身 | 分享圖畫在 canvas 上並交給系統；沒有截 |', '| 匯入備份的確認訊息 | 需要選檔案；只截了「貼上備份文字」的輸入框 |',
        '| 背景聲音試聽 | 聲音無法截圖 |', '| 寬螢幕橫向版面（≥ 900 px，舞台與計時左右並排） | 本輪以手機為主，沒有截；844×390 走的是直向版面 |',
        '| 黃昏以外的「隨時間」切換、春夏秋的窗景 | 窗景跟著月份；截圖是 11 月（冬）。黃昏用強制套用屬性的方式截 |', '| 手卷展開與收起的動畫過程、住持走路的連續動作 | 靜態截圖只有結果；動作在 Round 4、5 已驗收 |', '']
open(os.path.join(HERE, 'index.md'), 'w').write('\n'.join(out))
print(total)
