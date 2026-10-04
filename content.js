// TouchFishPiP：由工具列 icon 觸發，將頁面上的 <video> 移入 Stealth Document PiP 視窗
(() => {
  if (window.__touchfishPipInjected) return;
  window.__touchfishPipInjected = true;

  const state = {
    pipWindow: null,
    activeVideo: null,
    originalParent: null,
    originalNextSibling: null,
    placeholder: null,
    originalInlineStyle: null,
    originalWidthAttr: null,
    originalHeightAttr: null,
    videoPlayHandler: null,
    videoPauseHandler: null,
  };

  function videoArea(video) {
    const r = video.getBoundingClientRect();
    return r.width * r.height;
  }

  function isVideoPlaying(video) {
    return !video.paused && !video.ended && video.readyState > 2;
  }

  // 有實際渲染尺寸即可（不要求在視窗內，播放中但已捲出畫面的影片仍是候選）
  function isVideoRendered(video) {
    const r = video.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }

  // 選片順序：1. 正在播放的影片 > 2. 網頁中畫面最大的影片
  function pickBestVideo() {
    let best = null;
    let bestPlaying = false;
    let bestArea = 0;
    document.querySelectorAll('video').forEach((v) => {
      if (!isVideoRendered(v)) return;
      const playing = isVideoPlaying(v);
      const area = videoArea(v);
      if (!best || (playing && !bestPlaying) || (playing === bestPlaying && area > bestArea)) {
        best = v;
        bestPlaying = playing;
        bestArea = area;
      }
    });
    return best;
  }

  // 供 background.js 跨 frame 比較：回報本 frame 的最佳候選與 PiP 是否已開啟
  function getVideoCandidate() {
    const active = !!(state.pipWindow && !state.pipWindow.closed);
    const video = pickBestVideo();
    if (!video && !active) return null;
    return {
      active,
      playing: video ? isVideoPlaying(video) : false,
      area: video ? videoArea(video) : 0,
    };
  }

  async function activateStealthPiP(video) {
    if (!('documentPictureInPicture' in window)) {
      throw new Error(
        '目前瀏覽器不支援 Document Picture-in-Picture API，請使用 Chrome 116 以上版本。'
      );
    }
    if (state.pipWindow && !state.pipWindow.closed) {
      state.pipWindow.focus();
      return;
    }

    const rect = video.getBoundingClientRect();
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: Math.max(Math.round(rect.width) || 0, 240),
      height: Math.max(Math.round(rect.height) || 0, 135),
    });

    state.pipWindow = pipWindow;
    state.activeVideo = video;
    state.originalParent = video.parentNode;
    state.originalNextSibling = video.nextSibling;

    // 部分播放器會用 inline style/屬性鎖定影片像素尺寸，先存起來清掉，
    // 讓 pip.css 的 100% 規則生效，PiP 視窗縮放時影片才會跟著變
    state.originalInlineStyle = video.getAttribute('style');
    state.originalWidthAttr = video.getAttribute('width');
    state.originalHeightAttr = video.getAttribute('height');
    video.style.width = '';
    video.style.height = '';
    video.removeAttribute('width');
    video.removeAttribute('height');

    const placeholder = document.createElement('div');
    placeholder.className = 'touchfish-pip-placeholder';
    placeholder.style.width = `${rect.width || 320}px`;
    placeholder.style.height = `${rect.height || 180}px`;
    placeholder.textContent = '🐟 影片正在摸魚視窗中播放…';
    state.originalParent.insertBefore(placeholder, video);
    state.placeholder = placeholder;

    // PiP 視窗一開始是空白文件，需自行載入樣式與內容
    const link = pipWindow.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('pip.css');
    pipWindow.document.head.appendChild(link);
    pipWindow.document.title = '摸魚中…';

    const hint = pipWindow.document.createElement('div');
    hint.className = 'touchfish-pip-hint';
    hint.textContent = '滑鼠移入顯示影片';
    pipWindow.document.body.appendChild(hint);

    const controls = pipWindow.document.createElement('div');
    controls.className = 'touchfish-pip-controls';

    const rewindBtn = pipWindow.document.createElement('button');
    rewindBtn.type = 'button';
    rewindBtn.className = 'touchfish-pip-ctrl-btn';
    rewindBtn.title = '倒轉 10 秒';
    rewindBtn.innerHTML =
      '<svg class="touchfish-pip-icon touchfish-pip-icon-mirror" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"></path><polyline points="21 4 21 9 16 9"></polyline></svg>' +
      '<span class="touchfish-pip-ctrl-label">10</span>';
    rewindBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      video.currentTime = Math.max(0, video.currentTime - 10);
    });

    const toggleBtn = pipWindow.document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'touchfish-pip-ctrl-btn touchfish-pip-toggle-btn';
    toggleBtn.title = '播放／暫停';
    toggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (video.paused) video.play();
      else video.pause();
    });

    const forwardBtn = pipWindow.document.createElement('button');
    forwardBtn.type = 'button';
    forwardBtn.className = 'touchfish-pip-ctrl-btn';
    forwardBtn.title = '快轉 10 秒';
    forwardBtn.innerHTML =
      '<svg class="touchfish-pip-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"></path><polyline points="21 4 21 9 16 9"></polyline></svg>' +
      '<span class="touchfish-pip-ctrl-label">10</span>';
    forwardBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const max = Number.isFinite(video.duration) ? video.duration : Infinity;
      video.currentTime = Math.min(max, video.currentTime + 10);
    });

    controls.append(rewindBtn, toggleBtn, forwardBtn);
    pipWindow.document.body.appendChild(controls);

    // 依 video 實際播放狀態同步按鈕圖示，而非只看點擊當下的狀態
    const playIcon =
      '<svg class="touchfish-pip-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
    const pauseIcon =
      '<svg class="touchfish-pip-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>';
    const updateToggleBtn = () => {
      toggleBtn.innerHTML = video.paused ? playIcon : pauseIcon;
    };
    updateToggleBtn();
    video.addEventListener('play', updateToggleBtn);
    video.addEventListener('pause', updateToggleBtn);
    state.videoPlayHandler = updateToggleBtn;
    state.videoPauseHandler = updateToggleBtn;

    video.classList.add('touchfish-pip-video');
    pipWindow.document.body.appendChild(video); // 將真實 video 節點搬進 PiP 文件

    const IDLE_DIM_MS = 3000;
    let lastMoveAt = 0;
    let watchdog = null;

    // 離開事件可能漏發，變亮期間輪詢 :hover 與滑鼠閒置時間作為保險
    const setActive = (isActive) => {
      pipWindow.document.body.classList.toggle('touchfish-pip-active', isActive);
      if (isActive && watchdog === null) {
        watchdog = setInterval(() => {
          const hovering = pipWindow.document.body.matches(':hover');
          if (!hovering || Date.now() - lastMoveAt > IDLE_DIM_MS) setActive(false);
        }, 300);
      } else if (!isActive && watchdog !== null) {
        clearInterval(watchdog);
        watchdog = null;
      }
    };

    pipWindow.document.addEventListener('mousemove', () => {
      lastMoveAt = Date.now();
      setActive(true);
    });
    pipWindow.addEventListener('pagehide', () => setActive(false), { once: true });
    pipWindow.document.body.addEventListener('mouseenter', () => {
      lastMoveAt = Date.now();
      setActive(true);
    });
    pipWindow.document.body.addEventListener('mouseleave', () => setActive(false));
    // mouseleave 在無邊框浮動視窗上偶爾不會觸發（快速移出/視窗邊緣），
    // 用 relatedTarget 為 null 判斷滑鼠真正離開整份文件，作為補強
    pipWindow.document.addEventListener('mouseout', (event) => {
      if (!event.relatedTarget) setActive(false);
    });
    // 視窗失焦（例如被切走）時強制回到隱形狀態，符合預設隱形的安全預期
    pipWindow.addEventListener('blur', () => setActive(false));

    // 使用者關閉 PiP 視窗（或返回分頁）時，把影片搬回原頁面
    pipWindow.addEventListener('pagehide', () => restoreVideo(), { once: true });

    // 通知 background 目前 PiP 屬於哪個分頁/frame，讓使用者在其他分頁按 icon 也能關閉
    notifyBackground('pip-opened');
  }

  function notifyBackground(type) {
    try {
      chrome.runtime.sendMessage({ type }).catch(() => {});
    } catch {
      // 擴充功能重新載入後 context 失效，忽略
    }
  }

  // 其他分頁按下工具列 icon 時，由 background 轉送關閉指令
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'close-pip' && state.pipWindow && !state.pipWindow.closed) {
      state.pipWindow.close(); // 觸發 pagehide -> restoreVideo()
      sendResponse(true);
    }
  });

  // 跨文件搬回後畫面層可能沒接上（聲音照常，重排與 seek 都無效），重新插入節點才會重建
  function refreshVideoRendering(video) {
    const wasPlaying = !video.paused;
    setTimeout(() => {
      const parent = video.parentNode;
      if (!parent) return;
      parent.insertBefore(video, video.nextSibling);
      // 移除再插入可能觸發暫停，補回播放狀態
      if (wasPlaying && video.paused) video.play().catch(() => {});
    }, 100);
  }

  function restoreVideo() {
    const { activeVideo, originalParent, originalNextSibling, placeholder } = state;
    if (!activeVideo) return;

    activeVideo.classList.remove('touchfish-pip-video');

    if (state.videoPlayHandler) activeVideo.removeEventListener('play', state.videoPlayHandler);
    if (state.videoPauseHandler) activeVideo.removeEventListener('pause', state.videoPauseHandler);

    // 把搬移前存下的 inline 尺寸樣式/屬性寫回去，避免搬回原頁面後版面跑掉
    if (state.originalInlineStyle === null) {
      activeVideo.removeAttribute('style');
    } else {
      activeVideo.setAttribute('style', state.originalInlineStyle);
    }
    if (state.originalWidthAttr === null) {
      activeVideo.removeAttribute('width');
    } else {
      activeVideo.setAttribute('width', state.originalWidthAttr);
    }
    if (state.originalHeightAttr === null) {
      activeVideo.removeAttribute('height');
    } else {
      activeVideo.setAttribute('height', state.originalHeightAttr);
    }

    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(activeVideo, placeholder);
    } else if (originalParent) {
      try {
        originalParent.insertBefore(activeVideo, originalNextSibling);
      } catch {
        originalParent.appendChild(activeVideo);
      }
    }

    refreshVideoRendering(activeVideo);

    state.pipWindow = null;
    state.activeVideo = null;
    state.originalParent = null;
    state.originalNextSibling = null;
    state.placeholder = null;
    state.originalInlineStyle = null;
    state.originalWidthAttr = null;
    state.originalHeightAttr = null;
    state.videoPlayHandler = null;
    state.videoPauseHandler = null;

    notifyBackground('pip-closed');
  }

  function handleToolbarToggle() {
    if (state.pipWindow && !state.pipWindow.closed) {
      state.pipWindow.close(); // 觸發 pagehide -> restoreVideo()
      return;
    }

    const video = pickBestVideo();
    if (!video) return; // 這個 frame 沒有可用影片，不處理

    activateStealthPiP(video).catch((err) => {
      console.error('[TouchFishPiP]', err);
    });
  }

  // requestWindow() 需要使用者手勢，chrome.tabs.sendMessage 是非同步訊息會讓手勢流失，
  // 改由 background.js 用 chrome.scripting.executeScript 同步呼叫這個掛在 window 上的函式
  window.__touchfishToggleFromAction = handleToolbarToggle;
  window.__touchfishGetCandidate = getVideoCandidate;
})();
