# Round 6 審查：截圖索引

截圖時間：2026-11-17 04:46 UTC。全部由 `capture.mjs` 操作正式版 `index.html` 截下（無頭 Chromium，Playwright；**不是真實手機**）。
每個設定一個資料夾 `shots/<設定>/`，總覽圖在 `sheets/`。量測數據（可點範圍、字級、對比、是否水平捲動）在 `data.json`。

| 設定 | 張數 | 沒截到 | 頁面錯誤 | 總覽圖 |
|---|---|---|---|---|
| 390×844（完整流程，淺色、中文） | 74 | 0 | 0 | [1](sheets/390x844_1.jpg) [2](sheets/390x844_2.jpg) [3](sheets/390x844_3.jpg) [4](sheets/390x844_4.jpg) |
| 320×640 | 23 | 0 | 0 | [1](sheets/320x640_1.jpg) |
| 360×780 | 23 | 0 | 0 | [1](sheets/360x780_1.jpg) |
| 412×915 | 23 | 0 | 0 | [1](sheets/412x915_1.jpg) |
| 844×390 橫向 | 23 | 0 | 0 | [1](sheets/844x390_1.jpg) |
| 390×844，網頁字體 130% | 23 | 0 | 0 | [1](sheets/390x844-text130_1.jpg) |
| 390×844，深色 | 23 | 0 | 0 | [1](sheets/390x844-dark_1.jpg) |
| 390×844，黃昏（強制套用 data-theme="dusk"） | 23 | 0 | 0 | [1](sheets/390x844-dusk_1.jpg) |
| 390×844，日本語 | 24 | 0 | 0 | [1](sheets/390x844-ja_1.jpg) |
| 390×844，English | 24 | 0 | 0 | [1](sheets/390x844-en_1.jpg) |
| 390×844，減少動態效果 | 22 | 0 | 0 | [1](sheets/390x844-reduced-motion_1.jpg) |

共 305 張。

## 390×844（完整流程，淺色、中文）

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [intro-1-welcome](shots/390x844/01_intro-1-welcome.jpg) | 首次進入：住持自我介紹 | 852 / 844 | 2 | 0 | 0 |
| 02 | [intro-2-what](shots/390x844/02_intro-2-what.jpg) |  | 852 / 844 | 2 | 0 | 0 |
| 03 | [intro-3-keisaku](shots/390x844/03_intro-3-keisaku.jpg) | 講到香板 | 852 / 844 | 2 | 0 | 0 |
| 04 | [intro-4-tour-next](shots/390x844/04_intro-4-tour-next.jpg) |  | 852 / 844 | 2 | 0 | 0 |
| 05 | [tour-1-help-spot](shots/390x844/05_tour-1-help-spot.jpg) | 導覽：亮框與說明 | 852 / 844 | 4 | 0 | 0 |
| 06 | [tour-1-help-open](shots/390x844/06_tour-1-help-open.jpg) | 導覽中打開的面板 | 852 / 844 | 1 | 0 | 0 |
| 07 | [tour-2-journal-spot](shots/390x844/07_tour-2-journal-spot.jpg) | 導覽：亮框與說明 | 852 / 844 | 4 | 0 | 0 |
| 08 | [tour-2-journal-open](shots/390x844/08_tour-2-journal-open.jpg) | 導覽中打開的面板 | 852 / 844 | 21 | 30 | 0 |
| 09 | [tour-3-collect-spot](shots/390x844/09_tour-3-collect-spot.jpg) | 導覽：亮框與說明 | 852 / 844 | 4 | 0 | 0 |
| 10 | [tour-3-collect-open](shots/390x844/10_tour-3-collect-open.jpg) | 導覽中打開的面板 | 852 / 844 | 5 | 14 | 0 |
| 11 | [tour-4-settings-spot](shots/390x844/11_tour-4-settings-spot.jpg) | 導覽：亮框與說明 | 852 / 844 | 4 | 0 | 0 |
| 12 | [tour-4-settings-open](shots/390x844/12_tour-4-settings-open.jpg) | 導覽中打開的面板 | 852 / 844 | 20 | 0 | 0 |
| 13 | [plan-1-task](shots/390x844/13_plan-1-task.jpg) | 報到：今天想做什麼 | 852 / 844 | 1 | 0 | 0 |
| 14 | [plan-1b-custom-input](shots/390x844/14_plan-1b-custom-input.jpg) | 自訂事項的輸入框 | 852 / 844 | 1 | 0 | 0 |
| 15 | [checkin](shots/390x844/15_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 16 | [plan-2-focus](shots/390x844/16_plan-2-focus.jpg) |  | 912 / 844 | 1 | 0 | 0 |
| 17 | [plan-3-rounds](shots/390x844/17_plan-3-rounds.jpg) |  | 895 / 844 | 1 | 0 | 0 |
| 18 | [plan-4-break](shots/390x844/18_plan-4-break.jpg) |  | 852 / 844 | 1 | 0 | 0 |
| 19 | [plan-5-recap](shots/390x844/19_plan-5-recap.jpg) | 住持複述 | 867 / 844 | 1 | 0 | 0 |
| 20 | [plan-5b-edit](shots/390x844/20_plan-5b-edit.jpg) | 只改一項 | 912 / 844 | 1 | 0 | 0 |
| 21 | [plan-6-ready](shots/390x844/21_plan-6-ready.jpg) | 準備好了嗎 | 876 / 844 | 1 | 0 | 0 |
| 22 | [plan-6b-wait-tea](shots/390x844/22_plan-6b-wait-tea.jpg) | 再等一下：住持去喝茶 | 852 / 844 | 1 | 0 | 0 |
| 23 | [settle](shots/390x844/23_settle.jpg) | 落座 | 852 / 844 | 1 | 0 | 0 |
| 24 | [focus-start](shots/390x844/24_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 25 | [focus-quiet](shots/390x844/25_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 26 | [focus-sense-why](shots/390x844/26_focus-sense-why.jpg) | 偵測警告展開 | 852 / 844 | 4 | 0 | 0 |
| 27 | [focus-monk-front](shots/390x844/27_focus-monk-front.jpg) | 住持走到前景 | 852 / 844 | 4 | 0 | 0 |
| 28 | [focus-monk-behind](shots/390x844/28_focus-monk-behind.jpg) | 住持在麻糬後方 | 852 / 844 | 4 | 0 | 0 |
| 29 | [focus-quit-confirm](shots/390x844/29_focus-quit-confirm.jpg) | 出堂要按兩次 | 852 / 844 | 4 | 0 | 0 |
| 30 | [remind-1-caught](shots/390x844/30_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 4 | 0 | 0 |
| 31 | [remind-2-windup](shots/390x844/31_remind-2-windup.jpg) | 舉板 | 852 / 844 | 4 | 0 | 0 |
| 32 | [remind-3-hit](shots/390x844/32_remind-3-hit.jpg) | 命中 | 852 / 844 | 4 | 0 | 2 |
| 33 | [remind-4-after](shots/390x844/33_remind-4-after.jpg) | 命中之後 | 852 / 844 | 4 | 0 | 1 |
| 34 | [remind-5-merged](shots/390x844/34_remind-5-merged.jpg) | 合併：又分心了 N 次 | 852 / 844 | 3 | 0 | 1 |
| 35 | [ask-hit](shots/390x844/35_ask-hit.jpg) | 合掌請打 | 852 / 844 | 3 | 0 | 1 |
| 36 | [leave](shots/390x844/36_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 0 |
| 37 | [leave-back-settle](shots/390x844/37_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 0 |
| 38 | [break-start](shots/390x844/38_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 2 | 0 | 0 |
| 39 | [break](shots/390x844/39_break.jpg) | 休息（住持喝茶） | 852 / 844 | 2 | 0 | 0 |
| 40 | [break-over-late](shots/390x844/40_break-over-late.jpg) | 休息超時回來 | 852 / 844 | 1 | 0 | 0 |
| 41 | [focus-round2](shots/390x844/41_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 0 |
| 42 | [result](shots/390x844/42_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 43 | [result-new-item-offer](shots/390x844/43_result-new-item-offer.jpg) | 住持問要不要掛上新掛軸 | 852 / 844 | 1 | 0 | 0 |
| 44 | [again](shots/390x844/44_again.jpg) | 坐完一輪：還要再坐嗎 | 852 / 844 | 1 | 0 | 0 |
| 45 | [result-early](shots/390x844/45_result-early.jpg) | 提前出堂的結算卡 | 852 / 844 | 1 | 0 | 0 |
| 46 | [returning-greeting](shots/390x844/46_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 0 |
| 47 | [journal-calendar](shots/390x844/47_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 1 |
| 48 | [journal-day](shots/390x844/48_journal-day.jpg) | 點某一天的明細 | 852 / 844 | 21 | 30 | 1 |
| 49 | [journal-calendar-bottom](shots/390x844/49_journal-calendar-bottom.jpg) | 月曆捲到底 | 852 / 844 | 21 | 30 | 1 |
| 50 | [journal-prev-month](shots/390x844/50_journal-prev-month.jpg) | 上個月 | 852 / 844 | 36 | 31 | 1 |
| 51 | [journal-stats](shots/390x844/51_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 13 | 1 |
| 52 | [journal-stats-bottom](shots/390x844/52_journal-stats-bottom.jpg) | 統計捲到底 | 852 / 844 | 5 | 15 | 0 |
| 53 | [journal-stats-30](shots/390x844/53_journal-stats-30.jpg) | 三十日 | 852 / 844 | 36 | 12 | 1 |
| 54 | [journal-stats-slip](shots/390x844/54_journal-stats-slip.jpg) | 點一根香：籤紙 | 852 / 844 | 36 | 13 | 1 |
| 55 | [journal-stats-all](shots/390x844/55_journal-stats-all.jpg) | 全部 | 852 / 844 | 6 | 9 | 1 |
| 56 | [collect-scrolls](shots/390x844/56_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 5 | 0 |
| 57 | [collect-scrolls-bottom](shots/390x844/57_collect-scrolls-bottom.jpg) | 掛軸捲到底 | 852 / 844 | 0 | 8 | 0 |
| 58 | [collect-seasons](shots/390x844/58_collect-seasons.jpg) | 收藏冊：seasons | 852 / 844 | 5 | 1 | 0 |
| 59 | [collect-accs](shots/390x844/59_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 4 | 0 |
| 60 | [collect-accs-bottom](shots/390x844/60_collect-accs-bottom.jpg) | 配件捲到底 | 852 / 844 | 0 | 8 | 0 |
| 61 | [collect-faces](shots/390x844/61_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 0 |
| 62 | [settings-1](shots/390x844/62_settings-1.jpg) | 設定（頂端） | 852 / 844 | 20 | 0 | 0 |
| 63 | [settings-2](shots/390x844/63_settings-2.jpg) | 設定（第 2 段，共 2 段） | 852 / 844 | 9 | 0 | 0 |
| 64 | [settings-paste-backup](shots/390x844/64_settings-paste-backup.jpg) | 貼上備份文字 | 852 / 844 | 10 | 0 | 0 |
| 65 | [help](shots/390x844/65_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |
| 66 | [help-bottom](shots/390x844/66_help-bottom.jpg) | 堂規捲到底 | 852 / 844 | 0 | 0 | 0 |
| 67 | [window-tale](shots/390x844/67_window-tale.jpg) | 點圓窗：住持說窗的由來 | 852 / 844 | 1 | 1 | 0 |
| 68 | [collect-while-sitting](shots/390x844/68_collect-while-sitting.jpg) | 坐禪中的收藏冊（只能看） | 852 / 844 | 5 | 5 | 0 |
| 69 | [journal-while-sitting](shots/390x844/69_journal-while-sitting.jpg) | 坐禪中打開坐禪帳（計時照常） | 852 / 844 | 21 | 30 | 1 |
| 70 | [empty-journal](shots/390x844/70_empty-journal.jpg) | 空的坐禪帳 | 852 / 844 | 21 | 30 | 0 |
| 71 | [empty-stats](shots/390x844/71_empty-stats.jpg) | 空的統計 | 852 / 844 | 6 | 3 | 0 |
| 72 | [empty-collect](shots/390x844/72_empty-collect.jpg) | 剛開始的收藏冊 | 852 / 844 | 5 | 14 | 0 |
| 73 | [empty-faces](shots/390x844/73_empty-faces.jpg) | 剛開始的表情 | 852 / 844 | 5 | 10 | 0 |
| 74 | [tip-leave](shots/390x844/74_tip-leave.jpg) | 第一次被打後：暫離的提示 | 852 / 844 | 6 | 0 | 1 |

## 320×640

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/320x640/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 874 / 640 | 6 | 0 | 0 |
| 02 | [focus-start](shots/320x640/02_focus-start.jpg) | 止靜：剛開始 | 648 / 640 | 9 | 0 | 0 |
| 03 | [focus-quiet](shots/320x640/03_focus-quiet.jpg) | 專注中（提示消失後） | 648 / 640 | 9 | 0 | 0 |
| 04 | [remind-1-caught](shots/320x640/04_remind-1-caught.jpg) | 被抓到：住持停下 | 648 / 640 | 8 | 0 | 0 |
| 05 | [remind-2-windup](shots/320x640/05_remind-2-windup.jpg) | 舉板 | 648 / 640 | 8 | 0 | 0 |
| 06 | [remind-3-hit](shots/320x640/06_remind-3-hit.jpg) | 命中 | 648 / 640 | 8 | 0 | 2 |
| 07 | [remind-4-after](shots/320x640/07_remind-4-after.jpg) | 命中之後 | 648 / 640 | 8 | 0 | 1 |
| 08 | [leave](shots/320x640/08_leave.jpg) | 暫離 | 648 / 640 | 6 | 0 | 0 |
| 09 | [leave-back-settle](shots/320x640/09_leave-back-settle.jpg) | 回座 | 648 / 640 | 6 | 0 | 0 |
| 10 | [break-start](shots/320x640/10_break-start.jpg) | 開靜：進入休息 | 648 / 640 | 6 | 0 | 0 |
| 11 | [break](shots/320x640/11_break.jpg) | 休息（住持喝茶） | 648 / 640 | 6 | 0 | 0 |
| 12 | [ready-round2](shots/320x640/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 819 / 640 | 6 | 0 | 0 |
| 13 | [focus-round2](shots/320x640/13_focus-round2.jpg) | 第 2 炷 | 648 / 640 | 8 | 0 | 0 |
| 14 | [result](shots/320x640/14_result.jpg) | 結算卡（坐滿 2 炷） | 650 / 640 | 6 | 0 | 0 |
| 15 | [returning-greeting](shots/320x640/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 874 / 640 | 6 | 1 | 0 |
| 16 | [journal-calendar](shots/320x640/16_journal-calendar.jpg) | 坐禪帳：月曆 | 874 / 640 | 21 | 30 | 1 |
| 17 | [journal-stats](shots/320x640/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 874 / 640 | 13 | 5 | 1 |
| 18 | [collect-scrolls](shots/320x640/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 874 / 640 | 5 | 1 | 0 |
| 19 | [collect-accs](shots/320x640/19_collect-accs.jpg) | 收藏冊：accs | 874 / 640 | 5 | 1 | 0 |
| 20 | [collect-faces](shots/320x640/20_collect-faces.jpg) | 收藏冊：faces | 874 / 640 | 5 | 1 | 0 |
| 21 | [settings-1](shots/320x640/21_settings-1.jpg) | 設定（頂端） | 874 / 640 | 20 | 0 | 0 |
| 22 | [settings-2](shots/320x640/22_settings-2.jpg) | 設定（第 2 段，共 3 段） | 874 / 640 | 6 | 0 | 0 |
| 23 | [help](shots/320x640/23_help.jpg) | 堂規 | 874 / 640 | 1 | 0 | 0 |

## 360×780

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/360x780/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 804 / 780 | 5 | 0 | 0 |
| 02 | [focus-start](shots/360x780/02_focus-start.jpg) | 止靜：剛開始 | 788 / 780 | 8 | 0 | 0 |
| 03 | [focus-quiet](shots/360x780/03_focus-quiet.jpg) | 專注中（提示消失後） | 788 / 780 | 8 | 0 | 0 |
| 04 | [remind-1-caught](shots/360x780/04_remind-1-caught.jpg) | 被抓到：住持停下 | 788 / 780 | 7 | 0 | 0 |
| 05 | [remind-2-windup](shots/360x780/05_remind-2-windup.jpg) | 舉板 | 788 / 780 | 7 | 0 | 0 |
| 06 | [remind-3-hit](shots/360x780/06_remind-3-hit.jpg) | 命中 | 788 / 780 | 7 | 0 | 2 |
| 07 | [remind-4-after](shots/360x780/07_remind-4-after.jpg) | 命中之後 | 788 / 780 | 7 | 0 | 1 |
| 08 | [leave](shots/360x780/08_leave.jpg) | 暫離 | 788 / 780 | 6 | 0 | 0 |
| 09 | [leave-back-settle](shots/360x780/09_leave-back-settle.jpg) | 回座 | 788 / 780 | 6 | 0 | 0 |
| 10 | [break-start](shots/360x780/10_break-start.jpg) | 開靜：進入休息 | 788 / 780 | 6 | 0 | 0 |
| 11 | [break](shots/360x780/11_break.jpg) | 休息（住持喝茶） | 788 / 780 | 6 | 0 | 0 |
| 12 | [ready-round2](shots/360x780/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 788 / 780 | 5 | 0 | 0 |
| 13 | [focus-round2](shots/360x780/13_focus-round2.jpg) | 第 2 炷 | 788 / 780 | 7 | 0 | 0 |
| 14 | [result](shots/360x780/14_result.jpg) | 結算卡（坐滿 2 炷） | 788 / 780 | 5 | 0 | 0 |
| 15 | [returning-greeting](shots/360x780/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 804 / 780 | 5 | 1 | 0 |
| 16 | [journal-calendar](shots/360x780/16_journal-calendar.jpg) | 坐禪帳：月曆 | 804 / 780 | 21 | 30 | 1 |
| 17 | [journal-stats](shots/360x780/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 804 / 780 | 13 | 12 | 1 |
| 18 | [collect-scrolls](shots/360x780/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 804 / 780 | 5 | 1 | 0 |
| 19 | [collect-accs](shots/360x780/19_collect-accs.jpg) | 收藏冊：accs | 804 / 780 | 5 | 4 | 0 |
| 20 | [collect-faces](shots/360x780/20_collect-faces.jpg) | 收藏冊：faces | 804 / 780 | 5 | 1 | 0 |
| 21 | [settings-1](shots/360x780/21_settings-1.jpg) | 設定（頂端） | 804 / 780 | 20 | 0 | 0 |
| 22 | [settings-2](shots/360x780/22_settings-2.jpg) | 設定（第 2 段，共 3 段） | 804 / 780 | 9 | 0 | 0 |
| 23 | [help](shots/360x780/23_help.jpg) | 堂規 | 804 / 780 | 1 | 0 | 0 |

## 412×915

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/412x915/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 923 / 915 | 1 | 0 | 0 |
| 02 | [focus-start](shots/412x915/02_focus-start.jpg) | 止靜：剛開始 | 923 / 915 | 4 | 0 | 0 |
| 03 | [focus-quiet](shots/412x915/03_focus-quiet.jpg) | 專注中（提示消失後） | 923 / 915 | 4 | 0 | 0 |
| 04 | [remind-1-caught](shots/412x915/04_remind-1-caught.jpg) | 被抓到：住持停下 | 923 / 915 | 4 | 0 | 0 |
| 05 | [remind-2-windup](shots/412x915/05_remind-2-windup.jpg) | 舉板 | 923 / 915 | 4 | 0 | 0 |
| 06 | [remind-3-hit](shots/412x915/06_remind-3-hit.jpg) | 命中 | 923 / 915 | 4 | 0 | 2 |
| 07 | [remind-4-after](shots/412x915/07_remind-4-after.jpg) | 命中之後 | 923 / 915 | 4 | 0 | 1 |
| 08 | [leave](shots/412x915/08_leave.jpg) | 暫離 | 923 / 915 | 2 | 0 | 0 |
| 09 | [leave-back-settle](shots/412x915/09_leave-back-settle.jpg) | 回座 | 923 / 915 | 2 | 0 | 0 |
| 10 | [break-start](shots/412x915/10_break-start.jpg) | 開靜：進入休息 | 923 / 915 | 2 | 0 | 0 |
| 11 | [break](shots/412x915/11_break.jpg) | 休息（住持喝茶） | 923 / 915 | 2 | 0 | 0 |
| 12 | [ready-round2](shots/412x915/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 923 / 915 | 1 | 0 | 0 |
| 13 | [focus-round2](shots/412x915/13_focus-round2.jpg) | 第 2 炷 | 923 / 915 | 4 | 0 | 0 |
| 14 | [result](shots/412x915/14_result.jpg) | 結算卡（坐滿 2 炷） | 923 / 915 | 1 | 0 | 0 |
| 15 | [returning-greeting](shots/412x915/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 923 / 915 | 1 | 1 | 0 |
| 16 | [journal-calendar](shots/412x915/16_journal-calendar.jpg) | 坐禪帳：月曆 | 923 / 915 | 4 | 30 | 1 |
| 17 | [journal-stats](shots/412x915/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 923 / 915 | 6 | 14 | 1 |
| 18 | [collect-scrolls](shots/412x915/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 923 / 915 | 5 | 5 | 0 |
| 19 | [collect-accs](shots/412x915/19_collect-accs.jpg) | 收藏冊：accs | 923 / 915 | 5 | 4 | 0 |
| 20 | [collect-faces](shots/412x915/20_collect-faces.jpg) | 收藏冊：faces | 923 / 915 | 5 | 5 | 0 |
| 21 | [settings-1](shots/412x915/21_settings-1.jpg) | 設定（頂端） | 923 / 915 | 23 | 0 | 0 |
| 22 | [settings-2](shots/412x915/22_settings-2.jpg) | 設定（第 2 段，共 2 段） | 923 / 915 | 9 | 0 | 0 |
| 23 | [help](shots/412x915/23_help.jpg) | 堂規 | 923 / 915 | 1 | 0 | 0 |

## 844×390 橫向

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/844x390/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 930 / 390 | 1 | 0 | 0 |
| 02 | [focus-start](shots/844x390/02_focus-start.jpg) | 止靜：剛開始 | 786 / 390 | 1 | 0 | 0 |
| 03 | [focus-quiet](shots/844x390/03_focus-quiet.jpg) | 專注中（提示消失後） | 786 / 390 | 1 | 0 | 0 |
| 04 | [remind-1-caught](shots/844x390/04_remind-1-caught.jpg) | 被抓到：住持停下 | 786 / 390 | 1 | 0 | 0 |
| 05 | [remind-2-windup](shots/844x390/05_remind-2-windup.jpg) | 舉板 | 786 / 390 | 1 | 0 | 0 |
| 06 | [remind-3-hit](shots/844x390/06_remind-3-hit.jpg) | 命中 | 786 / 390 | 1 | 0 | 2 |
| 07 | [remind-4-after](shots/844x390/07_remind-4-after.jpg) | 命中之後 | 786 / 390 | 1 | 0 | 1 |
| 08 | [leave](shots/844x390/08_leave.jpg) | 暫離 | 747 / 390 | 1 | 0 | 0 |
| 09 | [leave-back-settle](shots/844x390/09_leave-back-settle.jpg) | 回座 | 686 / 390 | 1 | 0 | 0 |
| 10 | [break-start](shots/844x390/10_break-start.jpg) | 開靜：進入休息 | 686 / 390 | 1 | 0 | 0 |
| 11 | [break](shots/844x390/11_break.jpg) | 休息（住持喝茶） | 686 / 390 | 1 | 0 | 0 |
| 12 | [ready-round2](shots/844x390/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 874 / 390 | 1 | 0 | 0 |
| 13 | [focus-round2](shots/844x390/13_focus-round2.jpg) | 第 2 炷 | 786 / 390 | 1 | 0 | 0 |
| 14 | [result](shots/844x390/14_result.jpg) | 結算卡（坐滿 2 炷） | 673 / 390 | 1 | 0 | 0 |
| 15 | [returning-greeting](shots/844x390/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 930 / 390 | 1 | 1 | 0 |
| 16 | [journal-calendar](shots/844x390/16_journal-calendar.jpg) | 坐禪帳：月曆 | 930 / 390 | 4 | 14 | 1 |
| 17 | [journal-stats](shots/844x390/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 930 / 390 | 6 | 4 | 1 |
| 18 | [collect-scrolls](shots/844x390/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 930 / 390 | 5 | 1 | 0 |
| 19 | [collect-accs](shots/844x390/19_collect-accs.jpg) | 收藏冊：accs | 930 / 390 | 5 | 1 | 0 |
| 20 | [collect-faces](shots/844x390/20_collect-faces.jpg) | 收藏冊：faces | 930 / 390 | 5 | 1 | 0 |
| 21 | [settings-1](shots/844x390/21_settings-1.jpg) | 設定（頂端） | 930 / 390 | 14 | 0 | 0 |
| 22 | [settings-2](shots/844x390/22_settings-2.jpg) | 設定（第 2 段，共 4 段） | 930 / 390 | 11 | 0 | 0 |
| 23 | [help](shots/844x390/23_help.jpg) | 堂規 | 930 / 390 | 1 | 0 | 0 |

## 390×844，網頁字體 130%

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/390x844-text130/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 890 / 844 | 1 | 0 | 0 |
| 02 | [focus-start](shots/390x844-text130/02_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 03 | [focus-quiet](shots/390x844-text130/03_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 04 | [remind-1-caught](shots/390x844-text130/04_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 3 | 0 | 0 |
| 05 | [remind-2-windup](shots/390x844-text130/05_remind-2-windup.jpg) | 舉板 | 852 / 844 | 3 | 0 | 0 |
| 06 | [remind-3-hit](shots/390x844-text130/06_remind-3-hit.jpg) | 命中 | 852 / 844 | 3 | 0 | 1 |
| 07 | [remind-4-after](shots/390x844-text130/07_remind-4-after.jpg) | 命中之後 | 852 / 844 | 3 | 0 | 0 |
| 08 | [leave](shots/390x844-text130/08_leave.jpg) | 暫離 | 852 / 844 | 1 | 0 | 0 |
| 09 | [leave-back-settle](shots/390x844-text130/09_leave-back-settle.jpg) | 回座 | 852 / 844 | 1 | 0 | 0 |
| 10 | [break-start](shots/390x844-text130/10_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 1 | 0 | 0 |
| 11 | [break](shots/390x844-text130/11_break.jpg) | 休息（住持喝茶） | 852 / 844 | 1 | 0 | 0 |
| 12 | [ready-round2](shots/390x844-text130/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 909 / 844 | 1 | 0 | 0 |
| 13 | [focus-round2](shots/390x844-text130/13_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 0 |
| 14 | [result](shots/390x844-text130/14_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 15 | [returning-greeting](shots/390x844-text130/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 890 / 844 | 1 | 0 | 0 |
| 16 | [journal-calendar](shots/390x844-text130/16_journal-calendar.jpg) | 坐禪帳：月曆 | 890 / 844 | 21 | 0 | 1 |
| 17 | [journal-stats](shots/390x844-text130/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 890 / 844 | 6 | 0 | 1 |
| 18 | [collect-scrolls](shots/390x844-text130/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 890 / 844 | 5 | 0 | 0 |
| 19 | [collect-accs](shots/390x844-text130/19_collect-accs.jpg) | 收藏冊：accs | 890 / 844 | 5 | 0 | 0 |
| 20 | [collect-faces](shots/390x844-text130/20_collect-faces.jpg) | 收藏冊：faces | 890 / 844 | 5 | 0 | 0 |
| 21 | [settings-1](shots/390x844-text130/21_settings-1.jpg) | 設定（頂端） | 890 / 844 | 20 | 0 | 0 |
| 22 | [settings-2](shots/390x844-text130/22_settings-2.jpg) | 設定（第 2 段，共 3 段） | 890 / 844 | 1 | 0 | 0 |
| 23 | [help](shots/390x844-text130/23_help.jpg) | 堂規 | 890 / 844 | 1 | 0 | 0 |

## 390×844，深色

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/390x844-dark/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 02 | [focus-start](shots/390x844-dark/02_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 03 | [focus-quiet](shots/390x844-dark/03_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 04 | [remind-1-caught](shots/390x844-dark/04_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 4 | 0 | 0 |
| 05 | [remind-2-windup](shots/390x844-dark/05_remind-2-windup.jpg) | 舉板 | 852 / 844 | 4 | 0 | 0 |
| 06 | [remind-3-hit](shots/390x844-dark/06_remind-3-hit.jpg) | 命中 | 852 / 844 | 4 | 0 | 0 |
| 07 | [remind-4-after](shots/390x844-dark/07_remind-4-after.jpg) | 命中之後 | 852 / 844 | 4 | 0 | 0 |
| 08 | [leave](shots/390x844-dark/08_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 0 |
| 09 | [leave-back-settle](shots/390x844-dark/09_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 0 |
| 10 | [break-start](shots/390x844-dark/10_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 2 | 0 | 0 |
| 11 | [break](shots/390x844-dark/11_break.jpg) | 休息（住持喝茶） | 852 / 844 | 2 | 0 | 0 |
| 12 | [ready-round2](shots/390x844-dark/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 852 / 844 | 1 | 0 | 0 |
| 13 | [focus-round2](shots/390x844-dark/13_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 0 |
| 14 | [result](shots/390x844-dark/14_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 15 | [returning-greeting](shots/390x844-dark/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 1 |
| 16 | [journal-calendar](shots/390x844-dark/16_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 0 |
| 17 | [journal-stats](shots/390x844-dark/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 13 | 0 |
| 18 | [collect-scrolls](shots/390x844-dark/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 5 | 2 |
| 19 | [collect-accs](shots/390x844-dark/19_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 4 | 1 |
| 20 | [collect-faces](shots/390x844-dark/20_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 1 |
| 21 | [settings-1](shots/390x844-dark/21_settings-1.jpg) | 設定（頂端） | 852 / 844 | 20 | 0 | 0 |
| 22 | [settings-2](shots/390x844-dark/22_settings-2.jpg) | 設定（第 2 段，共 2 段） | 852 / 844 | 9 | 0 | 0 |
| 23 | [help](shots/390x844-dark/23_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |

## 390×844，黃昏（強制套用 data-theme="dusk"）

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/390x844-dusk/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 02 | [focus-start](shots/390x844-dusk/02_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 1 |
| 03 | [focus-quiet](shots/390x844-dusk/03_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 1 |
| 04 | [remind-1-caught](shots/390x844-dusk/04_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 4 | 0 | 3 |
| 05 | [remind-2-windup](shots/390x844-dusk/05_remind-2-windup.jpg) | 舉板 | 852 / 844 | 4 | 0 | 3 |
| 06 | [remind-3-hit](shots/390x844-dusk/06_remind-3-hit.jpg) | 命中 | 852 / 844 | 4 | 0 | 5 |
| 07 | [remind-4-after](shots/390x844-dusk/07_remind-4-after.jpg) | 命中之後 | 852 / 844 | 4 | 0 | 3 |
| 08 | [leave](shots/390x844-dusk/08_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 1 |
| 09 | [leave-back-settle](shots/390x844-dusk/09_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 1 |
| 10 | [break-start](shots/390x844-dusk/10_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 2 | 0 | 1 |
| 11 | [break](shots/390x844-dusk/11_break.jpg) | 休息（住持喝茶） | 852 / 844 | 2 | 0 | 1 |
| 12 | [ready-round2](shots/390x844-dusk/12_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 852 / 844 | 1 | 0 | 1 |
| 13 | [focus-round2](shots/390x844-dusk/13_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 2 |
| 14 | [result](shots/390x844-dusk/14_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 1 |
| 15 | [returning-greeting](shots/390x844-dusk/15_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 0 |
| 16 | [journal-calendar](shots/390x844-dusk/16_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 1 |
| 17 | [journal-stats](shots/390x844-dusk/17_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 13 | 1 |
| 18 | [collect-scrolls](shots/390x844-dusk/18_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 5 | 0 |
| 19 | [collect-accs](shots/390x844-dusk/19_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 4 | 0 |
| 20 | [collect-faces](shots/390x844-dusk/20_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 0 |
| 21 | [settings-1](shots/390x844-dusk/21_settings-1.jpg) | 設定（頂端） | 852 / 844 | 20 | 0 | 0 |
| 22 | [settings-2](shots/390x844-dusk/22_settings-2.jpg) | 設定（第 2 段，共 2 段） | 852 / 844 | 9 | 0 | 0 |
| 23 | [help](shots/390x844-dusk/23_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |

## 390×844，日本語

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [intro-1-welcome](shots/390x844-ja/01_intro-1-welcome.jpg) | 首次進入：住持自我介紹 | 852 / 844 | 2 | 0 | 0 |
| 02 | [checkin](shots/390x844-ja/02_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 03 | [focus-start](shots/390x844-ja/03_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 04 | [focus-quiet](shots/390x844-ja/04_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 05 | [remind-1-caught](shots/390x844-ja/05_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 3 | 0 | 0 |
| 06 | [remind-2-windup](shots/390x844-ja/06_remind-2-windup.jpg) | 舉板 | 852 / 844 | 3 | 0 | 0 |
| 07 | [remind-3-hit](shots/390x844-ja/07_remind-3-hit.jpg) | 命中 | 852 / 844 | 3 | 0 | 2 |
| 08 | [remind-4-after](shots/390x844-ja/08_remind-4-after.jpg) | 命中之後 | 852 / 844 | 3 | 0 | 1 |
| 09 | [leave](shots/390x844-ja/09_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 0 |
| 10 | [leave-back-settle](shots/390x844-ja/10_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 0 |
| 11 | [break-start](shots/390x844-ja/11_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 1 | 0 | 0 |
| 12 | [break](shots/390x844-ja/12_break.jpg) | 休息（住持喝茶） | 852 / 844 | 1 | 0 | 0 |
| 13 | [ready-round2](shots/390x844-ja/13_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 852 / 844 | 1 | 0 | 0 |
| 14 | [focus-round2](shots/390x844-ja/14_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 0 |
| 15 | [result](shots/390x844-ja/15_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 16 | [returning-greeting](shots/390x844-ja/16_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 0 |
| 17 | [journal-calendar](shots/390x844-ja/17_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 1 |
| 18 | [journal-stats](shots/390x844-ja/18_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 12 | 1 |
| 19 | [collect-scrolls](shots/390x844-ja/19_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 14 | 0 |
| 20 | [collect-accs](shots/390x844-ja/20_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 4 | 0 |
| 21 | [collect-faces](shots/390x844-ja/21_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 0 |
| 22 | [settings-1](shots/390x844-ja/22_settings-1.jpg) | 設定（頂端） | 852 / 844 | 20 | 0 | 0 |
| 23 | [settings-2](shots/390x844-ja/23_settings-2.jpg) | 設定（第 2 段，共 3 段） | 852 / 844 | 1 | 0 | 0 |
| 24 | [help](shots/390x844-ja/24_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |

## 390×844，English

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [intro-1-welcome](shots/390x844-en/01_intro-1-welcome.jpg) | 首次進入：住持自我介紹 | 852 / 844 | 2 | 0 | 0 |
| 02 | [checkin](shots/390x844-en/02_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 03 | [focus-start](shots/390x844-en/03_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 04 | [focus-quiet](shots/390x844-en/04_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 05 | [remind-1-caught](shots/390x844-en/05_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 2 | 0 | 0 |
| 06 | [remind-2-windup](shots/390x844-en/06_remind-2-windup.jpg) | 舉板 | 852 / 844 | 2 | 0 | 0 |
| 07 | [remind-3-hit](shots/390x844-en/07_remind-3-hit.jpg) | 命中 | 852 / 844 | 2 | 0 | 2 |
| 08 | [remind-4-after](shots/390x844-en/08_remind-4-after.jpg) | 命中之後 | 852 / 844 | 2 | 0 | 1 |
| 09 | [leave](shots/390x844-en/09_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 0 |
| 10 | [leave-back-settle](shots/390x844-en/10_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 0 |
| 11 | [break-start](shots/390x844-en/11_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 2 | 0 | 0 |
| 12 | [break](shots/390x844-en/12_break.jpg) | 休息（住持喝茶） | 852 / 844 | 2 | 0 | 0 |
| 13 | [ready-round2](shots/390x844-en/13_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 852 / 844 | 1 | 0 | 0 |
| 14 | [focus-round2](shots/390x844-en/14_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 2 | 0 | 0 |
| 15 | [result](shots/390x844-en/15_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 16 | [returning-greeting](shots/390x844-en/16_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 0 |
| 17 | [journal-calendar](shots/390x844-en/17_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 1 |
| 18 | [journal-stats](shots/390x844-en/18_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 12 | 1 |
| 19 | [collect-scrolls](shots/390x844-en/19_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 12 | 0 |
| 20 | [collect-accs](shots/390x844-en/20_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 3 | 0 |
| 21 | [collect-faces](shots/390x844-en/21_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 0 |
| 22 | [settings-1](shots/390x844-en/22_settings-1.jpg) | 設定（頂端） | 852 / 844 | 6 | 0 | 0 |
| 23 | [settings-2](shots/390x844-en/23_settings-2.jpg) | 設定（第 2 段，共 3 段） | 852 / 844 | 5 | 0 | 0 |
| 24 | [help](shots/390x844-en/24_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |

## 390×844，減少動態效果

| # | 檔案 | 畫面 | 頁面高 / 視窗高 | 小於 44 px 的可點元件 | 小於 12 px 的文字 | 對比不足 |
|---|---|---|---|---|---|---|
| 01 | [checkin](shots/390x844-reduced-motion/01_checkin.jpg) | 報到（看過導覽、還沒坐過） | 852 / 844 | 1 | 0 | 0 |
| 02 | [focus-start](shots/390x844-reduced-motion/02_focus-start.jpg) | 止靜：剛開始 | 852 / 844 | 4 | 0 | 0 |
| 03 | [focus-quiet](shots/390x844-reduced-motion/03_focus-quiet.jpg) | 專注中（提示消失後） | 852 / 844 | 4 | 0 | 0 |
| 04 | [remind-1-caught](shots/390x844-reduced-motion/04_remind-1-caught.jpg) | 被抓到：住持停下 | 852 / 844 | 4 | 0 | 0 |
| 05 | [remind-3-hit](shots/390x844-reduced-motion/05_remind-3-hit.jpg) | 命中 | 852 / 844 | 4 | 0 | 2 |
| 06 | [remind-4-after](shots/390x844-reduced-motion/06_remind-4-after.jpg) | 命中之後 | 852 / 844 | 4 | 0 | 1 |
| 07 | [leave](shots/390x844-reduced-motion/07_leave.jpg) | 暫離 | 852 / 844 | 2 | 0 | 0 |
| 08 | [leave-back-settle](shots/390x844-reduced-motion/08_leave-back-settle.jpg) | 回座 | 852 / 844 | 2 | 0 | 0 |
| 09 | [break-start](shots/390x844-reduced-motion/09_break-start.jpg) | 開靜：進入休息 | 852 / 844 | 2 | 0 | 0 |
| 10 | [break](shots/390x844-reduced-motion/10_break.jpg) | 休息（住持喝茶） | 852 / 844 | 2 | 0 | 0 |
| 11 | [ready-round2](shots/390x844-reduced-motion/11_ready-round2.jpg) | 第 2 炷：準備好了嗎 | 852 / 844 | 1 | 0 | 0 |
| 12 | [focus-round2](shots/390x844-reduced-motion/12_focus-round2.jpg) | 第 2 炷 | 852 / 844 | 3 | 0 | 0 |
| 13 | [result](shots/390x844-reduced-motion/13_result.jpg) | 結算卡（坐滿 2 炷） | 852 / 844 | 1 | 0 | 0 |
| 14 | [returning-greeting](shots/390x844-reduced-motion/14_returning-greeting.jpg) | 回訪：跟上次一樣／常用／新的安排 | 852 / 844 | 1 | 1 | 0 |
| 15 | [journal-calendar](shots/390x844-reduced-motion/15_journal-calendar.jpg) | 坐禪帳：月曆 | 852 / 844 | 21 | 30 | 1 |
| 16 | [journal-stats](shots/390x844-reduced-motion/16_journal-stats.jpg) | 坐禪帳：統計（七日） | 852 / 844 | 6 | 13 | 1 |
| 17 | [collect-scrolls](shots/390x844-reduced-motion/17_collect-scrolls.jpg) | 收藏冊：掛軸 | 852 / 844 | 5 | 5 | 0 |
| 18 | [collect-accs](shots/390x844-reduced-motion/18_collect-accs.jpg) | 收藏冊：accs | 852 / 844 | 5 | 4 | 0 |
| 19 | [collect-faces](shots/390x844-reduced-motion/19_collect-faces.jpg) | 收藏冊：faces | 852 / 844 | 5 | 4 | 0 |
| 20 | [settings-1](shots/390x844-reduced-motion/20_settings-1.jpg) | 設定（頂端） | 852 / 844 | 20 | 0 | 0 |
| 21 | [settings-2](shots/390x844-reduced-motion/21_settings-2.jpg) | 設定（第 2 段，共 2 段） | 852 / 844 | 9 | 0 | 0 |
| 22 | [help](shots/390x844-reduced-motion/22_help.jpg) | 堂規 | 852 / 844 | 1 | 0 | 0 |

## 沒有截到的狀態（NOT TESTED）

| 狀態 | 原因 |
|---|---|
| 真的平衡儀偵測（拿起手機、每 20 秒、放回去的提示） | 無頭瀏覽器沒有感測器；所以每張坐禪截圖都出現「只能偵測是否切出畫面」的紅字。實機有感測器時這行不會出現 |
| iOS 動作權限詢問、權限被拒 | 需要實機 |
| 休息結束通知、通知權限詢問列 | 需要通知權限與背景頁面 |
| 安裝到主畫面的提示（Android 安裝鈕、iOS 分享選單說明） | 需要瀏覽器的安裝事件或 iOS |
| 系統分享選單、分享圖本身 | 分享圖畫在 canvas 上並交給系統；沒有截 |
| 匯入備份的確認訊息 | 需要選檔案；只截了「貼上備份文字」的輸入框 |
| 背景聲音試聽 | 聲音無法截圖 |
| 寬螢幕橫向版面（≥ 900 px，舞台與計時左右並排） | 本輪以手機為主，沒有截；844×390 走的是直向版面 |
| 黃昏以外的「隨時間」切換、春夏秋的窗景 | 窗景跟著月份；截圖是 11 月（冬）。黃昏用強制套用屬性的方式截 |
| 手卷展開與收起的動畫過程、住持走路的連續動作 | 靜態截圖只有結果；動作在 Round 4、5 已驗收 |
