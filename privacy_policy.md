# Privacy Policy for TouchFishPiP (摸魚畫中畫 隱私權政策)

*Last updated: September 22, 2026*  
*最後更新日期：2026 年 9 月 22 日*

---

## English Version

### 1. Overview
**TouchFishPiP** is an open-source browser extension designed to move web video elements into an independent Document Picture-in-Picture window for stealthy viewing. We take your privacy very seriously. This Privacy Policy explains our practices regarding data collection, usage, and permissions.

### 2. Information Collection and Storage
- **No Personal Data Collected:** TouchFishPiP does **NOT** collect, store, track, or share any personal identifiable information (PII), browsing history, search queries, cookies, or website content.
- **No Telemetry or Analytics:** The extension does not include any third-party tracking scripts, analytics libraries, or advertising networks.
- **Local Operation Only:** All features run strictly within your local browser environment. No user data is ever transmitted to external servers.

### 3. Permissions Justification
The extension requests only the minimum permissions necessary to deliver its core functionality:
- **`activeTab` & `scripting`:** Used to run a lightweight script when clicking the browser toolbar action icon. This preserves the necessary user gesture required by the browser's Document Picture-in-Picture API (`window.documentPictureInPicture.requestWindow()`).
- **`<all_urls>` (Host Permissions):** Required for the content script to detect standard HTML5 `<video>` elements across various websites and attach the floating trigger button locally. The extension does not read, modify, or exfiltrate any other page data.

### 4. Third-Party Websites and Services
TouchFishPiP operates on websites you visit that contain HTML5 video players. The extension does not alter how these websites process your data, and their respective privacy policies govern your interactions with those services.

### 5. Changes to This Policy
We may update this Privacy Policy from time to time. Any changes will be posted in this repository with an updated revision date.

### 6. Contact Us
If you have any questions, suggestions, or concerns regarding this Privacy Policy, please submit an issue on the project's GitHub repository or contact the developer directly.

---

## 中文版（繁體中文）

### 1. 簡介
**TouchFishPiP（摸魚畫中畫）** 是一款開源瀏覽器擴充功能，旨在將網頁中的影片節點移至獨立的 Document Picture-in-Picture 視窗中播放，提供低調觀看體驗。我們極為重視您的隱私，本政策旨在向您說明本擴充功能如何處理使用者資料與權限。

### 2. 資料收集與儲存
- **不收集任何個人資料：** TouchFishPiP **不會**收集、記錄、追蹤、儲存或分享任何個人識別資訊（PII）、瀏覽歷程記錄、搜尋歷史、Cookie 或存取的網頁內容。
- **無追蹤與遙測服務：** 本擴充功能不包含任何第三方數據分析工具（如 Google Analytics）、追蹤代碼或廣告模組。
- **純本機端執行：** 所有邏輯皆在您本機的瀏覽器環境中執行，絕不會將任何資料或訊號傳送至外部伺服器。

### 3. 權限使用說明
本擴充功能僅申請實現核心功能所必需的最低權限：
- **`activeTab` 與 `scripting`：** 當您點擊瀏覽器工具列上的外掛圖示時，擴充功能需透過腳本在當前分頁同步觸發開關，藉此保留瀏覽器 Document Picture-in-Picture API (`window.documentPictureInPicture.requestWindow()`) 所嚴格要求的使用者手勢（User Gesture）。
- **`<all_urls>`（全域主機權限）：** 用於在您造訪的各類影音網站中，由 Content Script 自動偵測標準 HTML5 `<video>` 標籤，並於影片角落掛載浮動啟動按鈕。本擴充功能不會讀取、修改或洩露其他網頁內容。

### 4. 第三方網站與服務
TouchFishPiP 僅在您造訪含有影片的第三方網站時提供畫中畫輔助功能。本擴充功能不會影響第三方網站處理您資料的方式，您造訪該等網站時仍受其各自的隱私權政策規範。

### 5. 政策修訂
本隱私權政策可能會隨外掛更新而調整。任何修改皆會更新於本專案儲存庫，並標註最新修訂日期。

### 6. 聯絡方式
若您對本隱私權政策有任何疑問、建議或需要進一步說明，歡迎透過 GitHub Repository 提交 Issue 或與開發者聯繫。