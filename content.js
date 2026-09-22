// TouchFishPiP：偵測頁面上的 <video>，並提供將其移入 Stealth Document PiP 視窗的按鈕
(() => {
  if (window.__touchfishPipInjected) return;
  window.__touchfishPipInjected = true;

  const buttonMap = new WeakMap(); // video -> 觸發按鈕
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

  function makeButton(video) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'touchfish-pip-btn';
    btn.textContent = '🐟';
    btn.title = '開啟摸魚隱形畫中畫';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateStealthPiP(video).catch((err) => {
        console.error('[TouchFishPiP]', err);
        alert('無法開啟摸魚畫中畫：' + err.message);
      });
    });
    document.body.appendChild(btn);
    return btn;
  }

  function isVideoVisible(video) {
    const rect = video.getBoundingClientRect();
    return (
      rect.width > 40 &&
      rect.height > 40 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  function updateButtonPosition(video, btn) {
    if (video === state.activeVideo) {
      btn.style.display = 'none';
      return;
    }
    if (!isVideoVisible(video)) {
      btn.style.display = 'none';
      return;
    }
    const rect = video.getBoundingClientRect();
    btn.style.display = 'flex';
    btn.style.top = `${Math.max(rect.top, 0) + 6}px`;
    btn.style.left = `${Math.max(rect.left, 0) + 6}px`;
  }

  // 工具列按鈕觸發時選片：優先挑正在播放的影片，其次選畫面最大的可視影片
  function pickBestVideo() {
    const candidates = Array.from(document.querySelectorAll('video')).filter(isVideoVisible);
    if (candidates.length === 0) return null;

    const area = (v) => {
      const r = v.getBoundingClientRect();
      return r.width * r.height;
    };

    const playing = candidates.filter((v) => !v.paused && !v.ended);
    const pool = playing.length > 0 ? playing : candidates;
    return pool.reduce((best, v) => (area(v) > area(best) ? v : best), pool[0]);
  }

  function trackVideo(video) {
    if (buttonMap.has(video)) return;
    buttonMap.set(video, makeButton(video));
  }

  function scanVideos() {
    document.querySelectorAll('video').forEach(trackVideo);
  }

  function refreshPositions() {
    document.querySelectorAll('video').forEach((video) => {
      const btn = buttonMap.get(video);
      if (btn) updateButtonPosition(video, btn);
    });
  }

  // 用 rAF 合併同一畫面更新週期內的多次觸發，避免捲動/DOM 變動時重複計算
  function throttleToFrame(fn) {
    let scheduled = false;
    return () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn();
      });
    };
  }

  const scheduleScanVideos = throttleToFrame(scanVideos);
  const scheduleRefreshPositions = throttleToFrame(refreshPositions);

  scanVideos();
  const observer = new MutationObserver(scheduleScanVideos);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // capture: true 讓任何內層可捲動容器的 scroll 事件也會在冒泡前經過 window
  window.addEventListener('scroll', scheduleRefreshPositions, { passive: true, capture: true });
  window.addEventListener('resize', scheduleRefreshPositions, { passive: true });
  setInterval(scheduleRefreshPositions, 2000); // 保底刷新，避免動態版面遺漏（頻率降低以減少背景負擔）

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

    const btn = buttonMap.get(video);
    if (btn) btn.style.display = 'none';

    const setActive = (isActive) => {
      pipWindow.document.body.classList.toggle('touchfish-pip-active', isActive);
    };

    pipWindow.document.body.addEventListener('mouseenter', () => setActive(true));
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

    refreshPositions();
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
})();
