/* ============ KeyFlow · 交互逻辑（深色磨砂键盘版） ============ */
(function () {
  'use strict';
  const D = window.KF_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- 持久化 ---------- */
  function load(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  const DEFAULTS = { lang: 'zh', translate: false, direction: 'zh2en', haptic: true, sound: true, light: false, keepCand: true, kbHeight: 226 };
  const state = Object.assign({ shift: false, layout: 'letters', view: 'keys', collapsed: false, pinyin: '', assoc: [] }, load('kf_settings_v2', DEFAULTS));
  let userWords = load('kf_words_v2', [
    { w: '边写边译', py: 'bianxiebianyi', f: 99 },
    { w: '手写找字', py: 'shouxiezhaozi', f: 98 },
    { w: '收起键盘预选词', py: 'shouqijianpanyuxuanci', f: 97 }
  ]);
  let clips = load('kf_clips_v2', [
    { t: '你好，今天天气很好！', d: '刚刚' },
    { t: 'KeyFlow 输入法 · iOS 磨砂键盘', d: '10 分钟前' },
    { t: '会议纪要：明天上午 10 点', d: '1 小时前' },
    { t: '收货地址：北京市海淀区', d: '昨天' }
  ]);
  function saveSettings() { const o = {}; Object.keys(DEFAULTS).forEach(k => o[k] = state[k]); store('kf_settings_v2', o); }

  /* ---------- 基础 DOM ---------- */
  const screen = $('#screen'), editor = $('#editor'), ime = $('#ime');
  const pinyinBox = $('#pinyinBox'), candScroll = $('#candScroll'), candidateBar = $('#candidateBar'), viewKeys = $('#viewKeys');
  const translateBar = $('#translateBar'), trText = $('#trText'), trBadge = $('#trBadge');
  const sheet = $('#sheet'), sheetMask = $('#sheetMask'), sheetScroll = $('.sheet-scroll');
  const funcMask = $('#funcMask'), funcMenu = $('#funcMenu'), toastEl = $('#toast');
  let sel = { s: 0, e: 0 }, lastTranslation = '', micTimer = null;

  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  /* ---------- 触感 / 音效 ---------- */
  let audioCtx = null;
  function playTick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audioCtx = audioCtx || new AC(); if (audioCtx.state === 'suspended') audioCtx.resume();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'triangle'; o.frequency.value = state.haptic ? 640 : 920;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.045);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.05);
    } catch (e) { }
  }
  function feedback() {
    if (state.haptic && navigator.vibrate) { try { navigator.vibrate(9); } catch (e) { } }
    if (state.sound) playTick();
  }

  /* ---------- 文本编辑 ---------- */
  function syncSel() { sel.s = editor.selectionStart; sel.e = editor.selectionEnd; }
  editor.addEventListener('keyup', syncSel); editor.addEventListener('click', syncSel);
  editor.addEventListener('select', syncSel); editor.addEventListener('blur', syncSel);
  editor.addEventListener('input', () => { syncSel(); onEditorChange(); });
  function insertText(t) {
    const v = editor.value, s = clamp(sel.s, 0, v.length), e = clamp(sel.e, 0, v.length);
    editor.value = v.slice(0, s) + t + v.slice(e);
    sel.s = sel.e = s + t.length;
    try { editor.setSelectionRange(sel.s, sel.e); editor.focus({ preventScroll: true }); } catch (err) { }
    onEditorChange();
  }
  function backspaceText() {
    const v = editor.value; let s = clamp(sel.s, 0, v.length), e = clamp(sel.e, 0, v.length);
    if (s !== e) editor.value = v.slice(0, s) + v.slice(e);
    else if (s > 0) { editor.value = v.slice(0, s - 1) + v.slice(s); s--; } else return;
    sel.s = sel.e = s;
    try { editor.setSelectionRange(s, s); editor.focus({ preventScroll: true }); } catch (err) { }
    onEditorChange();
  }
  function onEditorChange() {
    $('#charCount').textContent = editor.value.length + ' 个字符';
    if (state.translate) updateTranslation();
  }

  /* ---------- 拼音引擎 ---------- */
  function splitPinyin(s) {
    const res = [];
    (function dfs(i, path) {
      if (res.length >= 14 || path.length > 8) return;
      if (i === s.length) { res.push(path); return; }
      for (let len = Math.min(6, s.length - i); len >= 1; len--) {
        const seg = s.slice(i, i + len);
        if (D.SYLLABLES.has(seg)) dfs(i + len, path.concat(seg));
      }
    })(0, []);
    res.sort((a, b) => a.length - b.length || b[0].length - a[0].length);
    return res;
  }
  function autoPy(w) {
    let s = '';
    for (const ch of w) {
      if (/[\u4e00-\u9fa5]/.test(ch)) s += D.HZ_PY[ch] || '';
      else if (/[a-z0-9]/i.test(ch)) s += ch.toLowerCase();
    }
    return s;
  }
  function getCandidates(s) {
    if (!s) return state.assoc.length ? state.assoc : ['，', '。', '！', '？', '你好', '谢谢', '好的', '收到'];
    const out = [], seen = new Set();
    const add = w => { if (w && !seen.has(w)) { seen.add(w); out.push(w); } };
    userWords.filter(w => w.py === s).sort((a, b) => b.f - a.f).forEach(w => add(w.w));
    (D.DICT[s] || []).forEach(add);
    userWords.filter(w => w.py && w.py.startsWith(s) && w.py !== s).sort((a, b) => b.f - a.f).slice(0, 4).forEach(w => add(w.w));
    const pref = Object.keys(D.DICT).filter(k => k.startsWith(s) && k !== s);
    pref.sort((a, b) => {
      const aw = ((D.DICT[a][0] || '').length > 1) ? 0 : 1, bw = ((D.DICT[b][0] || '').length > 1) ? 0 : 1;
      return aw - bw || a.length - b.length;
    });
    pref.slice(0, 4).forEach(k => add(D.DICT[k][0]));
    const paths = splitPinyin(s);
    if (paths.length) {
      paths.slice(0, 3).forEach(p => (D.DICT[p.join('')] || []).slice(0, 3).forEach(add));
      const lists = paths[0].map(p => (D.DICT[p] || [p]).slice(0, 2));
      let combos = [''];
      lists.forEach(list => { const next = []; combos.forEach(c => list.forEach(ch => next.push(c + ch))); combos = next.slice(0, 14); });
      combos.slice(0, 8).forEach(add);
    } else {
      [...D.SYLLABLES].filter(x => x.startsWith(s)).sort((a, b) => a.length - b.length).slice(0, 6)
        .forEach(p => (D.DICT[p] || []).slice(0, 3).forEach(add));
    }
    if (out.length < 2) add(s);
    return out.slice(0, 20);
  }
  function setAssoc(word) {
    const last = word.slice(-1), pool = [];
    userWords.forEach(w => { if (w.w !== word && w.w.indexOf(last) >= 0) pool.push(w.w); });
    Object.keys(D.DICT).forEach(k => (D.DICT[k] || []).forEach(w => {
      if (w.length > 1 && w.charAt(0) === last && pool.length < 12) pool.push(w);
    }));
    state.assoc = [...new Set(pool.slice(0, 5).concat(['的', '了', '吗', '，', '。', '！', '？', '…']))].slice(0, 12);
  }
  function syncCandidateBar() {
    const show = !!state.pinyin || (state.collapsed && state.keepCand);
    candidateBar.classList.toggle('on', show);
    $('#btnCollapse').style.display = state.collapsed ? 'none' : '';
  }
  function renderCandidates() {
    const list = getCandidates(state.pinyin);
    pinyinBox.textContent = state.pinyin || '';
    candScroll.innerHTML = '';
    list.forEach((w, i) => {
      const d = document.createElement('div');
      d.className = 'cand' + (i === 0 && state.pinyin ? ' first' : '');
      d.textContent = w; candScroll.appendChild(d);
    });
    if (!list.length) { const d = document.createElement('div'); d.className = 'cand-empty'; d.textContent = '输入拼音开始打字…'; candScroll.appendChild(d); }
    candScroll.scrollLeft = 0;
    syncCandidateBar();
  }
  function commit(word) { if (!word) return; insertText(word); state.pinyin = ''; setAssoc(word); renderCandidates(); }
  function commitRaw() { if (state.pinyin) { insertText(state.pinyin); state.pinyin = ''; renderCandidates(); } }

  /* ---------- 键盘布局（参考图四行 + 底部地球/麦克风） ---------- */
  const LAYOUTS = {
    letters: [
      'qwertyuiop'.split(''), 'asdfghjkl'.split(''),
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'delete'],
      ['layout:numbers:123', 'emoji', 'space', 'return']
    ],
    numbers: [
      '1234567890'.split(''), ['-', '/', ':', ';', '(', ')', '¥', '&', '@', '"'],
      ['layout:symbols:#+=', '.', ',', '?', '!', "'", 'delete'],
      ['layout:letters:ABC', 'emoji', 'space', 'return']
    ],
    symbols: [
      ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='], ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
      ['layout:numbers:123', '.', ',', '?', '!', "'", 'delete'],
      ['layout:letters:ABC', 'emoji', 'space', 'return']
    ]
  };
  function keyHtml(k, rowIdx) {
    if (k.indexOf('layout:') === 0) {
      const p = k.split(':');
      const st = rowIdx === 3 ? ' style="flex:1.3"' : '';
      return `<button class="key fn ${rowIdx === 2 ? 'wide' : 'k2'}" data-fn="layout" data-v="${p[1]}"${st}><span class="lbl">${esc(p[2])}</span></button>`;
    }
    if (k === 'shift') return `<button class="key fn wide ${state.shift ? 'shift-on' : ''}" data-fn="shift"><svg class="ic"><use href="#ic-shift"/></svg></button>`;
    if (k === 'delete') return `<button class="key fn wide" data-fn="delete"><svg class="ic"><use href="#ic-delete"/></svg></button>`;
    if (k === 'emoji') return `<button class="key fn" data-fn="emoji" style="flex:1"><svg class="ic"><use href="#ic-emoji"/></svg></button>`;
    if (k === 'space') return `<button class="key space" data-fn="space">空格</button>`;
    if (k === 'return') return `<button class="key return" data-fn="return">搜索</button>`;
    const label = (state.layout === 'letters' && state.shift) ? k.toUpperCase() : k;
    return `<button class="key ${/[a-z]/.test(k) ? '' : 'special'}" data-k="${esc(k)}">${esc(label)}</button>`;
  }
  function renderKeys() {
    viewKeys.innerHTML = LAYOUTS[state.layout].map((row, ri) => {
      let inner = row.map(k => keyHtml(k, ri)).join('');
      if (state.layout === 'letters' && ri === 1) inner = '<span style="flex:.5"></span>' + inner + '<span style="flex:.5"></span>';
      return `<div class="krow${ri === 2 ? ' key-row3' : ''}">${inner}</div>`;
    }).join('');
  }

  /* ---------- 按键逻辑 ---------- */
  function onChar(ch) {
    if (state.lang === 'zh' && state.layout === 'letters' && /^[a-zA-Z]$/.test(ch)) {
      state.pinyin += ch.toLowerCase(); renderCandidates(); return;
    }
    let out = ch;
    if (state.lang === 'en' && state.layout === 'letters' && state.shift) { out = ch.toUpperCase(); state.shift = false; renderKeys(); }
    insertText(out);
  }
  function onDelete() { if (state.pinyin) { state.pinyin = state.pinyin.slice(0, -1); renderCandidates(); } else backspaceText(); }
  function onSpace() { if (state.pinyin) { const c = getCandidates(state.pinyin); commit(c[0] || state.pinyin); } else insertText(' '); }
  function onReturn() { if (state.pinyin) { insertText(state.pinyin); state.pinyin = ''; renderCandidates(); } else insertText('\n'); }
  function switchLayout(v) { commitRaw(); state.layout = v; state.shift = false; renderKeys(); }
  function toggleLang() {
    commitRaw(); state.lang = state.lang === 'zh' ? 'en' : 'zh';
    syncFuncMenu(); saveSettings();
    toast(state.lang === 'zh' ? '已切换到 中文（拼音）' : '已切换到 英文输入');
  }
  function handleKey(el) {
    if (el.dataset.k !== undefined) return onChar(el.dataset.k);
    switch (el.dataset.fn) {
      case 'shift': state.shift = !state.shift; renderKeys(); break;
      case 'delete': onDelete(); break;
      case 'space': onSpace(); break;
      case 'return': onReturn(); break;
      case 'layout': switchLayout(el.dataset.v); break;
      case 'emoji': openView('emoji'); break;
    }
  }

  /* ---------- 视图 / 功能菜单 ---------- */
  function openView(v) {
    state.view = v; closeFuncMenu();
    if (state.collapsed) setCollapsed(false);
    ime.classList.toggle('panel-mode', v === 'clipboard' || v === 'handwrite');
    $('#viewKeys').classList.toggle('show', v === 'keys');
    $('#viewEmoji').classList.toggle('show', v === 'emoji');
    $('#panelClipboard').classList.toggle('show', v === 'clipboard');
    $('#panelHandwrite').classList.toggle('show', v === 'handwrite');
    $$('.panel-tabs [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'handwrite') setTimeout(initCanvas, 30);
    if (v === 'clipboard') renderClips();
    syncCandidateBar();
  }
  function setCollapsed(v) {
    state.collapsed = v; ime.classList.toggle('collapsed', v);
    syncCandidateBar();
    if (v) toast('键盘已收起 · 预选词仍可点选');
  }
  function syncFuncMenu() {
    $('#fmLang').classList.toggle('on', state.lang === 'en');
    $('#fmLang').querySelector('span').textContent = state.lang === 'zh' ? '中文' : '英文';
    $('#fmTranslate').classList.toggle('on', state.translate);
  }
  function openFuncMenu() { funcMask.classList.add('show'); funcMenu.classList.add('show'); syncFuncMenu(); }
  function closeFuncMenu() { funcMask.classList.remove('show'); funcMenu.classList.remove('show'); }

  /* ---------- 剪贴板 ---------- */
  function renderClips() {
    const box = $('#clipList'); box.innerHTML = '';
    if (!clips.length) { box.innerHTML = '<div class="clip-empty">剪贴板是空的，添加一条试试</div>'; updateStats(); return; }
    clips.forEach((c, i) => {
      const d = document.createElement('div'); d.className = 'clip-item'; d.dataset.i = i;
      const ic = document.createElement('span'); ic.innerHTML = '<svg class="ic"><use href="#ic-copy"/></svg>';
      const tx = document.createElement('div'); tx.className = 'clip-tx'; tx.textContent = c.t;
      const tm = document.createElement('div'); tm.className = 'clip-time'; tm.textContent = c.d; tx.appendChild(tm);
      const del = document.createElement('button'); del.className = 'clip-del'; del.dataset.del = i;
      del.innerHTML = '<svg class="ic"><use href="#ic-close"/></svg>';
      d.append(ic, tx, del); box.appendChild(d);
    });
    updateStats();
  }
  function addClip(t) {
    t = (t || '').trim(); if (!t) return;
    clips = [{ t, d: '刚刚' }].concat(clips.filter(c => c.t !== t)).slice(0, 30);
    store('kf_clips_v2', clips); renderClips(); updateStats(); toast('已存入剪贴板');
  }

  /* ---------- 边写边译 ---------- */
  function detectDir(text) {
    if (state.direction !== 'auto') return state.direction;
    return (text.match(/[\u4e00-\u9fa5]/g) || []).length > 0 ? 'zh2en' : 'en2zh';
  }
  const PUNCT_EN = { ',': '，', '.': '。', '!': '！', '?': '？', ';': '；', ':': '：' };
  function zh2en(src) {
    const out = []; let i = 0;
    while (i < src.length) {
      const ch = src.charAt(i);
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        let hit = null;
        for (let len = Math.min(6, src.length - i); len >= 1; len--) {
          const seg = src.substr(i, len);
          if (D.ZHEN[seg] !== undefined) { hit = { w: seg, v: D.ZHEN[seg] }; break; }
        }
        if (hit) { out.push(hit.v); i += hit.w.length; } else { out.push(ch); i++; }
      } else if (/[a-zA-Z0-9]/.test(ch)) {
        let j = i; while (j < src.length && /[a-zA-Z0-9]/.test(src.charAt(j))) j++;
        out.push(src.slice(i, j)); i = j;
      } else if (D.ZHEN[ch] !== undefined) { out.push(D.ZHEN[ch]); i++; }
      else if (/[,.!?;:]/.test(ch)) { out.push(ch); i++; }
      else i++;
    }
    return out.filter(Boolean).join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function en2zh(src) {
    return src.split(/\s+/).filter(Boolean).map(tok => {
      const bare = tok.replace(/[,.!?;:]/g, '');
      const zh = D.ENZH[bare.toLowerCase()] || bare;
      const tail = tok.slice(bare.length).split('').map(c => PUNCT_EN[c] || c).join('');
      return zh + tail;
    }).join('');
  }
  function updateTranslation() {
    translateBar.classList.toggle('on', !!state.translate);
    if (!state.translate) return;
    const raw = editor.value.trim();
    if (!raw) { trText.textContent = '开始输入，译文将实时显示在这里…'; lastTranslation = ''; return; }
    const dir = detectDir(raw);
    trBadge.textContent = dir === 'zh2en' ? '中→英' : '英→中';
    lastTranslation = dir === 'zh2en' ? zh2en(raw) : en2zh(raw);
    trText.textContent = lastTranslation || '（暂无译文）';
  }
  function toggleTranslate(force) {
    state.translate = typeof force === 'boolean' ? force : !state.translate;
    syncSwitch('swTranslate', state.translate); syncFuncMenu();
    updateTranslation(); saveSettings();
    toast(state.translate ? '边写边译已开启 · 译文实时显示在键盘上方' : '边写边译已关闭');
  }

  /* ---------- 手写找字 ---------- */
  const hwCanvas = $('#hwCanvas');
  let strokes = [], drawing = false, cur = null;
  function hwPoint(e) { const r = hwCanvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
  function initCanvas() {
    const r = hwCanvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = window.devicePixelRatio || 1;
    hwCanvas.width = r.width * dpr; hwCanvas.height = r.height * dpr;
    hwCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHw();
  }
  function drawHw() {
    const c = hwCanvas, ctx = c.getContext('2d');
    const w = c.width / (window.devicePixelRatio || 1), h = c.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = state.light ? 'rgba(60,60,67,.13)' : 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = state.light ? '#1c1c1e' : '#f2f2f7';
    ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(s => {
      if (!s.length) return;
      ctx.beginPath(); ctx.moveTo(s[0].x * w, s[0].y * h);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * w, s[i].y * h);
      if (s.length === 1) ctx.lineTo(s[0].x * w + .5, s[0].y * h + .5);
      ctx.stroke();
    });
    $('#hwPlaceholder').style.display = strokes.length ? 'none' : '';
  }
  function hwFeatures() {
    let minX = 1, minY = 1, maxX = 0, maxY = 0, hh = 0, vv = 0, dd = 0;
    strokes.forEach(s => {
      if (!s.length) return;
      s.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
      if (s.length < 2) return;
      const dx = s[s.length - 1].x - s[0].x, dy = s[s.length - 1].y - s[0].y;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > ay * 2.1) hh++; else if (ay > ax * 2.1) vv++; else dd++;
    });
    const bw = Math.max(maxX - minX, .02), bh = Math.max(maxY - minY, .02);
    return { n: strokes.length, ratio: clamp(bw / bh, .25, 5), h: hh, v: vv, d: dd };
  }
  function hwRecognize() {
    if (!strokes.length) { toast('请先在上方区域手写'); return; }
    const f = hwFeatures();
    const scored = D.HAND.map(t => ({
      c: t.c, s: Math.abs(t.n - f.n) * 3.4 + Math.abs(t.ratio - f.ratio) * 1.5
        + Math.abs(t.h - f.h) * 1.1 + Math.abs(t.v - f.v) * 1.1 + Math.abs(t.d - f.d) * .9
    })).sort((a, b) => a.s - b.s);
    const res = [...new Set(scored.map(x => x.c))].slice(0, 10);
    const box = $('#hwResult'); box.innerHTML = '';
    res.forEach(ch => { const b = document.createElement('div'); b.className = 'hw-char'; b.textContent = ch; box.appendChild(b); });
    $('#hwHint').textContent = `识别到 ${f.n} 笔 · 候选按笔画特征排序（本地演示识别）`;
    toast(`已找到 ${res.length} 个候选字，点击即可上屏`);
  }
  function hwClear() { strokes = []; $('#hwResult').innerHTML = ''; $('#hwHint').textContent = '在上方区域手写汉字，点「识别」查找候选字'; drawHw(); }
  hwCanvas.addEventListener('pointerdown', e => { e.preventDefault(); hwCanvas.setPointerCapture(e.pointerId); drawing = true; cur = [hwPoint(e)]; strokes.push(cur); drawHw(); });
  hwCanvas.addEventListener('pointermove', e => { if (!drawing) return; cur.push(hwPoint(e)); drawHw(); });
  hwCanvas.addEventListener('pointerup', () => { drawing = false; drawHw(); });
  hwCanvas.addEventListener('pointercancel', () => { drawing = false; });

  /* ---------- 表情 ---------- */
  function renderEmoji() {
    const g = $('#emojiGrid'); if (g.children.length) return;
    D.EMOJIS.concat(D.PUNCTS).forEach(ch => { const b = document.createElement('button'); b.textContent = ch; g.appendChild(b); });
  }

  /* ---------- 词库 ---------- */
  function parseLine(line) {
    const l = line.trim(); if (!l || l.charAt(0) === '#') return null;
    const p = l.split(/[\s,\t]+/).filter(Boolean);
    const w = p[0]; let py = '', f = 50;
    if (/^[a-z]+$/.test(p[1] || '')) { py = p[1]; if (/^\d+$/.test(p[2] || '')) f = +p[2]; }
    else if (/^\d+$/.test(p[1] || '')) f = +p[1];
    if (!py) py = autoPy(w);
    return { w, py, f: clamp(f, 1, 999) };
  }
  function importWords(text) {
    text = (text || '').trim(); if (!text) { toast('请先粘贴词条或选择文件'); return; }
    let items = [];
    if (text.charAt(0) === '[' || text.charAt(0) === '{') {
      try {
        const j = JSON.parse(text), arr = Array.isArray(j) ? j : (j.words || j.dict || []);
        arr.forEach(x => {
          if (typeof x === 'string') { const it = parseLine(x); if (it) items.push(it); }
          else if (x && (x.word || x.w)) items.push({ w: x.word || x.w, py: x.pinyin || x.py || autoPy(x.word || x.w), f: clamp(+(x.freq || x.f || 50), 1, 999) });
        });
      } catch (e) { toast('JSON 格式有误，解析失败'); return; }
    } else text.split(/\r?\n/).forEach(l => { const it = parseLine(l); if (it) items.push(it); });
    if (!items.length) { toast('未解析到有效词条'); return; }
    const map = new Map(); userWords.forEach(w => map.set(w.w, w));
    items.forEach(w => { const old = map.get(w.w); if (!old || w.f >= old.f) map.set(w.w, w); });
    userWords = [...map.values()]; store('kf_words_v2', userWords);
    updateStats(); renderCandidates(); $('#wbArea').value = '';
    toast(`成功导入 ${items.length} 条词条 · 当前共 ${userWords.length} 条`);
  }
  function updateStats() {
    $('#statBuiltin').textContent = Object.keys(D.DICT).length;
    $('#statUser').textContent = userWords.length; $('#statClip').textContent = clips.length;
    $('#wbPreview').textContent = userWords.length
      ? `已载入 ${userWords.length} 条：${userWords.slice(0, 6).map(w => w.w).join('、')}${userWords.length > 6 ? ' …' : ''}` : '尚未导入词库';
  }
  function exportWords() {
    if (!userWords.length) { toast('词库为空，无法导出'); return; }
    try {
      const blob = new Blob([userWords.map(w => `${w.w} ${w.py} ${w.f}`).join('\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'KeyFlow-用户词库.txt';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('词库已导出为 TXT 文件');
    } catch (e) { toast('当前环境不支持下载'); }
  }

  /* ---------- 设置面板 ---------- */
  function openSheet(which) {
    sheetMask.classList.add('show'); sheet.classList.add('show');
    if (which === 'wordbook') setTimeout(() => {
      const g = $('#wbArea').closest('.group');
      sheetScroll.scrollTop = Math.max(0, g.getBoundingClientRect().top - sheetScroll.getBoundingClientRect().top + sheetScroll.scrollTop - 16);
    }, 280);
    if (which === 'height') setTimeout(() => $('#heightRange').focus(), 280);
  }
  function closeSheet() { sheetMask.classList.remove('show'); sheet.classList.remove('show'); }
  function syncSwitch(id, on) { $('#' + id).classList.toggle('on', !!on); }
  function setHeight(h) {
    h = clamp(Math.round(h), 180, 320); state.kbHeight = h; screen.style.setProperty('--kb-h', h + 'px');
    $('#heightRange').value = h; $('#heightVal').textContent = h + ' px';
  }

  /* ---------- 事件绑定 ---------- */
  screen.addEventListener('pointerdown', e => {
    const hit = e.target.closest('.key,.cand,.hw-char,.emoji-grid button,.clip-item,.func-item,.bottom-row button,.panel-tabs button,.cand-collapse');
    if (hit) { hit.classList.add('pressed'); setTimeout(() => hit.classList.remove('pressed'), 90); feedback(); }
  });
  screen.addEventListener('mousedown', e => {
    const t = e.target;
    if (t.closest('input,textarea,label,#wbFile')) return;
    if (t.closest('.key,.cand,.cand-collapse,.hw-char,.emoji-grid button,.clip-item,.clip-add button,.hw-btn,.tr-acts button,.collapse-tip button,.func-item,.bottom-row button,.panel-tabs button')) {
      syncSel(); e.preventDefault();
    }
  });

  ime.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#btnGlobe')) return openFuncMenu();
    if (t.closest('#btnMic')) {
      const b = $('#btnMic');
      if (micTimer) { clearTimeout(micTimer); micTimer = null; b.classList.remove('mic-listening'); toast('已停止聆听'); return; }
      b.classList.add('mic-listening'); toast('正在聆听…（语音输入演示）');
      micTimer = setTimeout(() => { b.classList.remove('mic-listening'); micTimer = null; insertText('语音输入演示'); toast('已插入识别结果（演示）'); }, 1400);
      return;
    }
    if (t.closest('#btnCollapse')) return setCollapsed(true);
    if (t.closest('#btnExpand')) return setCollapsed(false);
    if (t.closest('#trReplace')) { if (!lastTranslation) return toast('暂无译文'); editor.value = lastTranslation; sel.s = sel.e = editor.value.length; onEditorChange(); return toast('已用译文替换原文'); }
    if (t.closest('#trInsert')) { if (!lastTranslation) return toast('暂无译文'); insertText(lastTranslation); return toast('译文已插入'); }
    const cand = t.closest('.cand'); if (cand) return commit(cand.textContent);
    const key = t.closest('.key'); if (key) return handleKey(key);
    const vb = t.closest('[data-view]'); if (vb) return openView(vb.dataset.view);
    const ob = t.closest('[data-open]'); if (ob) return openSheet(ob.dataset.open === 'wordbook' ? 'wordbook' : '');
    if (t.closest('#clipAdd')) { addClip($('#clipInput').value); $('#clipInput').value = ''; return; }
    if (t.closest('#clipClear')) { clips = []; store('kf_clips_v2', clips); renderClips(); return toast('剪贴板已清空'); }
    const del = t.closest('.clip-del'); if (del) { clips.splice(+del.dataset.del, 1); store('kf_clips_v2', clips); renderClips(); return; }
    const item = t.closest('.clip-item'); if (item) { const c = clips[+item.dataset.i]; if (c) { insertText(c.t); toast('已粘贴到文稿'); } return; }
    const em = t.closest('.emoji-grid button'); if (em) return insertText(em.textContent);
    if (t.closest('#hwUndo')) { strokes.pop(); drawHw(); return; }
    if (t.closest('#hwClear')) return hwClear();
    if (t.closest('#hwRecognize')) return hwRecognize();
    const hc = t.closest('.hw-char'); if (hc) { insertText(hc.textContent); toast(`「${hc.textContent}」已上屏`); return; }
  });

  // 功能菜单
  funcMask.addEventListener('click', closeFuncMenu);
  funcMenu.addEventListener('click', e => {
    const t = e.target;
    closeFuncMenu();
    if (t.closest('#fmLang')) return toggleLang();
    if (t.closest('#fmTranslate')) return toggleTranslate();
    if (t.closest('#fmCollapse')) return setCollapsed(true);
    const vb = t.closest('[data-view]'); if (vb) return openView(vb.dataset.view);
    const ob = t.closest('[data-open]'); if (ob) return openSheet(ob.dataset.open === 'wordbook' ? 'wordbook' : '');
  });

  // 设置面板
  $('#sheetDone').addEventListener('click', closeSheet);
  sheetMask.addEventListener('click', closeSheet);
  $('#heightRange').addEventListener('input', e => setHeight(+e.target.value));
  $('#heightRange').addEventListener('change', saveSettings);
  function bindSwitch(id, key, after) {
    $('#' + id).addEventListener('click', () => { state[key] = !state[key]; syncSwitch(id, state[key]); saveSettings(); if (after) after(state[key]); });
  }
  bindSwitch('swHaptic', 'haptic', on => { if (on) feedback(); toast(on ? '输入震动已开启' : '输入震动已关闭'); });
  bindSwitch('swSound', 'sound', on => { if (on) playTick(); toast(on ? '按键音效已开启' : '按键音效已关闭'); });
  bindSwitch('swLight', 'light', on => { screen.classList.toggle('light', on); drawHw(); toast(on ? '已切换浅色外观' : '已切换深色磨砂按键'); });
  bindSwitch('swTranslate', 'translate', on => toggleTranslate(on));
  bindSwitch('swCollapseCand', 'keepCand', () => { syncCandidateBar(); toast(state.keepCand ? '收起键盘后将保留预选词' : '收起键盘时不再显示预选词'); });
  $('#segDirection').addEventListener('click', e => {
    const b = e.target.closest('button[data-dir]'); if (!b) return;
    state.direction = b.dataset.dir; $$('#segDirection button').forEach(x => x.classList.toggle('on', x === b));
    updateTranslation(); saveSettings();
  });
  $('#wbFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { $('#wbArea').value = String(rd.result).slice(0, 20000); importWords($('#wbArea').value); };
    rd.readAsText(f, 'utf-8'); e.target.value = '';
  });
  $('#wbImport').addEventListener('click', () => importWords($('#wbArea').value));
  $('#wbExport').addEventListener('click', exportWords);
  $('#wbClear').addEventListener('click', () => { userWords = []; store('kf_words_v2', userWords); updateStats(); renderCandidates(); toast('用户词库已清空'); });

  // 应用视图
  $('#navBack').addEventListener('click', () => toast('KeyFlow 交互原型 · 非真实导航'));
  $('#navDone').addEventListener('click', () => { editor.blur(); toast('文稿已保存（演示）'); });
  $('#footClear').addEventListener('click', () => { editor.value = ''; sel.s = sel.e = 0; onEditorChange(); toast('文稿已清空'); });
  $('#footCopy').addEventListener('click', () => addClip(editor.value || '（空文稿）'));

  // 拖动调节高度
  const grip = $('#grip');
  grip.addEventListener('pointerdown', e => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const y0 = e.clientY, h0 = state.kbHeight;
    const move = ev => setHeight(h0 + (y0 - ev.clientY));
    const up = () => { grip.removeEventListener('pointermove', move); saveSettings(); toast(`键盘高度：${state.kbHeight} px`); };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up, { once: true });
    grip.addEventListener('pointercancel', up, { once: true });
  });

  // 左侧功能卡片联动
  $('#featList').addEventListener('click', e => {
    const b = e.target.closest('.feat'); if (!b) return;
    const a = b.dataset.act; closeSheet(); closeFuncMenu();
    if (a === 'clipboard') { openView('clipboard'); toast('剪贴板：点击任意条目即可粘贴'); }
    else if (a === 'collapse') setCollapsed(!state.collapsed);
    else if (a === 'translate') { if (!state.translate) toggleTranslate(true); else toast('边写边译已开启 · 在文稿中输入试试'); }
    else if (a === 'handwrite') { openView('handwrite'); toast('手写找字：在画布上写字后点「识别」'); }
    else if (a === 'height') { openSheet('height'); toast('拖动键盘顶部横条，或用滑块调节高度'); }
    else if (a === 'haptic') { if (!state.haptic) { state.haptic = true; syncSwitch('swHaptic', true); saveSettings(); } feedback(); toast('输入震动已开启 · 点按键盘体验反馈'); }
    else if (a === 'wordbook') { openSheet('wordbook'); toast('词库导入：支持 TXT / JSON / CSV'); }
  });

  /* ---------- 设备自适应 + 时钟 ---------- */
  function fitDevice() {
    // 真机 App 内：隐藏模拟器外框，界面铺满屏幕，状态栏与安全区交给系统
    if (window.KeyFlowNative) { document.body.classList.add('native'); return; }
    const wrap = $('#deviceWrap');
    const s = Math.min(1, (window.innerHeight - 28) / 896, (window.innerWidth - 28) / 414);
    wrap.style.width = (414 * s) + 'px'; wrap.style.height = (896 * s) + 'px';
    const dev = $('.device'); dev.style.transformOrigin = 'top left'; dev.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fitDevice);
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function tickClock() { const d = new Date(); $('#clock').textContent = d.getHours() + ':' + two(d.getMinutes()); }
  setInterval(tickClock, 30000);

  /* ---------- 初始化 ---------- */
  editor.value = '你好，今天天气很好。'; sel.s = sel.e = editor.value.length;
  screen.classList.toggle('light', !!state.light);
  setHeight(state.kbHeight); $('#heightRange').value = state.kbHeight;
  const SW_IDS = { haptic: 'swHaptic', sound: 'swSound', light: 'swLight', translate: 'swTranslate', keepCand: 'swCollapseCand' };
  Object.keys(SW_IDS).forEach(k => syncSwitch(SW_IDS[k], state[k]));
  $$('#segDirection button').forEach(b => b.classList.toggle('on', b.dataset.dir === state.direction));
  renderKeys(); renderCandidates(); renderClips(); renderEmoji(); updateStats(); onEditorChange(); syncFuncMenu();
  $('#docMeta').textContent = '今天 ' + new Date().getHours() + ':' + two(new Date().getMinutes());
  tickClock(); fitDevice(); setTimeout(initCanvas, 60);
})();
