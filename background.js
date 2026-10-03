// 記錄目前 PiP 屬於哪個分頁/frame；service worker 會被回收，因此存在 storage.session
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || sender.tab?.id == null) return;
  if (message.type === 'pip-opened') {
    chrome.storage.session.set({ pipOwner: { tabId: sender.tab.id, frameId: sender.frameId } });
  } else if (message.type === 'pip-closed') {
    chrome.storage.session.get('pipOwner').then(({ pipOwner }) => {
      if (pipOwner && pipOwner.tabId === sender.tab.id && pipOwner.frameId === sender.frameId) {
        chrome.storage.session.remove('pipOwner');
      }
    });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { pipOwner } = await chrome.storage.session.get('pipOwner');
  if (pipOwner && pipOwner.tabId === tabId) chrome.storage.session.remove('pipOwner');
});

// 對方沒回應 true 代表記錄已過期（例如該頁重新整理），清除後回傳 false
async function closePipInOtherTab(currentTabId, pipOwner) {
  if (!pipOwner || pipOwner.tabId === currentTabId) return false;
  try {
    const closed = await chrome.tabs.sendMessage(
      pipOwner.tabId,
      { type: 'close-pip' },
      { frameId: pipOwner.frameId }
    );
    if (closed === true) return true;
  } catch {
    // 分頁已不存在或 content script 已失效
  }
  await chrome.storage.session.remove('pipOwner');
  return false;
}

// 工具列按鈕：先跨 frame 收集候選影片，依「播放中 > 畫面最大」選出 frame，
// 再只對該 frame 同步觸發（requestWindow() 需要使用者手勢）
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;
  try {
    // 第一個 API 呼叫要在手勢內立刻送出，前面不能 await 其他東西
    const collecting = chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => (window.__touchfishGetCandidate ? window.__touchfishGetCandidate() : null),
      })
      .catch(() => []);
    const [results, { pipOwner }] = await Promise.all([
      collecting,
      chrome.storage.session.get('pipOwner'),
    ]);
    if (await closePipInOtherTab(tab.id, pipOwner)) return;

    let best = null;
    for (const { frameId, result } of results) {
      if (!result) continue;
      // PiP 已開啟的 frame 優先，讓再次點擊能關閉它
      if (result.active) {
        best = { frameId, result };
        break;
      }
      if (
        !best ||
        (result.playing && !best.result.playing) ||
        (result.playing === best.result.playing && result.area > best.result.area)
      ) {
        best = { frameId, result };
      }
    }
    if (!best) return;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [best.frameId] },
      func: () => {
        if (window.__touchfishToggleFromAction) window.__touchfishToggleFromAction();
      },
    });
  } catch {
    // 分頁沒有注入 content script（例如 chrome:// 頁面），忽略即可
  }
});
