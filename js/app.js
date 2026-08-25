(function () {
  const STUDENTS = [
    "김민준", "이서연", "박도윤", "최하은", "정시우", "한지호",
    "윤서아", "강예준", "조하린", "신유나", "장민서", "임지안",
    "오지훈", "배수아", "송하준", "권서윤", "황도현", "안채원",
    "문지후", "백소율", "남하람", "홍은우", "양서진", "고민재"
  ];

  const TOC = [
    { page: 1, title: "이번 시간에 배울 내용" },
    { page: 2, title: "다각형 만들기" },
    { page: 3, title: "주어진 다각형을 만들어 보세요" },
    { page: 4, title: "나만의 모양 만들기" },
    { page: 5, title: "다음 시간에는" }
  ];
  const LEVEL_META = {
    green: { label: "성취 상" },
    yellow: { label: "성취 중" },
    red: { label: "성취 하" }
  };
  (function assignLevels() {
    const colors = ["green", "yellow", "red", "green", "yellow"];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    TOC.forEach((item, i) => { item.level = colors[i]; });
  })();

  const state = {
    page: 3,
    zoom: 100,
    classSeconds: 11,
    locked: false,
    sharing: false,
    annotating: false,
    drawTool: "polygon",
    timerTotal: 300,
    timerLeft: 300,
    timerRunning: false,
    pickedOut: new Set()
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  const backdrop = $("#backdrop");
  const panels = {
    toc: $("#panelToc"),
    ai: $("#panelAi"),
    monitor: $("#panelMonitor"),
    toolkit: $("#panelToolkit"),
    scoreboard: $("#panelScoreboard"),
    seats: $("#panelSeats"),
    sfx: $("#panelSfx"),
    boardwrite: $("#panelBoardwrite"),
    game: $("#panelGame"),
    report: $("#panelReport"),
    end: $("#panelEnd"),
    logout: $("#panelLogout"),
    back: $("#panelBack")
  };

  function closeStudentZoom() {
    $("#studentZoom")?.classList.remove("show");
  }

  function closeAll() {
    closeStudentZoom();
    Object.values(panels).forEach((el) => el.classList.remove("show"));
    backdrop.classList.remove("show");
    document.body.classList.remove("ai-open");
    closeGameMenu();
    $$(".foot-btn").forEach((b) => b.classList.remove("on"));
    document.querySelector('[data-feature="monitor"]')?.classList.remove("active");
    const svgEl = document.getElementById("shapeSvg");
    if (svgEl) svgEl.style.pointerEvents = "none";
    document.getElementById("drawCanvas")?.classList.remove("drawing");
  }

  function openPanel(key) {
    closeAll();
    const el = panels[key];
    if (!el) return;
    el.classList.add("show");
    if (key !== "toc" && key !== "monitor") backdrop.classList.add("show");
    if (key === "monitor") document.querySelector('[data-feature="monitor"]')?.classList.add("active");
    const kitKeys = ["scoreboard", "seats", "sfx", "boardwrite", "toolkit"];
    const btn = document.querySelector(`.foot-btn[data-feature="${kitKeys.includes(key) ? "toolkit" : key}"]`);
    if (btn) btn.classList.add("on");
  }

  const KIT_SUB = ["scoreboard", "seats", "sfx", "boardwrite"];
  function kitSubOpen() {
    return KIT_SUB.find((k) => panels[k]?.classList.contains("show"));
  }
  function backToToolkit() {
    openPanel("toolkit");
  }

  backdrop.addEventListener("click", () => {
    if (kitSubOpen()) backToToolkit();
    else closeAll();
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-kit-back]")) {
      backToToolkit();
      return;
    }
    if (e.target.closest("[data-close]")) closeAll();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#studentZoom")?.classList.contains("show")) {
      closeStudentZoom();
      return;
    }
    if (kitSubOpen()) {
      backToToolkit();
      return;
    }
    closeAll();
  });

  /* Class timer */
  function fmt(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
  setInterval(() => {
    state.classSeconds += 1;
    $("#classTimer").textContent = fmt(state.classSeconds);
    const rep = $("#repTime");
    if (rep) rep.textContent = fmt(state.classSeconds);
  }, 1000);

  /* Pages */
  function renderPage() {
    $$(".page").forEach((p) => p.classList.toggle("active", Number(p.dataset.page) === state.page));
    $("#pageNow").textContent = state.page;
    $("#prevPage").disabled = state.page <= 1;
    $("#nextPage").disabled = state.page >= 5;
    renderToc();
  }
  $("#prevPage").addEventListener("click", () => {
    if (state.page > 1) { state.page -= 1; renderPage(); }
  });
  $("#nextPage").addEventListener("click", () => {
    if (state.page < 5) { state.page += 1; renderPage(); }
  });
  document.getElementById("slide2Next")?.addEventListener("click", () => {
    state.page = 3; renderPage();
  });
  document.getElementById("composeReset")?.addEventListener("click", () => {
    const ta = document.getElementById("composeText");
    if (ta) ta.value = "";
    toast("입력을 지웠습니다.");
  });
  document.getElementById("composeSend")?.addEventListener("click", () => {
    toast("친구들에게 설명을 보냈습니다.");
  });

  function tocThumb(page) {
    return `<div class="toc-thumb"><img src="slides/slide${page}.png" alt="${page}쪽"></div>`;
  }

  function tocCard(page) {
    const item = TOC.find((t) => t.page === page);
    const meta = LEVEL_META[item.level];
    return `<div class="toc-row">
      <span class="toc-level ${item.level}" title="${meta.label}"></span>
      <button class="toc-card ${page === state.page ? "current" : ""}" data-go="${page}">
        ${tocThumb(page)}
        <span class="toc-caption">${item.title}</span>
      </button>
    </div>`;
  }

  function renderToc() {
    const sections = [
      { name: "들어가기", pages: [1] },
      { name: "학습하기", pages: [2, 3, 4] },
      { name: "정리하기", pages: [5] }
    ];
    $("#tocList").innerHTML = sections.map((sec) => `
      <section class="toc-section">
        <div class="toc-section-title"><i></i>${sec.name}</div>
        ${sec.pages.map(tocCard).join("")}
      </section>
    `).join("");
  }
  $("#tocList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go]");
    if (!btn) return;
    state.page = Number(btn.dataset.go);
    renderPage();
  });

  /* Zoom */
  function applyZoom() {
    $("#zoomValue").textContent = `${state.zoom} %`;
    $("#board").style.transform = `scale(${state.zoom / 100})`;
  }
  $("#zoomIn").addEventListener("click", () => {
    state.zoom = Math.min(150, state.zoom + 10);
    applyZoom();
  });
  $("#zoomOut").addEventListener("click", () => {
    state.zoom = Math.max(70, state.zoom - 10);
    applyZoom();
  });

  /* Feature buttons */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-feature]");
    if (!btn) return;
    const f = btn.dataset.feature;
    if (f === "lock") toggleLock();
    else if (f === "share") toggleShare();
    else if (f === "annotate") toggleAnno();
    else if (f === "monitor") {
      if (panels.monitor.classList.contains("show")) closeAll();
      else { renderStudents(); openPanel("monitor"); }
    }
    else if (f === "toolkit") openPanel("toolkit");
    else if (f === "game") openPanel("game");
    else if (f === "ai") openPanel("ai");
    else if (f === "toc") {
      if (panels.toc.classList.contains("show")) closeAll();
      else openPanel("toc");
    }
    else if (f === "report") openPanel("report");
    else if (f === "end") openPanel("end");
    else if (f === "logout") openPanel("logout");
    else if (f === "back") openPanel("back");
  });

  function toggleLock() {
    state.locked = !state.locked;
    $("#btnLock").classList.toggle("active", state.locked);
    toast(state.locked
      ? "학생이 화면을 넘길 수 없도록 잠금 처리되었습니다."
      : "화면 잠금이 해제되었습니다.");
  }
  function toggleShare() {
    state.sharing = !state.sharing;
    $("#btnShare").classList.toggle("active", state.sharing);
    $("#shareBanner").classList.toggle("on", state.sharing);
    toast(state.sharing ? "교사 화면을 학생에게 보여주고 있습니다." : "화면 공유를 종료했습니다.");
  }
  function toggleAnno() {
    state.annotating = !state.annotating;
    $("#btnAnno").classList.toggle("active", state.annotating);
    $("#annoCanvas").classList.toggle("drawing", state.annotating);
    $("#annoBar").classList.toggle("show", state.annotating);
    $("#annoTexts").style.pointerEvents = state.annotating ? "auto" : "none";
    if (state.annotating) resizeAnno();
  }

  /* Students */
  const MONITOR_STUDENTS = [
    { name: "김민준", wait: false, help: false, slide: 5 },
    { name: "이서연", wait: false, help: false, slide: 3 },
    { name: "최하은", wait: false, help: true, slide: 4 },
    { name: "박도윤", wait: true, help: false },
    { name: "정시우", wait: true, help: false }
  ];
  const HAEUN_TEXT = "등대 모양을 만드는 데 사다리꼴, 정사각형, 삼각형을 사용했습니다.";
  const WAIT_MARK = `<div class="wait-mark">
    <svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12M6 20h12M8 4l3.5 7.5L8 20M16 4l-3.5 7.5L16 20" stroke="#b0b0b0" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>수업 입장 전</span>
  </div>`;
  const SPK = `<span class="spk" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 10v4h3l4 3V7L7 10H4zM16 9a4 4 0 010 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

  function composeNote(s) {
    if (s.name !== "최하은") return "";
    return `<p class="slide-compose-note">${HAEUN_TEXT}</p>`;
  }

  function slideMarkup(s) {
    return `<div class="mini-slide-wrap">
      <img class="mini-slide" src="slides/slide${s.slide}.png" alt="${s.slide}번 슬라이드">
      ${composeNote(s)}
    </div>`;
  }

  function renderStudents() {
    $("#studentGrid").innerHTML = MONITOR_STUDENTS.map((s) => {
      const inner = s.wait
        ? WAIT_MARK
        : `${slideMarkup(s)}${s.help ? '<span class="dot"></span>' : ""}${SPK}`;
      const status = s.wait ? "미접속" : s.help ? `도움 · ${s.slide}쪽` : `${s.slide}쪽`;
      return `<figure class="student-card ${s.wait ? "wait" : ""} ${s.help ? "help" : ""}" data-name="${s.name}">
        <div class="mini-screen${s.wait ? "" : " live"}">${inner}</div>
        <figcaption>${s.name}<em>${status}</em></figcaption>
      </figure>`;
    }).join("");
  }

  function openStudentZoom(s) {
    if (s.wait) {
      toast(`${s.name} 님은 아직 수업 입장 전입니다.`);
      return;
    }
    $("#zoomStudentName").textContent = `${s.name} · ${s.slide}쪽`;
    $("#zoomSlideFit").innerHTML = `
      <img src="slides/slide${s.slide}.png" alt="${s.slide}번 슬라이드">
      ${composeNote(s)}`;
    $("#studentZoom").classList.add("show");
  }

  $("#muteAll")?.addEventListener("click", () => toast("모든 학생 소리를 껐습니다."));
  $("#openMonitorWin")?.addEventListener("click", () => toast("새 창에서 모니터링을 열었습니다. (데모)"));
  $("#studentGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".student-card");
    if (!card) return;
    const s = MONITOR_STUDENTS.find((x) => x.name === card.dataset.name);
    if (s) openStudentZoom(s);
  });
  $("#studentZoom")?.addEventListener("click", (e) => {
    if (e.target.id === "studentZoom" || e.target.closest("[data-zoom-close]")) closeStudentZoom();
  });

  /* Toolkit */
  $$("[data-kit]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.kitPanel) openPanel(b.dataset.kitPanel);
    else toast(`${b.dataset.kit}를 열었습니다. (데모)`);
  }));
  $("#toolkitPopout")?.addEventListener("click", () => toast("새 창에서 툴킷을 열었습니다. (데모)"));
  $("#toolkitMaximize")?.addEventListener("click", () => toast("툴킷 창을 크게 펼쳤습니다. (데모)"));
  document.addEventListener("click", (e) => {
    const op = e.target.closest("[data-kit-msg]");
    if (op) toast(op.dataset.kitMsg);
    const sw = e.target.closest("[data-switch]");
    if (sw) sw.classList.toggle("on");
    const tab = e.target.closest("[data-tabs] button");
    if (tab) {
      tab.parentElement.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      tab.classList.add("on");
    }
  });
  const scoreInit = [1, 1, 1, 0];
  $$("[data-score]").forEach((cell, i) => {
    cell.dataset.init = String(scoreInit[i]);
    cell.addEventListener("click", () => {
      cell.textContent = String(Number(cell.textContent) + 1);
    });
  });
  $("#scoreReset")?.addEventListener("click", () => {
    $$("[data-score]").forEach((cell) => { cell.textContent = cell.dataset.init; });
    toast("점수판을 초기화했습니다.");
  });
  $("#seatLayouts")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $$("#seatLayouts button").forEach((x) => x.classList.remove("on"));
    btn.classList.add("on");
  });
  $("#seatSave")?.addEventListener("click", () => {
    toast("자리바꾸기 설정을 저장했습니다.");
    backToToolkit();
  });

  const BGM = [
    { name: "비제: 아를르의 여인 모음곡 2번 - 3악장", dur: "4:05" },
    { name: "생상스: 동물의 사육제 - 백조", dur: "3:12" },
    { name: "모차르트: 아이네 클라이네 나흐트뮤직", dur: "5:40" },
    { name: "비발디: 사계 - 봄", dur: "3:28" },
    { name: "교실 정리 음악", dur: "2:15" }
  ];
  const SFX = [
    { name: "집중용 띵!", dur: "0:02" },
    { name: "방귀 뿡뿡", dur: "0:03" },
    { name: "학교 종소리", dur: "0:04" },
    { name: "띵동~", dur: "0:02" },
    { name: "박수", dur: "0:03" },
    { name: "정답!", dur: "0:02" }
  ];
  const bgmList = $("#bgmList");
  if (bgmList) {
    bgmList.innerHTML = BGM.map((t) => `<li>
      <button type="button" class="sfx-play" data-play="${t.name}">▶</button>
      <span>${t.name}</span>
      <span class="dur">${t.dur}</span>
      <span>☆</span>
    </li>`).join("");
  }
  const sfxCards = $("#sfxCards");
  if (sfxCards) {
    sfxCards.innerHTML = SFX.map((t) => `<button type="button" class="sfx-card" data-play="${t.name}">
      <b>${t.name}</b><span>☆</span>
      <span class="sfx-play">▶</span>
      <span class="dur">${t.dur}</span>
    </button>`).join("");
  }
  document.addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    if (play) toast(`${play.dataset.play} 재생 (데모)`);
    const sfxTab = e.target.closest("[data-sfx-tab]");
    if (sfxTab) {
      $$("[data-sfx-tab]").forEach((x) => x.classList.remove("on"));
      sfxTab.classList.add("on");
      const box = $("#panelSfx");
      box.classList.remove("is-bgm", "is-fx");
      if (sfxTab.dataset.sfxTab === "bgm") box.classList.add("is-bgm");
      if (sfxTab.dataset.sfxTab === "fx") box.classList.add("is-fx");
    }
  });
  const boardWrite = $("#boardWrite");
  const boardCount = $("#boardCount");
  function updateBoardCount() {
    if (!boardWrite || !boardCount) return;
    const n = (boardWrite.innerText || "").replace(/\n/g, "").length;
    boardCount.textContent = `${Math.min(n, 10000)}/10000`;
  }
  boardWrite?.addEventListener("input", updateBoardCount);
  $("#boardFontSize")?.addEventListener("change", (e) => {
    if (boardWrite) boardWrite.style.fontSize = e.target.value;
  });
  $$(".board-toolbar [data-cmd]").forEach((b) => b.addEventListener("click", () => {
    document.execCommand(b.dataset.cmd, false, null);
    boardWrite?.focus();
  }));

  /* Game */
  const gameMenu = $("#gameUnitMenu");
  function closeGameMenu() {
    if (!gameMenu) return;
    gameMenu.hidden = true;
    $("#gameUnit")?.setAttribute("aria-expanded", "false");
  }
  $("#gameSwitch")?.addEventListener("click", () => {
    const on = $("#gameSwitch").classList.toggle("on");
    $("#gameToggleWrap")?.classList.toggle("is-on", on);
    $("#gameSwitch").setAttribute("aria-pressed", String(on));
    toast(on ? "학생에게 수학 게임이 활성화되었습니다." : "수학 게임을 비활성화했습니다.");
  });
  $("#gameUnit")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = gameMenu.hidden;
    gameMenu.hidden = !open;
    $("#gameUnit").setAttribute("aria-expanded", String(open));
  });
  gameMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
    const item = e.target.closest("[data-unit]");
    if (!item) return;
    $$("[data-unit]", gameMenu).forEach((b) => b.classList.toggle("on", b === item));
    $("#gameUnitLabel").textContent = item.dataset.unit;
    $$(".game-card > span").forEach((s) => { s.textContent = item.dataset.unit; });
    closeGameMenu();
  });
  document.addEventListener("click", closeGameMenu);
  $$("[data-game]").forEach((b) => b.addEventListener("click", () => {
    toast(`${b.dataset.game}을 실행합니다. (데모)`);
  }));

  /* Report / end / logout */
  $("#reportSend").addEventListener("click", () => {
    closeAll();
    toast("오류 신고가 접수되었습니다. 감사합니다.");
  });
  $("#endConfirm").addEventListener("click", () => {
    closeAll();
    toast("수업이 저장되고 종료되었습니다. (데모)");
  });
  $("#logoutConfirm").addEventListener("click", () => {
    closeAll();
    toast("로그아웃되었습니다. 수업 상태는 저장되어 있습니다.");
  });

  /* Annotation canvas */
  const annoCanvas = $("#annoCanvas");
  const annoCtx = annoCanvas.getContext("2d");
  const annoState = {
    tool: "pen",
    sizes: [3, 6, 12],
    sizeIdx: 1,
    drawing: false,
    last: null,
    undo: [],
    redo: []
  };
  function annoPos(e) {
    const r = annoCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (annoCanvas.width / r.width), y: (e.clientY - r.top) * (annoCanvas.height / r.height) };
  }
  function resizeAnno() {
    const r = annoCanvas.getBoundingClientRect();
    if (!r.width) return;
    let prev = null;
    try { prev = annoCtx.getImageData(0, 0, annoCanvas.width || 1, annoCanvas.height || 1); } catch (_) {}
    annoCanvas.width = Math.max(1, Math.floor(r.width));
    annoCanvas.height = Math.max(1, Math.floor(r.height));
    if (prev) { try { annoCtx.putImageData(prev, 0, 0); } catch (_) {} }
  }
  function annoSnap() {
    try {
      annoState.undo.push(annoCtx.getImageData(0, 0, annoCanvas.width, annoCanvas.height));
      if (annoState.undo.length > 40) annoState.undo.shift();
      annoState.redo.length = 0;
    } catch (_) {}
  }
  function annoApply() {
    const s = annoState.sizes[annoState.sizeIdx];
    annoCtx.lineCap = "round";
    annoCtx.lineJoin = "round";
    annoCtx.globalAlpha = 1;
    if (annoState.tool === "eraser") {
      annoCtx.globalCompositeOperation = "destination-out";
      annoCtx.strokeStyle = "#000";
      annoCtx.lineWidth = s * 5;
    } else if (annoState.tool === "highlighter") {
      annoCtx.globalCompositeOperation = "source-over";
      annoCtx.strokeStyle = "rgba(255, 214, 0, 0.38)";
      annoCtx.lineWidth = s * 5;
    } else {
      annoCtx.globalCompositeOperation = "source-over";
      annoCtx.strokeStyle = "#ee5729";
      annoCtx.lineWidth = s;
    }
  }
  function setAnnoTool(tool) {
    if (["undo", "redo", "clear", "size"].includes(tool)) return;
    annoState.tool = tool;
    $$(".anno-tool[data-anno]").forEach((b) => {
      if (["undo", "redo", "clear", "size"].includes(b.dataset.anno)) return;
      b.classList.toggle("on", b.dataset.anno === tool);
    });
    annoCanvas.classList.toggle("tool-eraser", tool === "eraser");
    annoCanvas.classList.toggle("tool-text", tool === "text");
  }
  window.addEventListener("resize", resizeAnno);
  annoCanvas.addEventListener("pointerdown", (e) => {
    if (!state.annotating) return;
    if (e.target.closest?.(".anno-bar")) return;
    if (annoState.tool === "text") {
      const r = annoCanvas.getBoundingClientRect();
      const note = document.createElement("div");
      note.className = "anno-note";
      note.contentEditable = "true";
      note.textContent = "텍스트";
      note.style.left = `${e.clientX - r.left}px`;
      note.style.top = `${e.clientY - r.top}px`;
      $("#annoTexts").appendChild(note);
      note.focus();
      document.execCommand("selectAll", false, null);
      return;
    }
    annoSnap();
    annoState.drawing = true;
    annoState.last = annoPos(e);
    annoApply();
    annoCtx.beginPath();
    annoCtx.moveTo(annoState.last.x, annoState.last.y);
    annoCanvas.setPointerCapture?.(e.pointerId);
  });
  annoCanvas.addEventListener("pointermove", (e) => {
    if (!annoState.drawing) return;
    const p = annoPos(e);
    annoCtx.lineTo(p.x, p.y);
    annoCtx.stroke();
    annoCtx.beginPath();
    annoCtx.moveTo(p.x, p.y);
  });
  function endAnnoDraw() { annoState.drawing = false; }
  window.addEventListener("pointerup", endAnnoDraw);
  window.addEventListener("pointercancel", endAnnoDraw);

  $("#annoBar").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-anno]");
    if (!btn) return;
    const t = btn.dataset.anno;
    if (t === "undo") {
      if (!annoState.undo.length) return;
      try {
        annoState.redo.push(annoCtx.getImageData(0, 0, annoCanvas.width, annoCanvas.height));
        annoCtx.putImageData(annoState.undo.pop(), 0, 0);
      } catch (_) {}
      return;
    }
    if (t === "redo") {
      if (!annoState.redo.length) return;
      try {
        annoState.undo.push(annoCtx.getImageData(0, 0, annoCanvas.width, annoCanvas.height));
        annoCtx.putImageData(annoState.redo.pop(), 0, 0);
      } catch (_) {}
      return;
    }
    if (t === "clear") {
      annoSnap();
      annoCtx.clearRect(0, 0, annoCanvas.width, annoCanvas.height);
      $("#annoTexts").innerHTML = "";
      return;
    }
    if (t === "size") {
      annoState.sizeIdx = (annoState.sizeIdx + 1) % annoState.sizes.length;
      btn.dataset.s = String(annoState.sizeIdx);
      return;
    }
    setAnnoTool(t);
  });
  $("#annoSize").dataset.s = "1";
  const anno = { resize: resizeAnno };

  /* AI drawing on SVG */
  const svg = $("#shapeSvg");
  const drawPts = [];
  let extraId = 0;

  function svgPoint(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function enableDraw(on) {
    $("#drawCanvas").classList.toggle("drawing", on);
    svg.style.pointerEvents = on ? "auto" : "none";
  }
  svg.style.pointerEvents = "none";

  $$("[data-tool]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-tool]").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    state.drawTool = b.dataset.tool;
    enableDraw(state.drawTool !== "select" && state.drawTool !== "measure");
    if (state.drawTool === "measure") toast("도형을 누르면 변의 수와 이름을 알려 줍니다.");
  }));

  svg.addEventListener("click", (e) => {
    const poly = e.target.closest(".poly");
    if (state.drawTool === "measure" && poly) {
      toast(`${poly.dataset.name} · 꼭짓점 ${poly.querySelectorAll(".vertex").length}개`);
      return;
    }
    if (!panels.ai.classList.contains("show")) return;
    if (state.drawTool !== "polygon" && state.drawTool !== "point") return;
    const p = svgPoint(e);
    if (drawPts.length > 2) {
      const first = drawPts[0];
      const dx = p.x - first.x;
      const dy = p.y - first.y;
      if (Math.hypot(dx, dy) < 18) {
        commitPolygon(drawPts.slice(), "#b39ddb", "#7e57c2", "내가 그린 다각형");
        drawPts.length = 0;
        clearPreview();
        return;
      }
    }
    drawPts.push({ x: p.x, y: p.y });
    previewPoints();
    if (state.drawTool === "point") {
      commitPolygon(drawPts.slice(), "#90caf9", "#1e88e5", "점");
      drawPts.length = 0;
      clearPreview();
    }
  });

  let previewG = null;
  function clearPreview() {
    if (previewG) previewG.remove();
    previewG = null;
  }
  function previewPoints() {
    clearPreview();
    previewG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    drawPts.forEach((p) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "5");
      c.setAttribute("fill", "#1a1a1a");
      previewG.appendChild(c);
    });
    if (drawPts.length > 1) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", drawPts.map((p) => `${p.x},${p.y}`).join(" "));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#7e57c2");
      line.setAttribute("stroke-width", "2");
      previewG.insertBefore(line, previewG.firstChild);
    }
    svg.appendChild(previewG);
  }

  function commitPolygon(points, fill, stroke, name) {
    extraId += 1;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("poly", "extra");
    g.dataset.name = name;
    if (points.length === 1) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", points[0].x); c.setAttribute("cy", points[0].y);
      c.setAttribute("r", "6"); c.setAttribute("fill", "#1a1a1a");
      g.appendChild(c);
    } else {
      const pg = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      pg.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
      pg.setAttribute("fill", fill);
      pg.setAttribute("fill-opacity", "0.85");
      pg.setAttribute("stroke", stroke);
      pg.setAttribute("stroke-width", "2.5");
      g.appendChild(pg);
      points.forEach((p) => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
        c.setAttribute("r", "5"); c.classList.add("vertex");
        g.appendChild(c);
      });
    }
    svg.appendChild(g);
  }

  function regularPolygon(n, cx, cy, r, fill, stroke, name) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    commitPolygon(pts, fill, stroke, name);
  }

  function rhombusAt(cx, cy) {
    commitPolygon([
      { x: cx, y: cy - 70 }, { x: cx + 90, y: cy }, { x: cx, y: cy + 70 }, { x: cx - 90, y: cy }
    ], "#cfd6dc", "#90a4ae", "마름모");
  }

  function handleAi(text) {
    const t = text.replace(/\s/g, "");
    const cx = 560 + (extraId % 3) * 20;
    const cy = 250 + (extraId % 2) * 16;
    if (t.includes("정삼각형") || t.includes("삼각형")) regularPolygon(3, cx, cy, 90, "#c6e97a", "#7cb342", "정삼각형");
    else if (t.includes("정오각형") || t.includes("오각형")) regularPolygon(5, cx, cy, 90, "#ce93d8", "#8e24aa", "정오각형");
    else if (t.includes("정육각형") || t.includes("육각형")) regularPolygon(6, cx, cy, 90, "#ffe082", "#f9a825", "정육각형");
    else if (t.includes("정팔각형") || t.includes("팔각형")) regularPolygon(8, cx, cy, 88, "#80cbc4", "#00897b", "정팔각형");
    else if (t.includes("정사각형") || t.includes("사각형")) regularPolygon(4, cx, cy, 80, "#ffb14a", "#f57c00", "정사각형");
    else if (t.includes("마름모")) rhombusAt(cx, cy);
    else {
      toast("아직 그 도형은 데모에 없어요. 정오각형처럼 말해 보세요.");
      return;
    }
    toast(`AI가 ${text.replace("그려줘", "").trim()}을(를) 그렸습니다.`);
  }

  $("#aiGo")?.addEventListener("click", () => {
    const v = $("#aiPrompt").value.trim() || "정오각형 그려줘";
    handleAi(v);
  });
  $("#aiPrompt")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#aiGo")?.click();
  });
  $$("[data-prompt]").forEach((b) => b.addEventListener("click", () => {
    $("#aiPrompt").value = b.dataset.prompt;
    handleAi(b.dataset.prompt);
  }));
  $("#clearDraw")?.addEventListener("click", () => {
    $$(".extra", svg).forEach((n) => n.remove());
    drawPts.length = 0;
    clearPreview();
    toast("내가 그린 도형을 지웠습니다.");
  });
  $$("[data-math-tool]").forEach((b) => b.addEventListener("click", () => {
    toast(`${b.dataset.mathTool}를 열었습니다. (데모)`);
  }));
  $("#aiPopout")?.addEventListener("click", () => toast("새 창에서 수학교구를 열었습니다. (데모)"));
  $("#aiMaximize")?.addEventListener("click", () => toast("수학교구 창을 크게 펼쳤습니다. (데모)"));

  /* Guide */
  $("#hideGuide").addEventListener("click", () => $("#guide").classList.add("hidden"));
  $("#toggleHotspots").addEventListener("click", () => {
    document.body.classList.toggle("show-hotspots");
    $("#toggleHotspots").textContent = document.body.classList.contains("show-hotspots") ? "번호 숨기기" : "번호 표시";
  });

  /* Shape hover names on main board */
  svg.addEventListener("pointermove", (e) => {
    const poly = e.target.closest(".poly");
    svg.style.cursor = poly ? "pointer" : (panels.ai.classList.contains("show") ? "crosshair" : "default");
  });
  svg.addEventListener("dblclick", (e) => {
    const poly = e.target.closest(".poly");
    if (poly) toast(`${poly.dataset.name}`);
  });

  renderPage();
  requestAnimationFrame(() => anno.resize());

  const boot = location.hash.replace("#", "");
  if (boot === "ai") openPanel("ai");
  else if (boot === "game") openPanel("game");
  else if (boot === "timer" || boot === "draw" || boot === "toolkit") openPanel("toolkit");
  else if (boot === "monitor") { renderStudents(); openPanel("monitor"); }
  else if (boot && panels[boot]) openPanel(boot);
})();
