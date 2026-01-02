(async function(){
// GLOBAL geteilter BroadcastChannel (für alle IIFEs)
window.bc = window.bc || (('BroadcastChannel' in window) ? new BroadcastChannel('od_sync') : null);


// --- Edit-Modus erkennen (Builder-Link) ---
const url = new URL(window.location.href);
const path = url.pathname.replace(/\/+$/,'').toLowerCase();

// funktioniert bei /builder.html UND /public/builder.html
const EDIT_MODE =
  path.endsWith('/builder') ||
  path.endsWith('/builder.html');


if (!EDIT_MODE) {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('quickFab')?.setAttribute('hidden', '');
    document.getElementById('quickPanel')?.setAttribute('hidden', '');
  });
}

if (EDIT_MODE) {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('quickFab')?.removeAttribute('hidden');
    // quickPanel bleibt hidden bis du auf den FAB klickst (so wie jetzt)
  });
}

/* ========== GLOBALER HOVER-FREEZE ========== */
window.__hoverFreeze = false;
;(async () => {
  /* ============ Mini-Helpers ============ */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (s) => (s==null?'':String(s))
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const rgba255 = (a) => `rgba(255,255,255,${a})`;

  /* ============ Basics ============ */
  try { $('#year').textContent = new Date().getFullYear(); } catch {}
  const bgv = $('.bg-video');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { bgv?.pause(); }

  /* ============ Keys / Flags ============ */
  const KEY_MODS     = 'builder_mods_v3';
  const KEY_CONF     = 'builder_conf_v3';
  const KEY_PRODUCTS = 'shop_products_v1';

  const KEY_SHIP = 'od_shipping_v1';
  const shipDefaults = {
  zones: {
  AT:  { on:true,  price:4.90, eta:'2–3 Werktage' },
  DE:  { on:true,  price:7.90, eta:'2–4 Werktage' },
  EU:  { on:true,  price:9.90, eta:'3–5 Werktage' },
  INT: { on:false, price:19.90,eta:'3–7 Werktage' }
  },
  free: { on:true, threshold:89 }
  };
  let shipConf = Object.assign({}, shipDefaults, safeJson(localStorage.getItem(KEY_SHIP), {}));
  // Wird nach serverHydrateLocalStorage() nochmal überschrieben (falls Server-Stand neuer ist).
  function saveShip(){
  localStorage.setItem(KEY_SHIP, JSON.stringify(shipConf));
  ping('shipping', shipConf);
  serverSaveState({ ls: { [KEY_SHIP]: JSON.stringify(shipConf) } });
  }

// ======================= SERVER STATE (Vercel) =======================
const USE_SERVER_STATE = true;

// Diese API speichert die Builder-States serverseitig (api/data/site.json)
// -> Änderungen im /builder sind damit auf ALLEN Geräten sichtbar.
let __lastServerUpdatedAt = null;
let __serverState = { ls: {} };

async function serverGetState(){
  if (!USE_SERVER_STATE) return null;
  try{
    const r = await fetch(`/api/state-get?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json(); // z.B. { ok:true, state:{ls:{}}, updated_at }
  }catch{
    return null;
  }
}

async function serverHydrateLocalStorage(){
  const json = await serverGetState();
  const ls = json?.state?.ls || json?.ls; // robust gegen alte Formate
  if (!ls || typeof ls !== 'object') return false;

  __lastServerUpdatedAt = json?.updated_at || json?.updatedAt || __lastServerUpdatedAt;

  try{
    Object.entries(ls).forEach(([k,v])=>{
      if (typeof k !== 'string') return;
      if (v == null) return;
      const next = String(v);
      if (localStorage.getItem(k) !== next) localStorage.setItem(k, next);
    });
    return true;
  }catch{
    return false;
  }
}

let __persistT = null;
function serverSaveState(partial){
  if (!USE_SERVER_STATE) return;
  clearTimeout(__persistT);
  __persistT = setTimeout(async () => {
    try{
      await fetch('/api/state-save', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(partial || {})
      });
    }catch{}
  }, 50);
}

// Wichtig: Server-Zustand zuerst in localStorage laden,
// damit Mobile/andere PCs sofort den gleichen Stand sehen.
try { await serverHydrateLocalStorage(); } catch {}


  // Live-Sync
  const CART_KEY = 'od_cart';


  const bc = window.bc || null;

  const ping = (type, payload = {}) => bc?.postMessage({ type, payload, ts: Date.now() });

  const THEME_LOCKED = document.body.classList.contains('theme-locked'); // Shop

  /* ============ State (mods & conf) ============ */
  function safeJson(s, fb){ try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

  const defaultFont =
  getComputedStyle(document.documentElement).getPropertyValue('--ff').trim() ||
  "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

  const mods = {
  booking:false, shop:false, reviews:false, services:false,
  ...safeJson(localStorage.getItem(KEY_MODS), {})
  };

  const confDefaults = {
  textColor:  getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#ecf0ff',
  strokeAlpha: 0.14,
  bgColor:    getComputedStyle(document.documentElement).getPropertyValue('--bg1').trim() || '#0a0b0f',
  bgImage: '', bgVideo: '',

  // About-Text
  desc: 'HIER DEIN DEFAULT ABOUT TEXT ...',

  // ✅ NEU: Profil/Branding
  company: 'Dotagora',
  slogan:  'Alle Infos an einem digitalen Ort, auf einen Blick.',
  slogan2: 'Inspiriert von der Agora – dem zentralen Ort im antiken Griechenland.',
  fontFamily: defaultFont,
  logo: '',
  brand: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#86e8ff',

  // Kontakt-Symbole: nur sichtbar wenn im Builder angehakt
  social: {
    instagram:false,
    linkedin:false,
    facebook:false,
    tiktok:false,
    youtube:false,
    x:false,
    pinterest:false,
    github:false,
    whatsapp:false,
    telegram:false,
    email:false,
    phone:false
  }
  };


  const storedConf = safeJson(localStorage.getItem(KEY_CONF), null);

  // WICHTIG: Defaults nur wenn es noch nichts gibt:
  const conf = storedConf ? Object.assign({}, confDefaults, storedConf)
  : Object.assign({}, confDefaults);

  // Beim ersten Mal sofort speichern, damit "leer" später leer bleiben darf
  if (!storedConf) {
  localStorage.setItem(KEY_CONF, JSON.stringify(conf));
  }


  /* ============ Apply mods/conf ============ */
  function setHidden(sel, on){ $$(sel).forEach(el => on ? el.removeAttribute('hidden') : el.setAttribute('hidden','')); }

  function applyMods(){
  setHidden('#booking', mods.booking);
  setHidden('#offers', mods.shop);
  /*if(mods.shop){ $('#offers details')?.setAttribute('open',''); }*/
  setHidden('#reviews', mods.reviews);
  setHidden('#services', mods.services);
  
  // ✅ Warenkorb nur sichtbar, wenn Shop aktiv ist
  const fab = document.getElementById('cartFab');
if (fab) {
  fab.hidden = !mods.shop;
  fab.style.display = mods.shop ? '' : 'none'; // 🔴 DAS FEHLT
}

  const drawer = document.getElementById('cartDrawer');
  if (drawer && !mods.shop) 
    drawer.hidden = true;
}

  function applySocialVisibility(){
    const social = conf.social || {};

    document.querySelectorAll('[data-social]').forEach(el => {
      const key = (el.getAttribute('data-social') || '').toLowerCase();
      const on  = !!social[key];
      el.style.display = on ? '' : 'none';
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });

    Object.keys(social).forEach(key => {
      const el = document.getElementById('social-' + key);
      if (!el) return;
      const on = !!social[key];
      el.style.display = on ? '' : 'none';
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  }

  function applyConf(){
  // Theme
  document.documentElement.style.setProperty('--text', conf.textColor);
  document.documentElement.style.setProperty('--stroke', rgba255(conf.strokeAlpha));
  document.documentElement.style.setProperty('--bg1', conf.bgColor);
  document.documentElement.style.setProperty('--ff', conf.fontFamily);
  document.documentElement.style.setProperty('--brand', conf.brand);

  // optional: gut lesbare Schriftfarbe auf Brand automatisch wählen
  function autoInk(hex) {
  // hex -> #rrggbb
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
  if(!m) return '#08242c';
  const r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
  // relative luminance
  const l = (0.2126*r + 0.7152*g + 0.0722*b)/255;
  return l > 0.6 ? '#08242c' : '#ffffff';
  }
  document.documentElement.style.setProperty('--brand-ink', autoInk(conf.brand));


  // Mobile-Browserleiste
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && conf.bgColor) metaTheme.setAttribute('content', conf.bgColor);

  const desc = $('#bizDesc');
  if(desc){ desc.textContent = (conf.desc || '').slice(0,500); }

  

// About-Überschrift (Public + Builder)
(function applyAboutTitle(){
  const title = String(conf.aboutTitle ?? '').trim();
  if (!title) return;

  const candidates = [
    ...document.querySelectorAll(
      '[data-about-title], #aboutTitle, #about .section-title, #information .section-title, section#about h2, section#information h2, h2.section-title'
    )
  ];

  // Heuristik: H2 mit "About us" im About/Information-Block
  document.querySelectorAll('h2').forEach(h => {
    const cur = (h.textContent || '').trim();
    if (/^about\s+us$/i.test(cur) && (h.closest('#about, #information, section') || h.closest('.section, .card'))) {
      candidates.push(h);
    }
  });

  // Unique + setzen
  Array.from(new Set(candidates)).forEach(el => {
    try { el.textContent = title.slice(0, 100); } catch {}
  });
})();
// About/Information Überschrift (Public View + Builder)
  const aboutTitleText = String(conf.aboutTitle || '').trim();
  if (aboutTitleText) {
    const t = aboutTitleText.slice(0, 100);
    document.querySelectorAll(
      '[data-about-title], #aboutTitle, #about .section-title, #information .section-title, #info .section-title, section#about h2, section#information h2, section#info h2'
    ).forEach(el => { el.textContent = t; });
  }

  // Kontakt-Symbole anwenden
  applySocialVisibility();

  // ✅ NEU: Company überall setzen (H1 + Footer + ggf. weitere Plätze)
  const company = (conf.company ?? 'Dotagora').trim();
  document.querySelectorAll('[data-company]').forEach(el => {
  el.textContent = company;
  });

  // ✅ NEU: Browser-Tab Titel
  document.title = `${company} — Builder Landing Page`;

  // ✅ Slogan Zeile 1
  const s1 = document.querySelector('[data-slogan]');
  if (s1) s1.textContent = ((conf.slogan || '')).slice(0, 200);

  // ✅ Slogan Zeile 2 (NEU)
  const s2 = document.querySelector('[data-slogan2]');
  if (s2) {
  const v = ((conf.slogan2 || '')).slice(0, 200);
  s2.textContent = v;
  // optional: wenn leer, nicht anzeigen
  s2.style.display = v.trim() ? '' : 'none';
  }

  // Avatar-Kreis anwenden
  if (conf.logo) {
  const url = conf.logo;
  const circle = document.querySelector('.avatar-circle');
  if (circle) {
  circle.style.backgroundImage = `url("${url}")`;
  circle.style.backgroundSize = 'cover';
  circle.style.backgroundPosition = 'center';
  }
  document.querySelectorAll('[data-avatar-bg]').forEach(el => {
  el.style.backgroundImage = `url("${url}")`;
  el.style.backgroundSize = el.style.backgroundSize || 'cover';
  el.style.backgroundPosition = el.style.backgroundPosition || 'center';
  });
  }

  // Background image
  if(conf.bgImage){
  document.body.style.backgroundImage = `url(${conf.bgImage})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundAttachment = 'fixed';
  } else {
  document.body.style.backgroundImage = '';
  }
  // Background video
  if (bgv) {
  if (conf.bgVideo) {
    let src = bgv.querySelector('source');
    if (!src) {
      src = document.createElement('source');
      src.type = 'video/mp4';
      bgv.appendChild(src);
    }
    if (src.src !== conf.bgVideo) src.src = conf.bgVideo;

    try { bgv.load(); bgv.play().catch(()=>{}); } catch {}
  } else {
    // wenn kein bgVideo gesetzt: Quellen entfernen, damit NICHTS geladen wird
    bgv.querySelectorAll('source').forEach(s => s.remove());
    try { bgv.pause(); } catch {}
  }
}
  }

  const THEME_KEYS = ['bgColor','textColor','strokeAlpha','bgImage','bgVideo','fontFamily'];
  function saveConf(){
  if (THEME_LOCKED) {
  const old = safeJson(localStorage.getItem(KEY_CONF), {});
  THEME_KEYS.forEach(k => { if (old[k] !== undefined) conf[k] = old[k]; });
  }
  localStorage.setItem(KEY_CONF, JSON.stringify(conf));
  ping('theme', { conf }); // ⟵ NEU: sofortige Live-Aktualisierung
  serverSaveState({ ls: { [KEY_CONF]: JSON.stringify(conf) } });
  }

  /* ========= LIVE-SYNC ========= */
  window.addEventListener('storage', (e) => {
  if (e.key === KEY_CONF) {
  try {
  const next = JSON.parse(e.newValue || '{}');
  Object.assign(conf, next);
  applyConf();
  } catch {}
  }
  });

  // Sofort-Sync ohne Reload
  window.bc?.addEventListener('message', (ev) => {
  const { type } = ev.data || {};

  if (type === 'theme') {
    Object.assign(conf, safeJson(localStorage.getItem(KEY_CONF), {}));
    applyConf();
  }

  if (type === 'mods') {
    Object.assign(mods, safeJson(localStorage.getItem(KEY_MODS), {}));
    applyMods();
    try { typeof updateCartBadge === 'function' && updateCartBadge(); } catch {}
  }

  if (type === 'products') {
    // Shop-IIFE hängt einen Listener auf 'products-updated' und rendert neu.
    document.dispatchEvent(new Event('products-updated'));
  }

  // 'cart' wird im Warenkorb-IIFE behandelt
});
/* ============ PUZZLE Tiles (Deko) ============ */
  ;(() => {
  const cs = getComputedStyle(document.documentElement);
  const cols    = parseInt(cs.getPropertyValue('--pz-cols')) || 6;
  const rows    = parseInt(cs.getPropertyValue('--pz-rows')) || 4;
  const stagger = parseFloat(cs.getPropertyValue('--pz-stagger')) || 120;

  const container = document.getElementById('puzzle');
  if (!container) return;

  for (let y=0; y<rows; y++){
  for (let x=0; x<cols; x++){
  const piece = document.createElement('div');
  piece.className = 'pz-piece';

  const bx = (x / (cols - 1)) * 100;
  const by = (y / (rows - 1)) * 100;
  piece.style.backgroundPosition = `${bx}% ${by}%`;

  piece.style.animationDelay = ((x + y) * stagger) + 'ms';
  const r = ((x + y) % 4 - 1.5) * 0.6;
  piece.style.rotate = r + 'deg';

  container.appendChild(piece);
  }
  }
  setTimeout(()=> container.classList.add('revealed'), (cols+rows)*stagger + 900);
  })();

  /* ============ Builder: FAB & Panel (ALLGEMEIN) ============ */
  if (EDIT_MODE) ensureShopPanelIfMissing();


  function hydrateShipEditor(){
  const box = document.getElementById('shipEditor');
  if (!box) return;
  const g = id => box.querySelector('#' + id);

  // UI mit aktuellem State füllen
  g('shipAT').checked  = !!shipConf.zones.AT.on;   g('priceAT').value  = shipConf.zones.AT.price;
  g('shipDE').checked  = !!shipConf.zones.DE.on;   g('priceDE').value  = shipConf.zones.DE.price;
  g('shipEU').checked  = !!shipConf.zones.EU.on;   g('priceEU').value  = shipConf.zones.EU.price;
  g('shipINT').checked = !!shipConf.zones.INT.on;  g('priceINT').value = shipConf.zones.INT.price;
  g('freeActive').checked = !!shipConf.free.on;    g('freeThreshold').value = shipConf.free.threshold;

  // Änderungen speichern
  box.addEventListener('input', (e) => {
  const id  = e.target.id;
  const val = e.target.type === 'checkbox'
  ? e.target.checked
  : parseFloat(String(e.target.value).replace(',', '.')) || 0;

  if (id === 'shipAT'  || id === 'priceAT')   shipConf.zones.AT[id === 'shipAT'  ? 'on' : 'price'] = val;
  else if (id === 'shipDE' || id === 'priceDE') shipConf.zones.DE[id === 'shipDE' ? 'on' : 'price'] = val;
  else if (id === 'shipEU' || id === 'priceEU') shipConf.zones.EU[id === 'shipEU' ? 'on' : 'price'] = val;
  else if (id === 'shipINT'|| id === 'priceINT')shipConf.zones.INT[id === 'shipINT'? 'on' : 'price'] = val;
  else if (id === 'freeActive')                shipConf.free.on = val;
  else if (id === 'freeThreshold')             shipConf.free.threshold = val;

  saveShip();
  });
  }

  // beim Laden aktivieren
  if (document.readyState !== 'loading') hydrateShipEditor();
  else document.addEventListener('DOMContentLoaded', hydrateShipEditor);


  const fabEl   = $('#quickFab');
  const panelEl = $('#quickPanel');
  const closeEl = $('#quickClose');

  if (fabEl && panelEl){
  const openPanel  = () => { panelEl.hidden = false; fabEl.setAttribute('aria-expanded','true'); };
  const closePanel = () => { panelEl.hidden = true;  fabEl.setAttribute('aria-expanded','false'); };

  fabEl.addEventListener('click', () => panelEl.hidden ? openPanel() : closePanel());
  closeEl?.addEventListener('click', (e)=>{ e.preventDefault?.(); closePanel(); });

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !panelEl.hidden) closePanel(); });
  document.addEventListener('click', (e)=>{
  if(panelEl.hidden) return;
  if(panelEl.contains(e.target) || fabEl.contains(e.target)) return;
  closePanel();
  });
  }

  // Im Shop: Theme-Reiter entfernen
  if (THEME_LOCKED) {
  $('#ed-general')?.remove();
  $('#ed-bg')?.remove();
  }

  /* ============ Background/General Controls (nur Index!) ============ */
  if (!THEME_LOCKED) {
  const bgModeSel   = $('#bgMode');
  const bgColorInp  = $('#bgColor');
  const bgOverlayInp= $('#bgOverlay');
  const genFont     = $('#genFont');
  const genTextColor= $('#genTextColor');

  function updateBgRows(){
  const mode = bgModeSel?.value || 'color';
  $$('#quickPanel [data-show-if]').forEach(el=>{
  const [k,v] = el.getAttribute('data-show-if').split('=');
  el.style.display = (k==='bgMode' && v===mode) ? '' : 'none';
  });
  }
  bgModeSel?.addEventListener('change', updateBgRows);
  updateBgRows();

  bgColorInp?.addEventListener('input', (e)=>{
  conf.bgColor = e.target.value;
  saveConf(); applyConf();
  });

  function setOverlayAlpha(a){ document.documentElement.style.setProperty('--overlay-a', String(a)); }
  setOverlayAlpha(parseFloat(bgOverlayInp?.value || '0.35'));
  bgOverlayInp?.addEventListener('input', (e)=> setOverlayAlpha(parseFloat(e.target.value || '0')));

  $('#bgReload')?.addEventListener('click', ()=>{ try{ bgv.currentTime = 0; bgv.play(); }catch{} });

  // ===== Background VIDEO: Datei auswählen + Drag&Drop (wie Avatar) =====
  const bgVideoFile = $('#bgVideoFile');
  const bgVideoPick = $('#bgVideoPick');
  const bgVideoDrop = $('#bgVideoDrop');
  const bgVideoName = $('#bgVideoName');

  function setBgVideoFromFile(file){
  if (!file) return;

  const isMp4 = (file.type === 'video/mp4') || String(file.name||'').toLowerCase().endsWith('.mp4');
  if (!isMp4) { alert('Bitte eine MP4-Datei wählen.'); return; }

  // Achtung: MP4 als Data-URL kann groß werden. Limit (10MB) für Stabilität.
  const maxBytes = 10 * 1024 * 1024;
  if ((file.size || 0) > maxBytes) {
    alert('Video ist zu groß (max. 10MB für Upload via Builder). Bitte kleineres MP4 verwenden.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    conf.bgVideo = String(reader.result || '');
    saveConf();
    applyConf();
    if (bgVideoName) bgVideoName.textContent = file.name || 'video.mp4';
  };
  reader.readAsDataURL(file);
}

  // Button -> Finder öffnen
  bgVideoPick?.addEventListener('click', () => bgVideoFile?.click());

  // Datei gewählt
  bgVideoFile?.addEventListener('change', () => {
    const f = bgVideoFile.files?.[0];
    setBgVideoFromFile(f);
  });

  // Drag&Drop (optional, gleiche UX wie Avatar)
  ['dragenter','dragover'].forEach(ev =>
    bgVideoDrop?.addEventListener(ev, (e) => {
      e.preventDefault();
      bgVideoDrop.classList.add('dragover');
    })
  );
  ['dragleave','drop'].forEach(ev =>
    bgVideoDrop?.addEventListener(ev, (e) => {
      e.preventDefault();
      bgVideoDrop.classList.remove('dragover');
    })
  );
  bgVideoDrop?.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    setBgVideoFromFile(f);
  });

    // ===== Background IMAGE: Datei auswählen + Drag&Drop (wie Avatar) =====
  const bgImageFile = $('#bgImageFile');
  const bgImagePick = $('#bgImagePick');
  const bgImageDrop = $('#bgImageDrop');
  const bgImageName = $('#bgImageName');

  function setBgImageFromFile(file){
  if (!file) return;

  const isImg = String(file.type||'').startsWith('image/');
  if (!isImg) { alert('Bitte eine Bilddatei wählen.'); return; }

  const reader = new FileReader();
  reader.onload = () => {
    conf.bgImage = String(reader.result || '');
    saveConf();
    applyConf();
    if (bgImageName) bgImageName.textContent = file.name || 'image';
  };
  reader.readAsDataURL(file);
}

  // Button -> Finder öffnen
  bgImagePick?.addEventListener('click', () => bgImageFile?.click());

  // Datei gewählt
  bgImageFile?.addEventListener('change', () => {
    const f = bgImageFile.files?.[0];
    setBgImageFromFile(f);
  });

  // Drag&Drop
  ['dragenter','dragover'].forEach(ev =>
    bgImageDrop?.addEventListener(ev, (e) => {
      e.preventDefault();
      bgImageDrop.classList.add('dragover');
    })
  );
  ['dragleave','drop'].forEach(ev =>
    bgImageDrop?.addEventListener(ev, (e) => {
      e.preventDefault();
      bgImageDrop.classList.remove('dragover');
    })
  );
  bgImageDrop?.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    setBgImageFromFile(f);
  });


  function initGeneralUI(){
  if(genFont){
  const match = Array.from(genFont.options).some(o => o.value === conf.fontFamily);
  if(!match){
  const opt = document.createElement('option');
  opt.value = conf.fontFamily;
  opt.textContent = 'Custom';
  genFont.appendChild(opt);
  }
  genFont.value = conf.fontFamily;
  }
  if(genTextColor){
  genTextColor.value = conf.textColor || '#ecf0ff';
  }
  }
  genFont?.addEventListener('change', (e)=>{
  conf.fontFamily = e.target.value || defaultFont;
  saveConf(); applyConf();
  });
  genTextColor?.addEventListener('input', (e)=>{
  conf.textColor = e.target.value || '#ecf0ff';
  saveConf(); applyConf();
  });
  initGeneralUI();
  }

  /* ============ Header/Texts (Index) ============ */

  // Limiter (ohne Cursor zu zerstören)
  function clampEditable(el){
  const max = parseInt(el?.dataset?.max||'0',10);
  if(!max) return false;
  const txt = (el.textContent || '');
  if (txt.length <= max) return false;
  el.textContent = txt.slice(0, max);
  return true;
  }

  // ✅ Copy/Paste fix: nur Plain-Text einfügen (keine komischen HTML-Spans)
  function bindPlainPaste(el){
  if (!el) return;

  // Paste -> immer Plaintext
  el.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
  insertTextAtCursor(el, text);
  });

  // Wichtig: Safari/iOS & manche Browser feuern paste über beforeinput
  el.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'insertFromPaste') {
  e.preventDefault();
  const text = e.clipboardData?.getData('text/plain') || '';
  insertTextAtCursor(el, text);
  }
  });
  }

  function insertTextAtCursor(root, text){
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const node = document.createTextNode(text);
  range.insertNode(node);

  // Cursor hinter den eingefügten Text setzen
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  // ✅ WICHTIG: damit deine input-listener sicher laufen
  root.dispatchEvent(new Event('input', { bubbles: true }));
  }


  function getCaretIndex(root){
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(root);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
  }

  function setCaretIndex(root, index){
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.selectNodeContents(root);

  let charIndex = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
  const next = charIndex + node.nodeValue.length;
  if (index <= next) {
  r.setStart(node, Math.max(0, index - charIndex));
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  return;
  }
  charIndex = next;
  }
  // Fallback: ans Ende
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
  }


  function syncTitle(){
  const t = document.getElementById('edTitle');
  if(!t) return;

  // Cursor merken
  const caret = getCaretIndex(t);

  // nur Länge clampen (OHNE textContent neu zu setzen, wenn nicht nötig)
  const max = parseInt(t.dataset.max || '0', 10) || 50;
  const txt = (t.textContent || '').replace(/\u00A0/g,' ');
  if (txt.length > max) {
  t.textContent = txt.slice(0, max);
  setCaretIndex(t, Math.min(caret, max));
  }

  conf.company = ((t.textContent || '').replace(/\u00A0/g,' ')).trim();

  // wenn wirklich leer, setze Dotagora (nur für Company)
  if (!conf.company) conf.company = 'Dotagora';

  saveConf(); applyConf();

  }


  function syncSlogan1(){
  const s = document.getElementById('edSlogan');
  if(!s) return;

  const caret = getCaretIndex(s);

  const max = parseInt(s.dataset.max || '0', 10) || 200;
  const txt = (s.textContent || '').replace(/\u00A0/g,' ');
  if (txt.length > max) {
  s.textContent = txt.slice(0, max);
  setCaretIndex(s, Math.min(caret, max));
  }

  conf.slogan = (s.textContent || '').slice(0, 200);
  saveConf();
  applyConf();
  }

  function syncSlogan2(){
  const s = document.getElementById('edSlogan2');
  if(!s) return;

  const caret = getCaretIndex(s);

  const max = parseInt(s.dataset.max || '0', 10) || 200;
  const txt = (s.textContent || '').replace(/\u00A0/g,' ');
  if (txt.length > max) {
  s.textContent = txt.slice(0, max);
  setCaretIndex(s, Math.min(caret, max));
  }

  conf.slogan2 = (s.textContent || '').slice(0, 200);
  saveConf();
  applyConf();
  }


  function syncAbout(){
  const a = document.getElementById('edAboutTitle');
  const d = document.getElementById('edAboutDesc');
  if(!a || !d) return;

  clampEditable(a);
  clampEditable(d);

  // Ziel-Elemente im Layout
  const aboutTitleEl =
    document.querySelector('[data-about-title]') ||
    document.querySelector('#aboutTitle') ||
    document.querySelector('#about .section-title') ||
    document.querySelector('#information .section-title') ||
    document.querySelector('#info .section-title') ||
    document.querySelector('section#about h2') ||
    document.querySelector('section#information h2') ||
    document.querySelector('section#info h2');
  const descEl = document.getElementById('bizDesc');

  // Live in DOM schreiben
  if (aboutTitleEl) aboutTitleEl.innerHTML = a.innerHTML || 'About us';
  if (descEl) descEl.innerHTML = d.innerHTML || '';

  // ✅ In conf speichern (Titel + Text)
  conf.aboutTitle = ((aboutTitleEl?.textContent || a.textContent || 'About us')).slice(0,100);
  conf.desc       = (descEl?.textContent || '').slice(0,500);

  saveConf();
  applyConf();
}

  // nur beim Blur „aufräumen“ (trim + mehrfach spaces) → stört Cursor NICHT
  function normalizeOnBlur(id, confKey, maxLen){
  const el = document.getElementById(id);
  if(!el) return;

  const cleaned = (el.textContent || '')
  .replace(/\u00A0/g,' ')
  .replace(/[ \t]+/g,' ')
  .replace(/\n+/g,' ')
  .trim()
  .slice(0, maxLen);

  if ((el.textContent || '') !== cleaned) el.textContent = cleaned;

  conf[confKey] = cleaned;
  saveConf();
  applyConf();
  }

  // Events (wichtig: kein keyup + kein „paste-sync“)
  const edTitle   = document.getElementById('edTitle');
  const edSlogan  = document.getElementById('edSlogan');
  const edSlogan2 = document.getElementById('edSlogan2');
  bindPlainPaste(edTitle);
  bindPlainPaste(edSlogan);
  bindPlainPaste(edSlogan2);
  const edAboutT  = document.getElementById('edAboutTitle');
  const edAboutD  = document.getElementById('edAboutDesc');
  bindPlainPaste(edAboutT);
  bindPlainPaste(edAboutD);
  edTitle?.addEventListener('input', syncTitle);
  edTitle?.addEventListener('blur',  syncTitle);

  edSlogan?.addEventListener('input', syncSlogan1);
  edSlogan?.addEventListener('blur',  () => normalizeOnBlur('edSlogan','slogan',200));

  edSlogan2?.addEventListener('input', syncSlogan2);
  edSlogan2?.addEventListener('blur',  () => normalizeOnBlur('edSlogan2','slogan2',200));

  // About: live sync + sauberer blur
  edAboutT?.addEventListener('input', syncAbout);
  edAboutD?.addEventListener('input', syncAbout);

  edAboutT?.addEventListener('blur', () => normalizeOnBlur('edAboutTitle','aboutTitle',100));
  edAboutD?.addEventListener('blur', () => normalizeOnBlur('edAboutDesc','desc',500));

  /* ============ Avatar: setLogo (Kreis) ============ */
function setLogo(url){
  const validUrl = url?.trim() || '';

  if (!validUrl) {
  conf.logo = '';
  saveConf();
  applyConf();
  return;
}

  const circle = document.querySelector('.avatar-circle');
  if (circle) {
  circle.style.backgroundImage = `url("${validUrl}")`;
  circle.style.backgroundSize = 'cover';
  circle.style.backgroundPosition = 'center';
  }

  document.querySelectorAll('[data-avatar-bg]').forEach(el => {
  el.style.backgroundImage = `url("${validUrl}")`;
  el.style.backgroundSize = el.style.backgroundSize || 'cover';
  el.style.backgroundPosition = el.style.backgroundPosition || 'center';
  });

  conf.logo = validUrl;
  saveConf();
  applyConf();
  if (typeof updateAvatarPreview === 'function') updateAvatarPreview(validUrl);
  }

  /* ============ About toggles -> modules (Index) ============ */
  $$('.i-toggle').forEach(cb=>{
  cb.addEventListener('change', ()=>{
  const k = cb.dataset.name;
  if(k==='shop'){ mods.shop = cb.checked; 
if (k === 'shop' && !cb.checked) {
  const fab = document.getElementById('cartFab');
  if (fab) {
    fab.hidden = true;
    fab.style.display = 'none';
  }
}
  }
  if(k==='services'){ mods.services = cb.checked; }
  if(k==='calendar'){ mods.booking = cb.checked; }
  localStorage.setItem(KEY_MODS, JSON.stringify(mods));
  ping('mods', { mods });
  serverSaveState({ ls: { [KEY_MODS]: JSON.stringify(mods) } });
  applyMods();
  try { typeof updateCartBadge === 'function' && updateCartBadge(); } catch {}
  });
  });

  /* ============ Contact toggles -> social icons ============ */
$$('.c-toggle').forEach(cb=>{
  cb.addEventListener('change', ()=>{
    const key = cb.dataset.key;          // z.B. "instagram"

    if (!conf.social) conf.social = {};
    conf.social[key] = cb.checked;       // ✅ true / false setzen

    saveConf();                          // speichern (Server + LS)
    applyConf();                         // sofort sichtbar
  });
});


  /* ============ Reviews (Index) ============ */
  function applyReviewsUI(){
  const show = $('#revShow')?.checked ?? false;
  const link = $('#revLink')?.value?.trim?.() || '';
  setHidden('#reviews', !!show);
  const card = $('#reviews');
  if(card){
  let linkWrap = card.querySelector('.rev-ext');
  if(!linkWrap){ linkWrap = document.createElement('div'); linkWrap.className='rev-ext muted small'; linkWrap.style.marginTop='8px'; card.appendChild(linkWrap); }
  linkWrap.innerHTML = link ? `<a href="${link}" target="_blank" rel="noopener">More reviews on Google →</a>` : '';
  }
  }
  $('#revShow')?.addEventListener('change', applyReviewsUI);
  $('#revLink')?.addEventListener('input', applyReviewsUI);

  /* ============ SHOP-BUILDER (Produkte) ============ */
  ;(() => {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const clampImages = (imgs) => (imgs || []).map(s => (s||'').trim()).filter(Boolean).slice(0,5);

  function loadProducts(){
  return safeJson(localStorage.getItem(KEY_PRODUCTS), []);
  }
function saveProducts(list){
  const v = JSON.stringify(list);
  localStorage.setItem(KEY_PRODUCTS, v);
  serverSaveState({ ls: { [KEY_PRODUCTS]: v } });
}


  function seedFromHtmlIfEmpty(){
  const stored = loadProducts();
  if (stored.length) return stored;
  const items = Array.from(document.querySelectorAll('#productsGrid .offer'));
  if (!items.length) return [];
  const seeded = items.map(el=>{
  const name = el.querySelector('h3')?.textContent?.trim() || '';
  const description = el.querySelector('.sub')?.textContent?.trim() || '';
  const price = el.querySelector('.price-row .new')?.textContent?.trim()
  || el.querySelector('.price-row')?.textContent?.trim() || '';
  const img = el.querySelector('.media img')?.src || '';
  return { id: uid(), name, description, price, images: img ? [img] : [] };
  });
  saveProducts(seeded);
  return seeded;
  }

  let products = seedFromHtmlIfEmpty();

  // 🔧 Normalize: sicherstellen, dass jedes Produkt ein numerisches p.vat hat
  products = (products || []).map(p => ({
  ...p,
  vat: Number.isFinite(+p.vat) ? +p.vat : 0
  }));
  // Optional: gleich zurückspeichern, damit der Store “sauber” ist
  try { localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products)); } catch {}


  // Render Grid (mit Bild-Slider in jeder Produktkarte)
  function renderGrid(){
  if (window.__hoverFreeze) return;   // <<< NEU

  grid.innerHTML = '';

  const slugify = (s) => (s || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 80);

  products.forEach(p=>{
  const art = document.createElement('article');
  art.className = 'offer';

  // Bilder (max. 5) aus dem Produkt nehmen
  const imgs = clampImages(p.images || []);
  const dataImages = JSON.stringify(imgs);
  const firstImg   = imgs[0] || '';

  const slug = slugify(p.name || p.id || 'produkt');
  const url  = `products/${slug}.html`;

  // stabile ID für Warenkorb / enhanceOffers
  art.dataset.id = p.id || slug;

  art.dataset.vat = String(p.vat ?? 0);  // USt-Prozent an die Karte hängen


  art.innerHTML = `
  <div class="media slider" data-images='${escapeHtml(dataImages)}'>
  ${
  firstImg
  ? `<img class="slide-img" src="${firstImg}" alt="${escapeHtml(p.name || 'Produktbild')}">`
  : ''
  }
  ${
  imgs.length > 1
  ? `
  <button class="slide-btn prev" type="button" aria-label="Vorheriges Bild">‹</button>
  <button class="slide-btn next" type="button" aria-label="Nächstes Bild">›</button>
  `
  : ''
  }
  </div>

  <div class="info">
  <div>
  <h3>
  <a href="${url}" style="text-decoration:none; color:inherit;">
  ${escapeHtml(p.name || 'Neues Produkt')}
  </a>
  </h3>
  <p class="sub">${escapeHtml(p.description || '')}</p>
  </div>


  <div class="price-row">
  ${p.price ? `<span class="new" data-unit-price>${escapeHtml(p.price)}</span>` : ''}
  </div>


  </div>
  `;
  grid.appendChild(art);
  });

  // nach jedem Render die Slider in den Karten initialisieren
  initProductSliders();

  if (!window.__hoverFreeze) {
  document.dispatchEvent(new Event('products-updated'));
  }
  } //  <—  DIESE Klammer beendet renderGrid()


  /* === USt: Änderungen pro Karte speichern + Inputs beim Rendern „hydrieren“ === */
  grid.addEventListener('input', (e) => {
  if (!e.target.matches('.vat-input')) return;
  const card = e.target.closest('.offer'); if (!card) return;
  const id   = card.dataset.id;
  const map  = getVatMap();
  map[id]    = _num(e.target.value);
  saveVatMap(map);
  });

  (function hydrateVatInputs(){
  const map = getVatMap();
  grid.querySelectorAll('.offer').forEach(card => {
  const id  = card.dataset.id;
  const inp = card.querySelector('.vat-input');
  if (inp && id && map[id] != null) inp.value = map[id];
  });
  })();


  // Bild-Slider in jeder Produktkarte initialisieren
  function initProductSliders() {
  const sliders = grid.querySelectorAll('.media.slider');

  sliders.forEach(slider => {
  if (slider.dataset.sliderInit === '1') return;

  let images = [];
  try { images = JSON.parse(slider.dataset.images || '[]'); }
  catch { images = []; }
  images = (images || []).filter(Boolean);
  if (!images.length) return;

  let index = 0;
  const imgEl   = slider.querySelector('.slide-img');
  const prevBtn = slider.querySelector('.slide-btn.prev');
  const nextBtn = slider.querySelector('.slide-btn.next');

  if (!imgEl) return;
  imgEl.src = images[0];

  const go = (dir) => {
  index = (index + dir + images.length) % images.length;
  imgEl.src = images[index];
  };

  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));

  // Optional: Swipe auf Mobile
  let startX = 0;
  slider.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
  slider.addEventListener('touchend', (e) => {
  const diff = e.changedTouches[0].clientX - startX;
  if (diff > 50) go(-1);
  if (diff < -50) go(1);
  });

  slider.dataset.sliderInit = '1';
  });
  }

  // Editor-Referenzen
  const editorList = document.getElementById('productEditorList');
  const addBtn     = document.getElementById('addProductBtn');
  const clearBtn   = document.getElementById('clearAllBtn');

  function productCard(p){
  const wrap = document.createElement('details');
  wrap.className = 'card';
  wrap.open = false;
  wrap.dataset.id = p.id;

  wrap.innerHTML = `
  <summary style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:8px;">
  <span><strong>${escapeHtml(p.name || 'Neues Produkt')}</strong></span>
  <span class="muted small">${p.price ? escapeHtml(p.price) : ''}</span>
  </summary>

  <div class="ed-body" style="margin-top:10px;">
  <div class="grid-2">
  <label class="row"><span>Produktname</span>
  <input type="text" data-k="name" value="${escapeHtml(p.name||'')}" placeholder="z. B. Duftkerze Vanille">
  </label>
  <label class="row"><span>Preis</span>
  <input type="text" data-k="price" value="${escapeHtml(p.price||'')}" placeholder="z. B. 19,90 €">
  </label>
  </div>
  <!-- USt unter dem Preis -->
  <div class="row">
  <label class="row">
  <span>davon USt (%)</span>
  <input type="number"
  data-k="vat"
  min="0" max="100" step="0.1"
  value="${(p.vat ?? 0)}"
  placeholder="z. B. 0 oder 20">
  </label>
  </div>

  <label><span>Beschreibung</span>
  <textarea data-k="description" rows="3" placeholder="Kurzbeschreibung…">${escapeHtml(p.description||'')}</textarea>
  </label>

  <fieldset style="border:1px dashed var(--stroke); border-radius:10px; padding:10px;">
  <legend>Gallery (1–5 Bilder)</legend>
  <div class="grid-2" data-gallery>
  ${[0,1,2,3,4].map(i => `
  <label class="row">
  <span>Bild ${i+1}</span>
  <div class="row">
  <input type="url" data-k="img" data-idx="${i}" value="${escapeHtml(p.images?.[i]||'')}" placeholder="https://…/bild.jpg">
  <button type="button" class="btn small pick-img" data-idx="${i}">Datei…</button>
  </div>
  </label>
  `).join('')}
            </div>
          </fieldset>

          <div class="ed-actions" style="margin-top:8px; display:flex; gap:8px;">
            <button type="button" class="btn small danger" data-action="remove">Löschen</button>
            <button type="button" class="btn small" data-action="dup">Duplizieren</button>
          </div>
        </div>
      `;
  return wrap;
}

function renderEditor(){
  if (!editorList) return;
  editorList.innerHTML = '';
  if (!products.length){
    const empty = document.createElement('div');
    empty.className = 'muted small';
    empty.textContent = 'Noch keine Produkte. Klicke auf „+ Produkt hinzufügen“.';
    editorList.appendChild(empty);
    return;
  }
  products.forEach(p => editorList.appendChild(productCard(p)));
}

// Hilfsfunktion: Datei auswählen und in Produkt speichern
function openImagePicker(p, idx) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imgs = p.images ? p.images.slice() : [];
      imgs[idx] = reader.result;  // Data-URL
      p.images = clampImages(imgs);
      saveProducts(products);
      renderEditor();
      renderGrid();
    };
    reader.readAsDataURL(f);
  });

  fileInput.click();
}

// Editor-Events
editorList?.addEventListener('input', (e)=>{
  const card = e.target.closest('details'); if(!card) return;
  const id = card.dataset.id;
  const p = products.find(x=>x.id===id); if(!p) return;

  const k = e.target.dataset.k;
  if (k === 'img'){
    const i = Number(e.target.dataset.idx||0);
    const imgs = p.images ? p.images.slice() : [];
    imgs[i] = e.target.value.trim();
    p.images = clampImages(imgs);
  }
  else if (k) {
    if (k === 'vat') {
      const v = parseFloat(e.target.value.replace(',', '.'));
      p.vat = Number.isFinite(v) ? v : 0;   // als Zahl speichern

      // NEU: VAT Map aktualisieren + broadcasten (für Checkout live)
      try {
        const map = getVatMap();
        map[id] = p.vat;
        saveVatMap(map); // postMessage('VAT_UPDATE') passiert dort bereits
      } catch {}
    } else {
      p[k] = e.target.value;
    }
  }


  saveProducts(products);
  renderGrid();

  card.querySelector('summary strong').textContent = p.name || 'Neues Produkt';
  const oldBadge = card.querySelector('summary .small');
  const badge = document.createElement('span');
  badge.className = 'muted small';
  badge.textContent = p.price || '';
  if (oldBadge) oldBadge.replaceWith(badge); else card.querySelector('summary')?.appendChild(badge);
});

editorList?.addEventListener('click', (e)=>{
  const card = e.target.closest('details');
  if(!card) return;
  const id = card.dataset.id;
  const p = products.find(x=>x.id===id);
  if(!p) return;

  const btn = e.target.closest('button');

  // 1) „Datei…“-Button
  if (btn && btn.classList.contains('pick-img')) {
    const idx = Number(btn.dataset.idx || 0);
    openImagePicker(p, idx);
    return;
  }

  // 2) Klick in das URL-Feld → auch Picker
  const imgInput = e.target.closest('input[data-k="img"]');
  if (imgInput) {
    const idx = Number(imgInput.dataset.idx || 0);
    openImagePicker(p, idx);
    return;
  }

  if (!btn) return;

  const prodIdx = products.findIndex(x=>x.id===id);
  if (prodIdx < 0) return;

  const act = btn.dataset.action;
  if (act === 'remove'){
    products.splice(prodIdx,1);
    saveProducts(products); renderEditor(); renderGrid();
  }
  if (act === 'dup'){
    const copy = JSON.parse(JSON.stringify(products[prodIdx]));
    copy.id = uid(); copy.name = (copy.name||'') + ' (Kopie)';
    products.splice(prodIdx+1,0,copy);
    saveProducts(products); renderEditor(); renderGrid();
  }
});

addBtn?.addEventListener('click', ()=>{
  products.push({ id: uid(), name:'', description:'', price:'', images:[] });
  saveProducts(products); renderEditor();
});

clearBtn?.addEventListener('click', ()=>{
  if (!confirm('Alle Produkte wirklich löschen?')) return;
  products = []; saveProducts(products); renderEditor(); renderGrid();
});

// Re-render wenn Produkte von außen aktualisiert wurden (Server / anderes Gerät)
  function reloadProductsFromStorage(){
    products = loadProducts();
    // Normalize vat
    products = (products || []).map(p => ({ ...p, vat: Number.isFinite(+p.vat) ? +p.vat : 0 }));
  }

  document.addEventListener('products-updated', () => {
    if (window.__hoverFreeze) return;
    try { reloadProductsFromStorage(); } catch {}
    renderEditor();
    renderGrid();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === KEY_PRODUCTS) {
      try { reloadProductsFromStorage(); } catch {}
      renderEditor();
      renderGrid();
    }
  });

  // Initial
  renderEditor();
  renderGrid();
})();

// Apply Mods/Conf/Reviews beim Start
applyMods();
applyConf();
applyReviewsUI();

// ======================= LIVE PULL (Public View) =======================
// Damit www.glowupmoments.eu ohne Reload sehr schnell übernimmt:
// Wir prüfen regelmäßig updated_at. Bei Änderung: localStorage hydrieren + UI anwenden.
if (!EDIT_MODE && USE_SERVER_STATE) {
  let __pullBusy = false;
  setInterval(async () => {
    if (__pullBusy) return;
    __pullBusy = true;
    try{
      const j = await serverGetState();
      const upd = j?.updated_at || null;
      if (!j || !upd || upd === __lastServerUpdatedAt) return;

      __lastServerUpdatedAt = upd;
      __serverState = (j && j.state && typeof j.state === 'object') ? j.state : (__serverState || { ls:{} });

      const ls = __serverState.ls;
      if (ls && typeof ls === 'object'){
        try{
          Object.entries(ls).forEach(([k,v])=>{
            if (typeof k !== 'string') return;
            if (v == null) return;
            const next = String(v);
            if (localStorage.getItem(k) !== next) localStorage.setItem(k, next);
          });
        }catch{}
      }

      // In-memory State aktualisieren + UI neu anwenden
      try { Object.assign(mods, safeJson(localStorage.getItem(KEY_MODS), {})); } catch {}
      try { Object.assign(conf, safeJson(localStorage.getItem(KEY_CONF), {})); } catch {}
      applyMods();
      applyConf();
      try { applyReviewsUI(); } catch {}
      try { document.dispatchEvent(new Event('products-updated')); } catch {}
      try { typeof updateCartBadge === 'function' && updateCartBadge(); } catch {}
    }catch{} finally{
      __pullBusy = false;
    }
  }, 250);
}


// --- Public Live-Pull (Server -> UI), damit Änderungen vom Builder ohne Refresh erscheinen ---
if (!EDIT_MODE && USE_SERVER_STATE){
  setInterval(async () => {
    try{
      const j = await serverGetState();
      const upd = j?.updated_at || j?.updatedAt;
      if (!upd) return;
      if (__lastServerUpdatedAt && upd === __lastServerUpdatedAt) return;

      // neu -> LS hydrieren
      const changed = await serverHydrateLocalStorage();
      if (!changed) return;

      // Apply: Theme + Mods + Produkte
      try { Object.assign(conf,  safeJson(localStorage.getItem(KEY_CONF), {})); } catch {}
      try { Object.assign(mods,  safeJson(localStorage.getItem(KEY_MODS), {})); } catch {}
      applyMods();
      applyConf();
      // Produkte neu rendern (Shop-IIFE hört darauf)
      try { document.dispatchEvent(new Event('products-updated')); } catch {}
    }catch{}
  }, 300);
}

if (EDIT_MODE) {
  const t  = document.getElementById('edTitle');
  const s1 = document.getElementById('edSlogan');
  const s2 = document.getElementById('edSlogan2');

  if (t)  t.textContent  = (conf.company || 'OneDot').slice(0, 50);
  if (s1) s1.textContent = (conf.slogan  || '').slice(0, 200);
  if (s2) s2.textContent = (conf.slogan2 || '').slice(0, 200);

const aT = document.getElementById('edAboutTitle');
const aD = document.getElementById('edAboutDesc');
if (aT) aT.textContent = (conf.aboutTitle || '').slice(0, 100);
if (aD) aD.textContent = (conf.desc || '').slice(0, 500);
}


// Upload-Feld (Logo/Avatar)
const fileIn = $('#logoFile');
const pickBtn = $('#logoPick');
const dropRow = $('#logoDrop');

pickBtn?.addEventListener('click', () => fileIn?.click());
fileIn?.addEventListener('change', () => {
  const f = fileIn.files?.[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = () => setLogo(String(reader.result || ''));
  reader.readAsDataURL(f);
});

['dragenter','dragover'].forEach(ev =>
dropRow?.addEventListener(ev, e => { e.preventDefault(); dropRow.classList.add('dragover'); })
);
['dragleave','drop'].forEach(ev =>
dropRow?.addEventListener(ev, e => { e.preventDefault(); dropRow.classList.remove('dragover'); })
);
dropRow?.addEventListener('drop', (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = () => setLogo(String(reader.result || ''));
  reader.readAsDataURL(f);
});

// Utils: Panel-Inject für reine Shop-Seite
function ensureShopPanelIfMissing(){
  if (document.getElementById('quickPanel')) return;
  const fab = document.createElement('button');
  fab.id = 'quickFab';
  fab.className = 'quick-fab';
  fab.setAttribute('aria-haspopup','true');
  fab.setAttribute('aria-controls','quickPanel');
  fab.setAttribute('aria-expanded','false');
  fab.title = 'Open builder';
  fab.innerHTML = '<i class="bi bi-puzzle"></i>';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 'quickPanel';
  panel.className = 'quick-panel';
  panel.hidden = true;
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Builder');
  panel.innerHTML = `
      <div class="qp-header">
        <strong>🧩 Builder</strong>
        <button id="quickClose" class="btn small" type="button" title="Close">Done</button>
      </div>

      <div class="editor-accordion">
        <details id="ed-shop" class="ed-block" open>
          <summary>Shop Inhalte</summary>
          <div class="ed-body" id="shopEditor">
            <div id="productEditorList" class="grid-2" style="grid-template-columns:1fr; gap:12px;"></div>
            <div class="ed-actions">
              <button id="addProductBtn" class="btn primary" type="button">+ Produkt hinzufügen</button>
              <button id="clearAllBtn" class="btn small" type="button" title="Alle Produkte löschen">Alles löschen</button>
            </div>
            <p class="small muted">Tipp: Bis zu 5 Bild-URLs pro Produkt. Leere Felder werden ignoriert.</p>
          </div>
        </details>
      </div>
    `;
  document.body.appendChild(panel);
}

})(); // Ende des Haupt-IIFE


/* ========= OneDot URL / Slug Handling ========= */
(() => {
  if (!EDIT_MODE) return;                    // <— NEU: nur im Builder aktiv
  const $ = (s,r=document)=>r.querySelector(s);
  const ORIGIN = window.location.origin;     // <— NEU: Domain dynamisch

  // <<< PASSE DIE BASIS-DOMAIN AN >>>
  // Wenn lokal: 'http://localhost:3000/'
  // Wenn live:  'https://onedot.example/'


  // DOM
  const prefixEl = $('#urlPrefix');
  const slugEl   = $('#urlSlug');
  const copyBtn  = $('#copyUrl');
  const statEl   = $('#slugStatus'); // optional

  if (prefixEl) prefixEl.textContent = ORIGIN.replace(/\/$/, '') + '/';

  // Reserved + Regeln
  const RESERVED = new Set(['admin','api','static','assets','www','login','signup','builder','edit','_next','app','vercel','cdn']);
  const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;             // a-z0-9 + Bindestriche, keine Doppel-/Rand-Striche
  const inRange = s => s.length >= 3 && s.length <= 50;

  const normalize = (s) => String(s||'')
  .toLowerCase().trim()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')  // Akzente weg
  .replace(/[^a-z0-9- ]/g,'')
  .replace(/\s+/g,'-')
  .replace(/-+/g,'-')
  .replace(/^-|-$/g,'');

  function setStatus(type, text){
    if (!statEl) return;
    const colors = {
      ok:   'rgba(134,232,255,.95)',   // dein Brand-hell
      bad:  'rgba(255,120,120,.95)',
      info: 'var(--subtitle)'
    };
    statEl.textContent = text || '';
    statEl.style.color = colors[type] || 'var(--subtitle)';
  }

  // — Backend-Check (optional): /api/slug-available?slug=abc —
  async function askBackend(slug){
    try{
      const r = await fetch(`/api/slug-available?slug=${encodeURIComponent(slug)}`);
    if (!r.ok) throw new Error('not ok');
    const j = await r.json();
    return !!j.available;
  }catch{
    // Fallback (lokal): nimm aus localStorage eine Set-Liste bereits gespeicherter Slugs
    const taken = new Set(JSON.parse(localStorage.getItem('od_taken_slugs')||'[]'));
    return !taken.has(slug);
  }
}

// UI validieren + Button-State
let debounce;
async function validate(){
  const raw  = slugEl.value;
  const norm = normalize(raw);
  if (raw !== norm) slugEl.value = norm;

  // Grundprüfungen
  if (!norm) { copyBtn.disabled = true; setStatus('info',''); return; }
  if (!inRange(norm)) { copyBtn.disabled = true; setStatus('bad','3–50 Zeichen'); return; }
  if (!re.test(norm)) { copyBtn.disabled = true; setStatus('bad','Nur a–z, 0–9, "-"'); return; }
  if (RESERVED.has(norm)) { copyBtn.disabled = true; setStatus('bad','Reserviert'); return; }

  // Verfügbarkeit (debounced)
  clearTimeout(debounce);
  debounce = setTimeout(async ()=>{
    const free = await askBackend(norm);
    copyBtn.disabled = !free;
    setStatus(free ? 'ok' : 'bad', free ? 'frei' : 'bereits vergeben');
  }, 250);
}

slugEl?.addEventListener('input', validate);
slugEl?.addEventListener('blur',  validate);
validate();

// Speichern + Kopieren
copyBtn?.addEventListener('click', async () => {
  const slug = normalize(slugEl.value);
  if (!slug || copyBtn.disabled) return;

  // Persistiere Slug im Profil (hier: localStorage; live: /api/profile PATCH)
  try{
    // LIVE: await fetch('/api/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ slug }) });
    // LOCAL fallback: "belegte" Slugs pflegen
    const taken = new Set(JSON.parse(localStorage.getItem('od_taken_slugs')||'[]'));
    taken.add(slug);
    localStorage.setItem('od_taken_slugs', JSON.stringify([...taken]));
    localStorage.setItem('od_my_slug', slug);
    serverSaveState({ ls: { ['od_my_slug']: slug } });
  }catch{}

  const url = `${ORIGIN.replace(/\/$/, '')}/${slug}`;
try { await navigator.clipboard.writeText(url); } catch {}
setStatus('ok','URL gespeichert & kopiert');
});

// Eigene Domain speichern (nur persistieren; DNS/Binding passiert serverseitig/Vercel)
const domainInp = document.getElementById('customDomain');
const domainBtn = document.getElementById('saveDomain');
domainBtn?.addEventListener('click', async () => {
  const domain = String(domainInp?.value||'').trim().toLowerCase();
  if (!domain) return;
  try{
    // LIVE: await fetch('/api/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ domain }) });
    localStorage.setItem('od_my_domain', domain); // Fallback
    serverSaveState({ ls: { ['od_my_domain']: domain } });
    if (statEl) { statEl.textContent = `Domain gespeichert: ${domain}`; statEl.style.color = 'var(--subtitle)'; }
}catch{}
});
})();


/* ======================= QR MODAL & QR Zusatz ======================= */
const modal = document.getElementById('qr-modal');
const openBtn = document.getElementById('qr-btn');
const closeBtn = document.getElementById('qr-close');
const saveBtn = document.getElementById('qr-save');
const qrBox = document.getElementById('qr-code');

// ---- Öffnen ----
openBtn?.addEventListener('click', (e) => {
  e.preventDefault();

  qrBox.innerHTML = '';

  new QRCode(qrBox, {
    text: window.location.href,
    width: 280,
    height: 280,
    correctLevel: QRCode.CorrectLevel.H
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
});

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

modal?.addEventListener('click', (e) => {
  if (e.target === modal || e.target.id === 'qr-close' || e.target.closest('#qr-close')) {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});

saveBtn?.addEventListener('click', () => {
  const canvas = qrBox.querySelector('canvas');
  const img = qrBox.querySelector('img');
  let dataURL;

  if (canvas) dataURL = canvas.toDataURL('image/png');
  else if (img?.src) dataURL = img.src;
  else return alert('QR-Code ist noch nicht bereit.');

  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'website-qr.png';
  a.click();
  a.remove();
});

// Helpers für QR
function waitForQrReady(box, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const find = () => box.querySelector('canvas, img');
    const first = find();
    if (first) return resolve(first.tagName === 'IMG' ? imgToCanvas(first) : first);
    const obs = new MutationObserver(() => {
      const el = find();
      if (el) {
        obs.disconnect();
        resolve(el.tagName === 'IMG' ? imgToCanvas(el) : el);
      }
    });
    obs.observe(box, { childList: true });
    setTimeout(() => { obs.disconnect(); reject(new Error('QR not ready')); }, timeout);
  });
}

function imgToCanvas(img) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth  || 280;
  c.height = img.naturalHeight || 280;
  c.getContext('2d').drawImage(img, 0, 0);
  img.replaceWith(c);
  return c;
}

/* ======================= LEGAL MODAL (Impressum / Datenschutz / AGB) ======================= */
(() => {
  const modal   = document.getElementById('legal-modal');
  const titleEl = document.getElementById('legal-title');
  const bodyEl  = document.getElementById('legal-body');
  const closeEl = document.getElementById('legal-close');

  // Platzhalter-Texte – HIER austauschen/einfügen
  const legalTexts = {
    imprint: `
      <h3>Impressum</h3>
      <p><strong>Firma:</strong> Deine Firma GmbH</p>
      <p><strong>Adresse:</strong> Musterstraße 1, 1010 Wien</p>
      <p><strong>UID:</strong> ATU12345678</p>
      <p><strong>Kontakt:</strong> hallo@firma.at · +43 1 234 56 78</p>
      <p>Weitere Pflichtangaben …</p>
    `,
    privacy: `
      <h3>Datenschutzerklärung</h3>
      <p>Hier folgt deine DSGVO-konforme Datenschutzerklärung …</p>
      <h4>1. Verantwortlicher</h4>
      <p>…</p>
      <h4>2. Zwecke & Rechtsgrundlagen</h4>
      <p>…</p>
      <h4>3. Speicherdauer</h4>
      <p>…</p>
    `,
    terms: `
      <h3>Allgemeine Geschäftsbedingungen (AGB)</h3>
      <p>Hier stehen deine AGB …</p>
      <h4>1. Geltungsbereich</h4>
      <p>…</p>
      <h4>2. Vertragspartner, Vertragsschluss</h4>
      <p>…</p>
      <h4>3. Preise, Zahlung, Versand</h4>
      <p>…</p>
      <h4>4. Widerruf</h4>
      <p>…</p>
    `
  };

  function openLegal(kind){
    if (!modal || !titleEl || !bodyEl) return;
    const map = {
      imprint: 'Impressum',
      privacy: 'Datenschutz',
      terms:   'AGB'
    };
    titleEl.textContent = map[kind] || 'Rechtliches';
    bodyEl.innerHTML    = legalTexts[kind] || '<p>Kein Inhalt hinterlegt.</p>';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    // Fokus für Tastatur
    closeEl?.focus();
  }

  function closeLegal(){
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  // Delegation: alle Buttons mit .legal-open
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.legal-open');
    if (!btn) return;
    e.preventDefault();
    openLegal(btn.dataset.legal);
  });

  // Close: Button, Overlay-Klick, ESC
  closeEl?.addEventListener('click', closeLegal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeLegal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeLegal();
  });
})();


/* === UST-Helpers: Map (productId -> vat%) =================================== */
const VAT_KEY = 'od_vat_by_id';
const EUR = (n) => (n ?? 0).toLocaleString('de-AT', {style:'currency',currency:'EUR'});
const _num = (v) => Number.parseFloat(String(v).replace(',','.')) || 0;

function getVatMap(){
  try { return JSON.parse(localStorage.getItem(VAT_KEY) || '{}'); }
  catch { return {}; }
}
function saveVatMap(map){
  const v = JSON.stringify(map || {});
  localStorage.setItem(VAT_KEY, v);
  serverSaveState({ ls: { [VAT_KEY]: v } });
  try { bc && bc.postMessage({ type:'VAT_UPDATE', payload: map }); } catch {}
}


/* ======================= CART & ADD-TO-CART ======================= */
;(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const parseEUR = (s) => {
    if (!s) return 0;
    const num = String(s).replace(/[^\d,.-]/g,'').replace('.', '').replace(',', '.');
    const v = parseFloat(num);
    return isNaN(v) ? 0 : v;
  };
  const fmtEUR = (n) => n.toLocaleString('de-AT', { style:'currency', currency:'EUR' });


  function loadCartFromLS() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  }
  function saveCartToLS(items) {
    localStorage.setItem('od_cart', JSON.stringify(items || []));
    try { bc && bc.postMessage({ type:'cart' }); } catch {}
  }


  const cart = {
    items: loadCartFromLS(),
    add(item) {
      const ex = this.items.find(x => x.id === item.id);
      if (ex) ex.qty += item.qty || 1;
      else this.items.push({ ...item, qty: item.qty || 1 });
      this.sync();
    },
    remove(id) {
      this.items = this.items.filter(x => x.id !== id);
      this.sync();
    },
    changeQty(id, delta) {
      const it = this.items.find(x => x.id === id);
      if (!it) return;
      it.qty += delta;
      if (it.qty <= 0) this.remove(id);
      this.sync();
    },
    total() { return this.items.reduce((s, x) => s + x.price * x.qty, 0); },
    count() { return this.items.reduce((s, x) => s + x.qty, 0); },
    sync() {
      saveCartToLS(this.items);
      renderCart();
      updateCartBadge();
    }
  };


  const cartDrawer = $('#cartDrawer');
  const cartClose  = $('#cartClose');
  const cartItems  = $('#cartItems');
  const cartSum    = $('#cartSum');
  const cartFab    = $('#cartFab');
  const cartCount  = $('#cartCount');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.hidden = false;
    cartDrawer.setAttribute('aria-hidden', 'false');
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.hidden = true;
    cartDrawer.setAttribute('aria-hidden', 'true');
  }

  // cartFab?.addEventListener('click', openCart); // deaktiviert

  // ➜ FAB führt direkt zum Checkout:
  cartFab?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = 'checkout.html';
  });


  cartClose?.addEventListener('click', closeCart);

  document.getElementById('cartCheckout')?.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

  function updateCartBadge() {
    if (!cartFab || !cartCount) return;

    // ✅ Shop aus => Warenkorb immer verstecken
  if (!mods.shop) {
  cartFab.hidden = true;
  cartFab.style.display = 'none'; // 🔴 ZWINGEND
  return;
}

    const cnt = cart.count();
    cartFab.hidden = false;
    cartCount.textContent = String(cnt);
  }

  function renderCart() {


    if (!cartItems || !cartSum) return;

    cartItems.innerHTML = cart.items.map(x => `
      <li class="cart-line">
        <img src="${x.img || ''}" alt="" />
        <div class="meta">
          <strong>${x.title}</strong>
          <div class="small muted">${fmtEUR(x.price)} × ${x.qty}</div>
        </div>
        <div class="qty">
          <button class="btn qty-dec" data-id="${x.id}">−</button>
          <span>${x.qty}</span>
          <button class="btn qty-inc" data-id="${x.id}">+</button>
        </div>
        <div class="line-sum">${fmtEUR(x.price * x.qty)}</div>
        <button class="btn link rm" title="Entfernen" data-id="${x.id}">✕</button>
      </li>
    `).join('');

cartSum.textContent = fmtEUR(cart.total());
}

cartItems?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (!id) return;

  if (btn.classList.contains('qty-inc')) cart.changeQty(id, +1);
  else if (btn.classList.contains('qty-dec')) cart.changeQty(id, -1);
  else if (btn.classList.contains('rm')) cart.remove(id);
});

function enhanceOffers(root = document) {
  $$('.offer', root).forEach((card, idx) => {
    if (card.dataset.enhanced === '1') return;

    const titleEl  = card.querySelector('.info h3');
    const priceEl  = card.querySelector('.price-row .new');
    const priceRow = card.querySelector('.price-row');
    const info     = card.querySelector('.info');

    if (!titleEl || !priceEl || !priceRow || !info) return;

    const id = card.getAttribute('data-id') ||
    `offer-${idx}-${titleEl.textContent.trim()}`;

// Wrapper für Preis + Warenkorb-Button
const row = document.createElement('div');
row.className = 'price-buy-row';

// priceRow an der gleichen Stelle durch den Wrapper ersetzen
info.replaceChild(row, priceRow);
row.appendChild(priceRow);

// Warenkorb-Button erzeugen
const btn = document.createElement('button');
btn.className = 'btn add-to-cart';
btn.setAttribute('data-id', id);
btn.title = 'In den Warenkorb';
btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor"
          class="bi bi-cart" viewBox="0 0 16 16">
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1 .5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>`;
row.appendChild(btn);

// Klick → in den Warenkorb
btn.addEventListener('click', () => {
  const img = card.querySelector('img')?.getAttribute('src') || '';

  // --- VAT auflösen: bevorzugt data-vat von der Karte, sonst Map aus dem Editor ---
  let vat = 0;
  if (card.dataset && card.dataset.vat != null) {
    vat = parseFloat(card.dataset.vat) || 0;
  } else {
    try {
      const map = (typeof getVatMap === 'function') ? getVatMap() : {};
      vat = parseFloat(map[id]) || 0;
    } catch { vat = 0; }
  }

  const item = {
    id,
    title: titleEl.textContent.trim(),
    price: parseEUR(priceEl.textContent || '0'), // BRUTTO
    vat,                                         // Prozent (0 / 20 / …)
    img,
    qty: 1
  };

  cart.add(item);
});


card.dataset.enhanced = '1';
});
}

enhanceOffers();

const grid = $('.offers-grid') || $('.products') || document.body;
if (grid && 'MutationObserver' in window) {


  const mo = new MutationObserver(() => {
    if (window.__hoverFreeze) return;   // <<< NEU
    enhanceOffers(grid);
  });


  mo.observe(grid, { childList:true, subtree:true });
}

renderCart();
updateCartBadge();


// 1) Sofort-Sync via BroadcastChannel
bc?.addEventListener('message', (ev) => {
  if ((ev.data || {}).type === 'cart') {
    cart.items = loadCartFromLS();
    renderCart();
    updateCartBadge();
  }
});

// 2) Fallback-Sync via storage
window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) {
    cart.items = loadCartFromLS();
    renderCart();
    updateCartBadge();
  }
});


})();

/* ===== FINAL FIX: seitenweise Scrollen nach --cols, Pfeile immer vorn, nie halbe Karten ===== */
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const row    = $('.products-row');
  const track  = $('#productsGrid');

  // Dynamische Spaltenbreite nach screen-size (keine halben Karten)-eingefügt am 28.11.
  function updateCols() {
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.gap || '16') || 16;

    const cardMin = parseFloat(
    getComputedStyle(document.documentElement)
    .getPropertyValue('--card-min')
    ) || 340;

    const inner = track.clientWidth;
    const cols = Math.max(1, Math.floor((inner + gap) / (cardMin + gap)));
    const capped = Math.min(cols, 6);

    row.style.setProperty('--cols', capped);
  }


  if (!row || !track) return;

  const left   = row.querySelector('.products-arrow.left');
  const right  = row.querySelector('.products-arrow.right');

  // Hilfen
  const getGapPx = () => {
    const g = getComputedStyle(track).gap || '24px';
    const n = parseFloat(g);
    return Number.isFinite(n) ? n : 24;
  };
  const getCardWidth = () => {
    const c = track.querySelector('.offer');
    return c ? c.getBoundingClientRect().width : 0;
  };
  const step = () => getCardWidth() + getGapPx();

  // Sichtbare Spalten: bevorzugt die CSS-Variable --cols, sonst auf Breite rechnen
  const getColsVar = () => {
    const val = getComputedStyle(row).getPropertyValue('--cols');
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const getVisibleColsFallback = () => {
    const s = step();
    if (!s) return 1;
    // +1 Gap für saubere Rundung
    return Math.max(1, Math.floor((track.clientWidth + getGapPx()) / s));
  };
  const getPageSize = () => getColsVar() || getVisibleColsFallback();

  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

  const getIndex = () => {
    const s = step() || 1;
    return Math.round(track.scrollLeft / s);
  };

  const scrollToIndex = (iTarget) => {
    const s = step();
    if (!s) return;
    const max = maxScroll();
    const tgt = Math.max(0, Math.min(max, Math.round(iTarget) * s));
    track.scrollLeft = tgt; // bewusst ohne Smooth-Scroll → nie halbe Karten
    updateArrows();
  };

  // Pfeile: pro Klick eine "Seite" weiter (so viele Karten wie --cols)
  const onArrow = (dir) => {
    // Hover-Ghost wegräumen, damit absolut nichts blockiert
    window.__clearHoverGhost?.();
    const layer = document.getElementById('productsHoverLayer');
    if (layer) layer.innerHTML = '';

    const page = getPageSize();            // 2/3/4/5/6 je nach Breakpoint
    scrollToIndex(getIndex() + dir * page);
  };

  left?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onArrow(-1); }, { capture:true });
  right?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onArrow(+1); }, { capture:true });
  left?.addEventListener('pointerdown', (e) => e.stopPropagation(), { capture:true });
  right?.addEventListener('pointerdown', (e) => e.stopPropagation(), { capture:true });

  // Zentrierung, wenn weniger Karten als Seite
  function updateLayoutAndCentering(){
    const cards = $$('.offer', track).length;
    const page  = getPageSize();
    // Desktop? (auf Mobile sind Pfeile ohnehin ausgeblendet)
    const desktop = window.matchMedia('(min-width: 769px)').matches;
    if (!desktop) return;

    if (cards <= page){
      // weniger als eine Seite → mittig, Pfeile aus
      track.style.justifyContent = 'center';
      row.classList.add('is-at-start','is-at-end');
    } else {
      track.style.justifyContent = 'flex-start';
      updateArrows();
    }
  }

  function updateArrows(){
    const x = track.scrollLeft;
    const max = maxScroll();
    const atStart = x <= 2;
    const atEnd   = x >= max - 2;
    row.classList.toggle('is-at-start', atStart);
    row.classList.toggle('is-at-end',   atEnd);
  }

  function resetStart(){
    // immer sauber am Anfang beginnen → keine halben Karten
    updateCols();                 // <— NEU 28.11.
    track.scrollLeft = 0;
    updateLayoutAndCentering();
    updateArrows();
  }

  // Wheel mit horizontalem Intent „ruhiger“ machen
  track.addEventListener('wheel', (e) => {
    const horizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) + 2;
    if (horizontalIntent){ e.preventDefault(); e.stopPropagation(); }
  }, { passive:false });

  // Beim manuellen Scrollen Pfeil-Status live aktualisieren
  let raf = null;
  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; updateArrows(); });
  }, { passive:true });

  // Reaktion auf Größenänderung / neue Produkte

  window.addEventListener('resize', () => {
    updateCols();                   // <— NEU 28.11.
    resetStart();
  });


  document.addEventListener('products-updated', () => {
    if (window.__hoverFreeze) return;
    resetStart();
  }, { passive:true });

  // Init
  updateCols();       // <— NEU hier einfügen 28.11.
  resetStart();
})();


/* ===== NETFLIX-HOVER: Karte in fixed Layer „portalen“ ===== */
(() => {
  const layer = document.getElementById('productsHoverLayer');
  if (!layer) return;

  // 🔴 FIX: Netflix-Ghost komplett deaktivieren
  layer.innerHTML = '';
  layer.style.display = 'none';
  return;


  // --- NUR MOBILE-LAYOUT (<= 768px) ohne Hover-Zoom --- 28.11.
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
  const mqMobile = window.matchMedia('(max-width: 768px)');

  function applyMobileHoverState(){
    if (isMobile()){
      document.body.classList.add('no-hover-zoom');   // CSS-Schalter
      layer.style.display = 'none';                   // Ghost-Layer aus
      // evtl. vorhandenen Ghost sofort entfernen
      window.__clearHoverGhost?.();
      const l = document.getElementById('productsHoverLayer');
      if (l) l.innerHTML = '';
    } else {
      document.body.classList.remove('no-hover-zoom');
      layer.style.display = '';                       // Layer wieder aktiv
    }
  }

  applyMobileHoverState();
  mqMobile.addEventListener('change', applyMobileHoverState);
  // --- Ende NUR MOBILE-LAYOUT (<= 768px) ohne Hover-Zoom --- 28.11.


  // *** EINZUFÜGEN: Stelle sicher, dass der Layer wirklich am <body> hängt ***
  if (layer.parentNode !== document.body) {
    document.body.appendChild(layer);
  }

  let ghost = null;
  let cleanupScheduled = false;

  function makeGhost(card){
    window.__hoverFreeze = true;   // <<< NEU

    const r = card.getBoundingClientRect();

    // Klon bauen
    const g = card.cloneNode(true);
    g.classList.add('hover-card');
    g.style.position = 'fixed';
    g.style.left = `${Math.round(r.left)}px`;
  g.style.top = `${Math.round(r.top)}px`;
g.style.width = `${Math.round(r.width)}px`;
g.style.height = `${Math.round(r.height)}px`;
g.style.margin = '0';
g.style.zIndex = '999999000';
g.style.pointerEvents = 'none'; // keine Klicks abfangen
g.style.transformOrigin = 'center center';
g.style.transition = 'transform .18s ease, box-shadow .18s ease';
g.style.willChange = 'transform';
// Schöner Hover-Look
g.style.boxShadow = '0 18px 48px rgba(0,0,0,.45)';
g.style.borderRadius = getComputedStyle(card).borderRadius || '22px';

layer.appendChild(g);

// scale wie im CSS
requestAnimationFrame(() => {
  g.style.transform = 'scale(1.12)';
});

return g;
}

function clearGhost(){
  if (!ghost) return;
  ghost.remove();
  ghost = null;

  window.__hoverFreeze = false;   // <<< NEU

}


window.__clearHoverGhost = clearGhost;

// --- NEU: Ghost bei horizontalem Scrollen SOFORT entfernen ---
const trackEl = document.getElementById('productsGrid');
const killGhost = () => { clearGhost(); };

// horizontale Scroll-Events
trackEl?.addEventListener('scroll',       killGhost, { passive: true });
trackEl?.addEventListener('wheel',        killGhost, { passive: true });
trackEl?.addEventListener('touchstart',   killGhost, { passive: true });
trackEl?.addEventListener('pointerdown',  killGhost, { passive: true });


// auf allen Produktkarten aktivieren
function bind(){
  const cards = document.querySelectorAll('#productsGrid .offer');

  cards.forEach(card => {
    if (card.__nfBound) return;
    card.__nfBound = true;

    card.addEventListener('mouseenter', () => {
      if (isMobile()) return;          // ⇐ Mobil: gar nichts tun 28.11.
      clearGhost();
      ghost = makeGhost(card);
    }, { passive:true });

    card.addEventListener('mouseleave', () => {
      if (isMobile()) return;          // ⇐ Mobil: gar nichts tun 28.11.
      clearGhost();
    }, { passive:true });

    // Touch: kurz zeigen
    card.addEventListener('touchstart', () => {
      if (isMobile()) return;          // ⇐ Mobil: gar nichts tun 28.11.
      clearGhost();
      ghost = makeGhost(card);
      if (!cleanupScheduled){
        cleanupScheduled = true;
        setTimeout(() => { clearGhost(); cleanupScheduled = false; }, 800);
      }
    }, { passive:true });
  });
}

// Beim Scrollen/Resize Ghost entfernen (Position wäre sonst falsch)
window.addEventListener('scroll', clearGhost, { passive:true });
window.addEventListener('resize', clearGhost, { passive:true });

// initial + wenn Produkte neu gerendert werden
if (document.readyState !== 'loading') bind();
else document.addEventListener('DOMContentLoaded', bind);

document.addEventListener('products-updated', () => {
  if (window.__hoverFreeze) return;
  updateCols();                   // <— NEU 28.11.
  resetStart();
});

})();


/* === Arrow Guard: Pfeile DOM-last + Ghost wegräumen === */
(() => {
  const row   = document.querySelector('.products-row');
  if (!row) return;

  const left  = row.querySelector('.products-arrow.left');
  const right = row.querySelector('.products-arrow.right');

  // Pfeile an das Ende der .products-row hängen (oberste Ebene im Stacking)
  if (left)  row.appendChild(left);
  if (right) row.appendChild(right);

  // Beim Pfeil-Down: Ghost/Layers sicher entfernen, damit nichts blockiert
  [left, right].filter(Boolean).forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();    // nix „darunter“ bekommt das Event
      // Hover-Ghost (falls noch da) entfernen
      window.__clearHoverGhost?.();
      const layer = document.getElementById('productsHoverLayer');
      if (layer) layer.innerHTML = '';
    }, { capture:true });
  });
})();


/* ===== ULTIMATE ARROW GUARD (global, capture) ===== LÖSCHEN AB HIER WENN NICHT GEHT*/
(() => {
  const row   = document.querySelector('.products-row');
  const track = document.getElementById('productsGrid');
  if (!row || !track) return;

  const getGap = () => {
    const g = getComputedStyle(track).gap || '24px';
    const n = parseFloat(g);
    return Number.isFinite(n) ? n : 24;
  };
  const cardW = () => track.querySelector('.offer')?.getBoundingClientRect().width || 0;
  const step  = () => cardW() + getGap();

  const getColsVar = () => {
    const v = getComputedStyle(row).getPropertyValue('--cols');
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const fallbackCols = () => {
    const s = step();
    return s ? Math.max(1, Math.floor((track.clientWidth + getGap()) / s)) : 1;
  };
  const pageSize = () => getColsVar() || fallbackCols();

  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const index     = () => {
    const s = step() || 1;
    return Math.round(track.scrollLeft / s);
  };
  const gotoIndex = (i) => {
    const s = step();
    if (!s) return;
    const tgt = Math.max(0, Math.min(maxScroll(), Math.round(i) * s));
    track.scrollLeft = tgt;                 // kein smooth → nie halbe Karten
    updateArrows();
  };

  function updateArrows(){
    const x = track.scrollLeft;
    const atStart = x <= 2;
    const atEnd   = x >= maxScroll() - 2;
    row.classList.toggle('is-at-start', atStart);
    row.classList.toggle('is-at-end',   atEnd);
  }

  // Falls noch ein Hover-Ghost existiert: wegräumen vor dem Klick
  function clearGhost() {
    window.__clearHoverGhost?.();
    const layer = document.getElementById('productsHoverLayer');
    if (layer) layer.innerHTML = '';
  }

  function onArrow(dir){
    clearGhost();
    const jump = pageSize();               // 2/3/4/5/6 je nach --cols
    gotoIndex(index() + dir * jump);
  }

  // Globaler „Abfang“-Handler (capture): gewinnt GEGEN ALLES
  function handler(ev){
    const btn = ev.target && (ev.target.closest?.('.products-arrow'));
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const dir = Number(btn.dataset.dir || 1);   // -1 / +1
    onArrow(dir);
  }

  document.addEventListener('pointerdown', handler, { capture:true });
  document.addEventListener('click',       handler, { capture:true });

  // Start sauber, damit keine halben Karten sichtbar sind
  function reset(){
    try { track.scrollLeft = 0; } catch {}
    // Zentrieren, wenn weniger als eine „Seite“ Karten vorhanden
    const cards = track.querySelectorAll('.offer').length;
    track.style.justifyContent = (cards <= pageSize()) ? 'center' : 'flex-start';
    updateArrows();
  }

  window.addEventListener('resize', reset);
  document.addEventListener('products-updated', () => {
    if (!window.__hoverFreeze) reset();
  });

  reset();
})();


// ===========================================
// Rücksprung von checkout → Shop-Bereich (#offers)
// ===========================================
if (location.pathname.endsWith("index.html") && location.hash === "#offers") {
  window.addEventListener("load", () => {
    const el = document.getElementById("offers");
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  });
}

/* ============ Öffentliche Ansicht per /:slug (Hook) ============ */
(() => {
  if (EDIT_MODE) return; // nur Public

  // z.B. /acme
  const slug = location.pathname.replace(/^\/+|\/+$/g,'');
  if (!slug || slug === 'index.html') return;

  // Hier könntest du später pro-Slug Daten laden (DB/API).
  // Aktuell: Prototype-Phase – kein Überschreiben von localStorage nötig.
  // z.B.:
  // fetch(`/api/public-profile?slug=${encodeURIComponent(slug)}`)
  //   .then(r=>r.json()).then(({conf, products}) => { ...apply... });
})();

})();
