// 工具列按鈕：用 executeScript 同步觸發，才能保留使用者手勢供 requestWindow() 使用
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        if (window.__touchfishToggleFromAction) window.__touchfishToggleFromAction();
      },
    });
  } catch {
    // 分頁沒有注入 content script（例如 chrome:// 頁面），忽略即可
  }
});
