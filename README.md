# TouchFishPiP 摸魚畫中畫

使用 Chrome 的 **Document Picture-in-Picture API** (`window.documentPictureInPicture.requestWindow()`) 打造的自訂畫中畫視窗擴充功能。

> 為何不用 `video.requestPictureInPicture()`？
> 標準 PiP 視窗由瀏覽器原生渲染，無法用 CSS 控制透明度 / 模糊。本專案改用 Document PiP，將真正的 `<video>` 節點搬進一個可自由套用 CSS/JS 的獨立 HTML 文件視窗，才能做出「預設隱形、滑鼠移入才清晰」的效果。

## 功能

- 點擊瀏覽器工具列的擴充功能 icon，將頁面上的影片節點搬移到一個獨立的 Document PiP 視窗；再按一次關閉。
- 自動選片順序：正在播放的影片優先，其次是網頁中畫面最大的影片（跨 iframe 一併比較）。
- 已開啟 PiP 時，切到其他分頁再按 icon 也能關閉。
- PiP 視窗預設狀態：`opacity: 0.04` + `filter: blur(25px)`，畫面幾乎不可見。
- 滑鼠移入 PiP 視窗（`mouseenter`）：立即清晰顯示影片。
- 滑鼠移出（`mouseleave`）：立即恢復隱形狀態；若瀏覽器漏發離開事件，滑鼠不在視窗上或停止移動超過 3 秒也會自動變暗。
- 關閉 PiP 視窗時，影片會自動搬回原本網頁的位置。

## 檔案結構

```
TouchFishPiP/
├── manifest.json   # MV3 設定檔
├── background.js   # 工具列 icon：跨 frame 選片、跨分頁關閉 PiP
├── content.js      # 選片、控制 Document PiP 邏輯
├── content.css     # 佔位區塊樣式
└── pip.css         # Document PiP 視窗內容的樣式（隱形 / 懸停顯示）
```

## 安裝方式（載入未封裝的擴充功能）

1. 開啟 Chrome，網址列輸入 `chrome://extensions`。
2. 開啟右上角「開發人員模式」(Developer mode)。
3. 點擊「載入未封裝項目」(Load unpacked)。
4. 選擇本專案資料夾 `TouchFishPiP`（包含 `manifest.json` 的那層）。
5. 確認擴充功能已啟用。

## 使用方式

1. 前往任何有 `<video>` 的網頁（例如影音串流網站）。
2. 點擊工具列的擴充功能 icon，瀏覽器會彈出一個新的 Document PiP 小視窗。
3. 該視窗預設幾乎全黑 / 模糊，看起來像空白小視窗。
4. 把滑鼠移到該視窗內，影片才會清晰播放；移出滑鼠立即恢復隱形。
5. 再按一次工具列 icon（任何分頁皆可）或關閉 PiP 視窗，影片會自動回到原本網頁位置繼續播放。

## 需求與限制

- 需要 **Chrome 116 以上版本**（Document Picture-in-Picture API 才可用）。
- 使用 `storage` 權限（僅記錄目前 PiP 屬於哪個分頁，供跨分頁關閉使用），不會產生額外安裝警告。
- 部分網站可能透過 Permissions-Policy 停用 `document-picture-in-picture`，此時該站點無法使用本功能。
- 跨來源 `<iframe>` 中的影片可能因瀏覽器安全限制而無法被搬移。
- 影片被搬入 PiP 視窗後會脫離原本的播放器容器，若該網站的播放器有複雜的自訂控制列（例如會持續監控 DOM 結構），可能需要改用 `<video controls>` 原生控制列（本專案未強制加上 `controls`，可依需求自行在 `content.js` 中加入 `video.controls = true;`）。
- 若要讓影片一開始就有原生播放控制列，可在 `content.js` 的 `activateStealthPiP` 內，於 `video.classList.add('touchfish-pip-video');` 後加上 `video.controls = true;`。
