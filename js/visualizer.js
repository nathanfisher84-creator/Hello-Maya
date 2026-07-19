/* ─── Hello Maya Events — event visualizer ───
   Upload a photo, drag rental items into it, save or book. */
(function () {
  "use strict";

  const $ = s => document.querySelector(s);
  const canvas = $("#vizCanvas");
  const ctx = canvas.getContext("2d");
  const wrap = $("#vizWrap");
  const emptyOverlay = $("#vizEmpty");
  const hint = $("#vizHint");
  const scaleSlider = $("#vizScale");

  const state = {
    bg: null,            // Image | null (null + started=true → blank backdrop)
    started: false,
    objects: [],         // {img, def, x, y, baseW, scale, rot, flip}
    selected: null,
    W: 1200, H: 900,     // canvas internal size
  };

  /* ── preload sticker images & build palette ── */
  const palette = $("#vizPalette");
  const stickerImgs = {};
  VIZ_STICKERS.forEach(def => {
    const img = new Image();
    img.src = def.src;
    stickerImgs[def.key] = img;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "viz__item";
    btn.innerHTML = `<img src="${def.src}" alt=""><span>${def.label}</span>`;
    btn.addEventListener("click", () => addSticker(def));
    palette.appendChild(btn);
  });

  /* ── canvas sizing ── */
  function setCanvasSize(w, h) {
    const MAX = 1600;
    const f = Math.min(1, MAX / Math.max(w, h));
    state.W = Math.round(w * f);
    state.H = Math.round(h * f);
    canvas.width = state.W;
    canvas.height = state.H;
    wrap.style.aspectRatio = `${state.W} / ${state.H}`;
  }

  function start(bgImage) {
    state.bg = bgImage || null;
    state.started = true;
    if (bgImage) setCanvasSize(bgImage.naturalWidth, bgImage.naturalHeight);
    else setCanvasSize(1200, 900);
    emptyOverlay.hidden = true;
    hint.hidden = false;
    render();
  }

  function loadFile(file) {
    if (!file) return;
    const img = new Image();
    img.onload = () => start(img);
    img.src = URL.createObjectURL(file);
  }
  $("#vizFile").addEventListener("change", e => loadFile(e.target.files[0]));
  $("#vizFile2").addEventListener("change", e => loadFile(e.target.files[0]));
  $("#vizBlank").addEventListener("click", () => start(null));

  /* ── objects ── */
  function addSticker(def) {
    if (!state.started) start(null);
    const img = stickerImgs[def.key];
    const place = () => {
      const obj = {
        img, def,
        x: state.W * (0.35 + Math.random() * 0.3),
        y: state.H * (0.45 + Math.random() * 0.2),
        baseW: state.W * def.width,
        scale: 1, rot: 0, flip: false,
      };
      state.objects.push(obj);
      select(obj);
    };
    img.complete && img.naturalWidth ? place() : (img.onload = place);
  }

  function objSize(o) {
    const w = o.baseW * o.scale;
    return { w, h: w * (o.img.naturalHeight / o.img.naturalWidth) };
  }

  function select(o) {
    state.selected = o;
    scaleSlider.disabled = !o;
    if (o) scaleSlider.value = Math.round(o.scale * 100);
    render();
  }

  /* ── rendering ── */
  function render(forExport = false) {
    ctx.clearRect(0, 0, state.W, state.H);
    if (state.bg) {
      ctx.drawImage(state.bg, 0, 0, state.W, state.H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, state.H);
      g.addColorStop(0, "#f7ece5");
      g.addColorStop(1, "#eaddd3");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, state.W, state.H);
    }
    state.objects.forEach(o => {
      const { w, h } = objSize(o);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      if (o.flip) ctx.scale(-1, 1);
      ctx.drawImage(o.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
    if (!forExport && state.selected) drawSelection(state.selected);
  }

  function corner(o, sx, sy) {
    const { w, h } = objSize(o);
    const cx = (w / 2) * sx, cy = (h / 2) * sy;
    const cos = Math.cos(o.rot), sin = Math.sin(o.rot);
    return { x: o.x + cx * cos - cy * sin, y: o.y + cx * sin + cy * cos };
  }

  function drawSelection(o) {
    const { w, h } = objSize(o);
    const px = Math.max(2, state.W / 500);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.strokeStyle = "#8c3a55";
    ctx.lineWidth = px;
    ctx.setLineDash([6 * px, 4 * px]);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    // transform handle (bottom-right corner): drag = resize + rotate
    const hnd = corner(o, 1, 1);
    ctx.beginPath();
    ctx.arc(hnd.x, hnd.y, 9 * px, 0, Math.PI * 2);
    ctx.fillStyle = "#8c3a55";
    ctx.fill();
    ctx.lineWidth = 2.5 * px;
    ctx.setLineDash([]);
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }

  /* ── pointer interaction ── */
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (state.W / r.width),
      y: (e.clientY - r.top) * (state.H / r.height),
    };
  }

  function hitObject(p) {
    for (let i = state.objects.length - 1; i >= 0; i--) {
      const o = state.objects[i];
      const { w, h } = objSize(o);
      const dx = p.x - o.x, dy = p.y - o.y;
      const cos = Math.cos(-o.rot), sin = Math.sin(-o.rot);
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return o;
    }
    return null;
  }

  let drag = null; // {mode:'move'|'transform', ...}
  canvas.addEventListener("pointerdown", e => {
    if (!state.started) return;
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    const sel = state.selected;
    if (sel) {
      const hnd = corner(sel, 1, 1);
      const grabR = Math.max(18, state.W / 40);
      if (Math.hypot(p.x - hnd.x, p.y - hnd.y) < grabR) {
        drag = {
          mode: "transform",
          startDist: Math.hypot(p.x - sel.x, p.y - sel.y),
          startAngle: Math.atan2(p.y - sel.y, p.x - sel.x),
          origScale: sel.scale,
          origRot: sel.rot,
        };
        return;
      }
    }
    const hit = hitObject(p);
    if (hit) {
      select(hit);
      drag = { mode: "move", offX: p.x - hit.x, offY: p.y - hit.y };
    } else {
      select(null);
    }
  });

  canvas.addEventListener("pointermove", e => {
    if (!drag || !state.selected) return;
    const p = canvasPoint(e);
    const o = state.selected;
    if (drag.mode === "move") {
      o.x = p.x - drag.offX;
      o.y = p.y - drag.offY;
    } else {
      const dist = Math.hypot(p.x - o.x, p.y - o.y);
      const ang = Math.atan2(p.y - o.y, p.x - o.x);
      o.scale = Math.max(0.08, Math.min(4, drag.origScale * (dist / drag.startDist)));
      o.rot = drag.origRot + (ang - drag.startAngle);
      scaleSlider.value = Math.round(Math.min(250, o.scale * 100));
    }
    render();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  /* ── tools ── */
  scaleSlider.addEventListener("input", () => {
    if (!state.selected) return;
    state.selected.scale = scaleSlider.value / 100;
    render();
  });
  $("#vizFlip").addEventListener("click", () => {
    if (state.selected) { state.selected.flip = !state.selected.flip; render(); }
  });
  $("#vizDup").addEventListener("click", () => {
    const o = state.selected;
    if (!o) return;
    const copy = { ...o, x: o.x + state.W * 0.05, y: o.y + state.H * 0.05 };
    state.objects.push(copy);
    select(copy);
  });
  $("#vizFront").addEventListener("click", () => reorder(+1));
  $("#vizBack").addEventListener("click", () => reorder(-1));
  function reorder(dir) {
    const o = state.selected;
    if (!o) return;
    const i = state.objects.indexOf(o);
    const j = i + dir;
    if (j < 0 || j >= state.objects.length) return;
    [state.objects[i], state.objects[j]] = [state.objects[j], state.objects[i]];
    render();
  }
  $("#vizDelete").addEventListener("click", () => {
    if (!state.selected) return;
    state.objects = state.objects.filter(o => o !== state.selected);
    select(null);
  });
  window.addEventListener("keydown", e => {
    if ((e.key === "Delete" || e.key === "Backspace") && state.selected &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      state.objects = state.objects.filter(o => o !== state.selected);
      select(null);
    }
  });

  $("#vizClear").addEventListener("click", () => {
    state.objects = [];
    state.bg = null;
    state.started = false;
    state.selected = null;
    scaleSlider.disabled = true;
    emptyOverlay.hidden = false;
    hint.hidden = true;
    ctx.clearRect(0, 0, state.W, state.H);
    $("#vizFile").value = "";
    $("#vizFile2").value = "";
  });

  $("#vizDownload").addEventListener("click", () => {
    if (!state.started) { alert("Upload a photo or start a blank design first."); return; }
    render(true);                       // draw without selection outline
    const a = document.createElement("a");
    a.download = "my-hello-maya-event.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    render();
  });

  /* ── hand the design's item counts to the booking form ── */
  $("#vizToBooking").addEventListener("click", () => {
    if (!state.objects.length) {
      alert("Add some items to your design first.");
      return;
    }
    const counts = {};
    state.objects.forEach(o => {
      counts[o.def.itemId] = (counts[o.def.itemId] || 0) + 1;
    });
    window.applyVisualizerCounts(counts);
  });
})();
