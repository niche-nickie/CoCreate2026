// CoCreate 2026 — Project Hub
// Static, client-side. Report/Ask uses a local access list + localStorage — no real backend.
// All project content lives in DATA and is editable in-browser via Edit Mode (persisted to localStorage).

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const SHOW_START = new Date('2026-09-09');
const IMG_CACHE_BUST = '?v=20260818f';  // bump to bust image CDN cache

const ACCESS_LIST = {
  'nickie@nichemusa.com': 'Nickie Wang',
  'nickie.w@artsolutemediagroup.com': 'Nickie Wang',
  'calviny@artsolutemediagroup.com': 'Calvin Yee',
  'ariana.h@artsolutemediagroup.com': 'Ariana',
  'iris.x@artsolutemediagroup.com': 'Iris',
  'jose.m@artsolutemediagroup.com': 'Jose',
  'jin.c@artsolutemediagroup.com': 'Jin',
};

const RANGE_START = new Date('2026-06-01');
const RANGE_END = new Date('2026-10-15');

function daysBetween(a, b){ return Math.round((b - a) / 86400000); }
function pct(date){ return (daysBetween(RANGE_START, date) / daysBetween(RANGE_START, RANGE_END)) * 100; }
function fmtDate(d){ return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function escapeHtml(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Safe to embed inside a single-quoted JS string literal that itself sits inside an HTML attribute (onclick="...").
function jsAttrEscape(s){
  return escapeHtml(s).replace(/'/g, '&#39;').replace(/\\/g, '\\\\');
}

function initials(name){
  const clean = name.split('(')[0].split('/').pop().trim();
  const parts = clean.split(' ').filter(Boolean);
  return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
const AVATAR_PALETTE = ['#b09a6a', '#8fa3ae', '#7d8c7c', '#8c7c93', '#a6875c', '#bd5d4c'];
function colorForName(name){
  let h = 0;
  for(let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const TAG_STYLES = {
  Lead: { bg: 'rgba(176,154,106,0.18)', color: '#b09a6a' },
  AMG: { bg: 'rgba(143,163,174,0.18)', color: '#8fa3ae' },
  Client: { bg: 'rgba(189,93,76,0.18)', color: '#bd5d4c' },
};

const ZONE_ICONS = { 'Registration': '🏛', 'Core Display': '🔤', 'Keynote Hall': '🎤', 'AMA / Influencer Hub': '📷', 'Match Meeting': '🤝', 'Mini Panel': '🎙', 'Buyer Story': '📖', 'Unboxing Live': '📦', 'Next-Gen Sourcing + AI': '🤖', 'Podcast': '🎧', 'Chongqing Pavilion': '🏮', 'National Pavilion': '🌐', 'Sourcing Hub': '🔎', 'Sponsor Booths 15+1': '🏷', 'Supplier A200 — Block A': '🅰️', 'Supplier A200 — Block B': '🅱️', 'Supplier A200 — Block C': '©️', 'Supplier A200 — Block D': '🅳', 'Supplier A200 — Block E': '🅴', 'Supplier Non-A200 — Block F': '🅵', 'Supplier Non-A200 — Block G': '🅶', 'Muse Booth': '🎨', 'UED Booth': '💻', 'Creator Market': '🧵', 'Agentic Robotics Arena': '🦾' };

function gallery(slug, count){
  return Array.from({ length: count }, (_, i) => `${slug}-${i + 1}`);
}

// Generates individual bookable units within a zone (e.g. 19 sponsor booths).
// Each unit starts as a copy of the zone's default checklist, then diverges independently
// once a real exhibitor is assigned — its own label/status/req, its own photo if given one.
function makeUnits(prefix, count, reqTemplate, labelFn){
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    label: labelFn ? labelFn(i + 1) : `Booth ${i + 1}`,
    status: 'TBD',
    req: [...reqTemplate],
  }));
}

// Like makeUnits, but for zones where different tiers of booth get different specs
// (e.g. sponsor tiers: size, light count, furniture all differ by tier).
function makeTieredUnits(prefix, tiers, labelFn, renderFn){
  const units = [];
  let seq = 0;
  tiers.forEach(tier => {
    for(let i = 1; i <= tier.count; i++){
      seq++;
      units.push({
        id: `${prefix}-${tier.key}-${i}`,
        label: labelFn ? labelFn(seq) : (tier.count > 1 ? `${tier.name} ${i} (${tier.sqm})` : `${tier.name} (${tier.sqm})`),
        status: 'TBD',
        req: [...tier.req],
        renders: tier.renders ? [...tier.renders] : (renderFn ? renderFn(seq) : undefined),
        drawings: tier.drawings ? [...tier.drawings] : undefined,
      });
    }
  });
  return units;
}

// Tier definitions, pulled from the design brief renderings — one tier = one gallery photo,
// so the zone modal can show the matching checklist as you flip through Category overview photos.
const SPONSOR_COMMUNITY_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '2× LED arm light', 'Grey carpet', '— YOUNGS —', 'Pop-up display (3000×2500mm)', 'Furniture + fabric display'];
const SPONSOR_ASSOCIATE_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '1× 42" TV + stand + Media Player', '4× LED arm light', 'Grey carpet', '— YOUNGS —', 'Pop-up display (3500×2500mm)', 'High table + bar stools ×1 set', 'Furniture + fabric display'];
const SPONSOR_EXECUTIVE_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '1× 42" TV + stand + Media Player', '6× LED arm light', 'Grey carpet', '— YOUNGS —', 'L-shaped pop-up display (5000×2500mm + 3000×2500mm)', 'High table + bar stools ×2 sets', 'Furniture + fabric display'];
const SPONSOR_PREMIER_REQ = ['1× Custom Counter — 1800W×500H×1000D, wooden joinery', '1× 42" TV wall mount + Media Player', '7× LED arm light', 'Grey carpet', 'L-shaped wall structure (5000×2500mm + 4000×2500mm)', '2× Full-height wall graphic, front only', '— YOUNGS —', 'Round meeting table + chairs ×2 sets', 'Furniture'];

const R_8X8 = ['sponsor-booths-2'];
const R_10X10 = ['sponsor-booths-3'];
const R_10X15 = ['sponsor-booths-4'];
const R_10X20 = ['sponsor-booths-5'];
const D_8X8 = ['sponsor-dwg-1'];
const D_10X10 = ['sponsor-dwg-2'];
const D_10X15 = ['sponsor-dwg-3'];
const D_10X20 = ['sponsor-dwg-4'];

const SPONSOR_TIERS = [
  { key:'p01', name:'P-01', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p02', name:'P-02', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p03', name:'P-03', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p04', name:'P-04', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p05', name:'P-05', sqm:'10×20ft 空地', count:1, req: [], renders: ['sponsor-booths-empty'] },
  { key:'p06', name:'P-06', sqm:'10×20ft', count:1, req: SPONSOR_PREMIER_REQ, renders: R_10X20, drawings: D_10X20 },
  { key:'p07', name:'P-07', sqm:'10×15ft', count:1, req: SPONSOR_EXECUTIVE_REQ, renders: R_10X15, drawings: D_10X15 },
  { key:'p08', name:'P-08', sqm:'10×15ft', count:1, req: SPONSOR_EXECUTIVE_REQ, renders: R_10X15, drawings: D_10X15 },
  { key:'p09', name:'P-09', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p10', name:'P-10', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p11', name:'P-11', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p12', name:'P-12', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p13', name:'P-13', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8, drawings: D_8X8 },
  { key:'p14', name:'P-14', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: R_10X10, drawings: D_10X10 },
  { key:'p15', name:'P-15', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: R_10X10, drawings: D_10X10 },
  { key:'p16', name:'P-16', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: R_10X10, drawings: D_10X10 },
];

const ZONE_A_TIER = [
  { key:'a01', name:'A-01', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a02', name:'A-02', sqm:'8m²', count:1, renders: ['zone-a-render-9', 'zone-a-render-10'], req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a03', name:'A-03', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','7x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a04', name:'A-04', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','24x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture','2× Wire Grid 550×1100×50 (Youngs)'] },
  { key:'a05', name:'A-05', sqm:'8m²', count:1, renders: [], req: [] },
  { key:'a06', name:'A-06', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','10x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','28x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a07', name:'A-07', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a08', name:'A-08', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*400 (D), Shelf, Formica (WHT)','11x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','30x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'a09', name:'A-09', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','27x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
];
const ZONE_B_TIER = [
  { key:'b01', name:'B-01', sqm:'8m²', count:1, renders: ['zone-b-render-13', 'zone-b-render-14'], req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b02', name:'B-02', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b03', name:'B-03', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b04', name:'B-04', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b05', name:'B-05', sqm:'16m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b06', name:'B-06', sqm:'12m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'b07', name:'B-07', sqm:'8m²', count:1, renders: ['zone-b-render-1', 'zone-b-render-2'], req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
];
const ZONE_C_TIER = [
  { key:'c01', name:'C-01', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'c02', name:'C-02', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','10x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','20x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c03', name:'C-03', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c04', name:'C-04', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','6x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c05', name:'C-05', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','5x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','15x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c06', name:'C-06', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','8x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c07', name:'C-07', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','6x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','18x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c08', name:'C-08', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','14x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c09', name:'C-09', sqm:'14m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','1x) Display Shelving — 1452W×1700H×440D, Curved, Formica (WHT)','— YOUNGS —','Furniture'] },
  { key:'c10', name:'C-10', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','12x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','27x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c11', name:'C-11', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'c12', name:'C-12', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','5x) 1700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','20x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'c13', name:'C-13', sqm:'26m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','— YOUNGS —','Furniture'] },
];
const ZONE_D_TIER = [
  { key:'d01', name:'D-01', sqm:'14m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','2x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1000 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1950 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','14x) 10" Metal L-Bracket (WHT)','1x) Display Shelving — 1452W×1700H×440D, Curved, Formica (WHT)','— YOUNGS —','Furniture'] },
  { key:'d02', name:'D-02', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','16x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'d03', name:'D-03', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','12x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'d04', name:'D-04', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1800 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','13x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'d05', name:'D-05', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'d06', name:'D-06', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1800 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','13x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'d07', name:'D-07', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'d09', name:'D-09', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','7x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','22x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'d10', name:'D-10', sqm:'10m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1400 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','16x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
];
const ZONE_E_TIER = [
  { key:'e01', name:'E-01', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','7x) 10" Metal L-Bracket (WHT)','1× 4\'-6" Clothes Rack','1× 5\'-0" Clothes Rack','— YOUNGS —','Furniture'] },
  { key:'e02', name:'E-02', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'e03', name:'E-03', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','8x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','24x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
  { key:'e04', name:'E-04', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','6x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','12x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture','4× Wire Grid 550×1100×50 (Youngs)'] },
  { key:'e05', name:'E-05', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2× 5\'-0" Clothes Rack','4× 12" Rod for Clothes, Wall Mount','— YOUNGS —','Furniture','1× Wire Grid 550×1100×50 (Youngs)'] },
  { key:'e06', name:'E-06', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) Display Case — 1902W×2092H×150D, Formica (WHT)','— YOUNGS —','Furniture'] },
  { key:'e07', name:'E-07', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1000 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','10x) 10" Metal L-Bracket (WHT)','11× Hat/Coat Hook','— YOUNGS —','Furniture'] },
  { key:'e08', name:'E-08', sqm:'8m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','8x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','6x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','28x) 10" Metal L-Bracket (WHT)','— YOUNGS —','Furniture'] },
];
const ZONE_F_TIER = [
  { key:'sm', name:'Booth', sqm:'6m²', count:11, req: ['42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
  { key:'md', name:'Booth', sqm:'8m²', count:8, req: ['42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
  { key:'lg', name:'Booth', sqm:'14m²', count:2, req: ['42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
];
const ZONE_G_TIER = [
  { key:'sm', name:'Booth', sqm:'8m²', count:9, req: ['42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
  { key:'lg', name:'Booth', sqm:'14m²', count:2, req: ['42" TV + stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
];
const ZONE_CQ_TIER = [
  { key:'cq1', name:'CQ-1', sqm:'9m²', count:1, req: ['1× Std No Skin Panel — 3000W×2413H×500D','1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','1× Fabric Graphic — 2966×2409mm, RX-101 Channel 9ft','Black+Orange Carpet'] },
  { key:'cq2', name:'CQ-2', sqm:'9m²', count:1, req: ['1× Std No Skin Panel — 3000W×2413H×500D','1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','1× Fabric Graphic — 2966×2409mm, RX-101 Channel 9ft','Black+Orange Carpet'] },
  { key:'cq3', name:'CQ-3', sqm:'9m²', count:1, req: ['1× Std No Skin Panel — 3000W×2413H×500D','1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','1× Fabric Graphic — 2966×2409mm, RX-101 Channel 9ft','Black+Orange Carpet'] },
  { key:'cq4', name:'CQ-4', sqm:'9m²', count:1, req: ['1× Std No Skin Panel — 3000W×2413H×500D','1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','1× Fabric Graphic — 2966×2409mm, RX-101 Channel 9ft','Black+Orange Carpet'] },
];

const ZONE_GB_TIER = [
  { key:'us', name:'GB-US', sqm:'4m²', count:20, req: ['Grey carpet', '2× LED arm light'] },
  { key:'pk', name:'GB-Pakistan', sqm:'4m²', count:11, req: ['Grey carpet', '2× LED arm light'] },
  { key:'ot', name:'GB-Others', sqm:'4m²', count:10, req: ['Grey carpet', '2× LED arm light'] },
];

// Booth ID labels with individual sqm from floor plan
const BOOTH_LABELS = {
  a: ['A-01 (8m²)','A-02 (8m²)','A-03 (8m²)','A-04 (8m²)','A-05 (8m²)','A-06 (8m²)','A-07 (8m²)','A-08 (8m²)','A-09 (8m²)'],
  b: ['B-01 (8m²)','B-02 (8m²)','B-03 (8m²)','B-04 (8m²)','B-05 (8+8m²)','B-06 (8+4m²)','B-07 (8m²)'],
  c: ['C-01 (8m²)','C-02 (8m²)','C-03 (8m²)','C-04 (8m²)','C-05 (8m²)','C-06 (8m²)','C-07 (8m²)','C-08 (8m²)','C-09 (14m²)','C-10 (8m²)','C-11 (8m²)','C-12 (8m²)','C-13 (8+18m²)'],
  d: ['D-01 (14m²)','D-02 (8m²)','D-03 (8m²)','D-04 (8m²)','D-05 (8m²)','D-06 (8m²)','D-07 (8m²)','D-09 (8m²)','D-10 (8+2m²)'],
  e: ['E-01 (8m²)','E-02 (8m²)','E-03 (8m²)','E-04 (8m²)','E-05 (8m²)','E-06 (8m²)','E-07 (8m²)','E-08 (8m²)'],
  f: ['F-01 (8m²)','F-02 (8m²)','F-03 (6m²)','F-04 (6m²)','F-05 (6m²)','F-06 (6m²)','F-07 (6m²)','F-08 (6m²)','F-09 (6m²)','F-10 (6m²)','F-11 (8m²)','F-12 (8m²)','F-13 (14m²)','F-14 (8m²)','F-15 (8m²)','F-16 (4m²)','F-17 (4m²)','F-18 (4m²)','F-19 (8m²)','F-20 (8m²)','F-21 (14m²)'],
  g: ['G-01 (8m²)','G-02 (8m²)','G-03 (8m²)','G-04 (8m²)','G-05 (8m²)','G-06 (8m²)','G-07 (14m²)','G-08 (14m²)','G-09 (8m²)','G-10 (8m²)','G-11 (8m²)'],
  cq: ['CQ-1 (9m²)','CQ-2 (9m²)','CQ-3 (9m²)','CQ-4 (9m²)'],
  gb: ['GB-01 (4m²)','GB-02 (4m²)','GB-03 (4m²)','GB-04 (4m²)','GB-05 (4m²)','GB-06 (4m²)','GB-07 (4m²)','GB-08 (4m²)','GB-09 (4m²)','GB-10 (4m²)','GB-11 (4m²)','GB-12 (4m²)','GB-13 (4m²)','GB-14 (4m²)','GB-15 (4m²)','GB-16 (4m²)','GB-17 (4m²)','GB-18 (4m²)','GB-19 (4m²)','GB-20 (4m²)','GB-21 (4m²)','GB-22 (4m²)','GB-23 (4m²)','GB-24 (4m²)','GB-25 (4m²)','GB-26 (4m²)','GB-27 (4m²)','GB-28 (4m²)','GB-29 (4m²)','GB-30 (4m²)','GB-31 (4m²)','GB-32 (4m²)','GB-33 (4m²)','GB-34 (4m²)','GB-35 (4m²)','GB-36 (4m²)','GB-37 (4m²)','GB-38 (4m²)','GB-39 (4m²)','GB-40 (4m²)','GB-41 (4m²)'],
};

// Supplier English short names (0818 floor plan) — keyed by booth ID
const SUPPLIER_EN = {
  'A-01':'Wenzhou Baoshijie','A-02':'Ningbo Youyi','A-03':'Choebe','A-04':'Zhejiang Minghui','A-06':'Sowin','A-07':'OPT','A-08':'Xiamen Xiefa','A-09':'Fuzhou Sencai',
  'B-01':'Shandong Nuoman','B-02':'Shanghai Kaiwei','B-03':'Henan Zhongyu Dingli','B-04':'Suzhou Transparent','B-05':'Shandong Eachan','B-06':'Shandong Raytop','B-07':'Suzhou Tongda',
  'C-01':'Ningbo Super','C-02':'Dongguan Yujie','C-03':'Charming','C-04':'Beijing Doorwin','C-05':'Masuma','C-06':'Xiamen Mingyuansheng','C-07':'Xiamen Hym','C-08':'Shenzhen Ejeas','C-09':'Foshan Fuson','C-10':'Zhangzhou Builder','C-11':'Guangdong Dejiyoupin','C-12':'SACA','C-13':'Qingdao Seahisun',
  'D-01':'Biocaro','D-02':'Huion','D-03':'Quanzhou Binqi','D-04':'Xiamen Weiyou','D-05':'Gardensun','D-06':'Chiyang','D-07':'Superlaser','D-09':'Rundarongjia','D-10':'EMOKA',
  'E-01':'Healy','E-02':'Heniemo','E-03':'Funan Willow','E-04':'Bright Show','E-05':'YSTAR','E-06':'Allbright','E-07':'Yuze','E-08':'Sentron',
};

// ---------- Default content (source of truth until the user edits it) ----------

const DEFAULT_DATA = {

GANTT_ROWS: [
  { label: 'Confirm show dates + scope', owner: 'Nickie / Marshal', start: '2026-06-15', end: '2026-07-19', color: 'green', note: 'Done' },
  { label: 'Design brief received (V1)', owner: 'Marshal', point: '2026-07-10', color: 'green', note: 'Initial proposal' },
  { label: 'Full scope confirmed (V1 complete)', owner: 'Nickie', point: '2026-07-19', color: 'green', note: '20 zones, 100+ booths · Next-Gen still pending' },
  { label: 'Venue license (Youngs → LACC)', owner: 'Youngs', start: '2026-06-01', end: '2026-07-15', color: 'amber', note: 'Still unconfirmed — blocking' },
  { label: 'Submit GSC Application', owner: 'AMG', start: '2026-07-20', end: '2026-08-05', color: 'blue', note: 'Blocked until venue license confirmed' },
  { label: 'HARD: Union labor docs → LACC', owner: 'AMG', point: '2026-06-08', color: 'red', note: '90-day rule — breached, escalate with LACC' },
  { label: 'AMG engineering + drawings (full scope)', owner: 'AMG', start: '2026-07-20', end: '2026-08-10', color: 'blue', note: 'Compressed — full scope only confirmed Jul 19' },
  { label: 'First quote sent (received zones)', owner: 'Nickie / Calvin', start: '2026-07-21', end: '2026-08-01', color: 'green', note: 'Sent Aug 1 — zones with designs in hand; TBD zones + add-ons to follow' },
  { label: 'Quote approved · 75% deposit', owner: 'Youngs', start: '2026-07-28', end: '2026-08-07', color: 'amber', note: 'Needed before fabrication ramps up' },
  { label: 'Youngs: 80% design confirm', owner: 'Youngs', point: '2026-08-07', color: 'amber', note: 'Gates stage/backdrop + custom fabrication' },
  { label: 'Fab — stage/backdrop + custom', owner: 'AMG shop', start: '2026-08-08', end: '2026-09-02', color: 'blue', note: 'AMA/Breakout/Match + Creator Market/Next-Gen — starts after 80% confirm' },
  { label: 'Youngs: booths + graphics + signs confirm', owner: 'Youngs', point: '2026-08-17', color: 'amber', note: 'Gates merchant-booth + graphics/sign fabrication' },
  { label: 'Fab — merchant booths + graphics/signs', owner: 'AMG shop', start: '2026-08-18', end: '2026-09-03', color: 'blue', note: 'Supplier/sponsor booths + hanging signs — starts after Aug 17 confirm' },
  { label: 'Youngs: add-on pop-ups confirm', owner: 'Youngs', point: '2026-08-26', color: 'amber', note: 'Gates pop-up fabrication — tightest gate' },
  { label: 'Fab — add-on pop-ups', owner: 'AMG shop', start: '2026-08-27', end: '2026-09-04', color: 'blue', note: '⚠ Very tight — must finish before freight departs (Sep 4)' },
  { label: 'HARD: Scaled floor diagrams → LACC', owner: 'AMG', point: '2026-08-08', color: 'red', note: '30-day rule' },
  { label: 'Fire permit → LAFD', owner: 'AMG', point: '2026-08-19', color: 'amber', note: '21-day rule' },
  { label: 'Next-Gen Sourcing + AI zone design', owner: 'Design team', start: '2026-07-20', end: '2026-08-25', color: 'amber', note: 'Design not yet received — separate blocking track' },
  { label: 'Freight La Puente → LACC', owner: 'AMG', start: '2026-09-04', end: '2026-09-06', color: 'blue', note: 'Departs Sep 4–6' },
  { label: 'Installation', owner: 'AMG crew', start: '2026-09-07', end: '2026-09-08', color: 'green', note: '' },
  { label: 'CoCreate 2026 — SHOW', owner: 'Milestone', start: '2026-09-09', end: '2026-09-10', color: 'orange', note: '' },
  { label: 'Dismantle', owner: 'AMG crew', start: '2026-09-11', end: '2026-09-11', color: 'green', note: '' },
],

PHASES: [
  { phase: 'Confirm dates + scope brief', dates: 'Jun–Jul 19, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: 'Show dates Sep 9–10 confirmed' },
  { phase: 'Design brief received (V1)', dates: 'Jul 10, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: 'Initial proposal' },
  { phase: 'Full scope confirmed (V1 complete)', dates: 'Jul 19, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: '20 zones, 100+ booths, 70+ TVs — Next-Gen zone still TBD' },
  { phase: 'Venue license (Youngs → LACC)', dates: 'Aug 7, 2026', duration: '—', status: 'done', statusLabel: 'Received ✅', notes: 'Venue license received Aug 7. Event manager assigned.' },
  { phase: 'Union labor documentation', dates: 'Was due Jun 8', duration: '—', status: 'hard', statusLabel: 'Breached', notes: '90-day rule missed — venue license/GSC application weren\'t ready in time. Needs LACC escalation.' },
  { phase: 'GSC Application submitted', dates: 'Starting Aug 7', duration: '—', status: 'progress', statusLabel: 'In progress', notes: 'Venue license received — AMG now applying. Jose leading + 楊思 tracking LACC deadlines.' },
  { phase: 'AMG engineering + production drawings (full scope)', dates: 'Jul 20 → Aug 10', duration: '~3 weeks', status: 'progress', statusLabel: 'In progress', notes: 'Compressed — full scope only confirmed Jul 19, ~10 weeks later than originally planned' },
  { phase: 'AMG quote issued + approved', dates: 'First quote Aug 1', duration: '—', status: 'progress', statusLabel: 'First quote sent', notes: 'First quote sent Aug 1 for zones with designs received; Keynote/Match/Next-Gen + add-ons still to quote. Client approval + 75% deposit next.' },
  { phase: 'Youngs design confirmations (gate fabrication)', dates: '80% Aug 7 · booths/graphics Aug 17 · pop-ups Aug 26', duration: '—', status: 'unconfirmed', statusLabel: 'Deadlines set', notes: 'Deadlines issued to Youngs — each confirm releases its fabrication tranche' },
  { phase: 'Fabrication — staged by confirm gate', dates: 'Aug 8 → Sep 5', duration: '~4 weeks', status: 'notstarted', statusLabel: 'Not started', notes: 'Stage/backdrop+custom after Aug 7 · booths+graphics after Aug 17 · pop-ups after Aug 26 (⚠ tight vs freight Sep 4)' },
  { phase: 'Scaled floor diagrams → LACC', dates: 'By Aug 8', duration: '—', status: 'hard', statusLabel: 'Hard deadline', notes: '30 days prior to move-in — now overlaps fabrication start' },
  { phase: 'Fire permit → LAFD', dates: 'By Aug 19', duration: '—', status: 'watch', statusLabel: 'Watch', notes: '21 days prior' },
  { phase: 'Next-Gen Sourcing + AI zone', dates: 'Received Aug 11', duration: '—', status: 'progress', statusLabel: 'Scope received', notes: '7-page scope received. AMG + JT + Youngs. Under review.' },
  { phase: 'Freight dispatch to LACC', dates: 'Sep 4–6', duration: '3 days', status: 'notstarted', statusLabel: 'Not started', notes: 'La Puente → LACC' },
  { phase: 'Installation (I&D)', dates: 'Sep 7–8', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: 'Union labor' },
  { phase: 'Show days', dates: 'Sep 9–10', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: '' },
  { phase: 'Dismantle', dates: 'Sep 11', duration: '1 day', status: 'notstarted', statusLabel: 'Not started', notes: '' },
],

OPEN_ITEMS: [
  { owner: 'Nickie', urgent: false, text: 'UED client wants to visit warehouse to test their products — printer + thermal transfer printer will be shipped to us. Timing TBD (client lands 9/4, may test 9/5 or weekend; Monday not possible). Coordinate with Tony (Youngs).' },
  { owner: 'Calvin - AMG / Jose / Brianna', urgent: false, text: 'Third-party products via Youngs — Youngs will have third parties bring their products in, so recommend Youngs charge them material handling. Need to clarify scope + whether we need a marshaling yard. Check with Richard where to store empties. Also create a shipping label + shipping instructions for Youngs to give to exhibitors.' },
  { owner: 'Calvin', urgent: false, text: 'Quote — remaining zones. First quote sent Aug 1 for zones with designs received. Still need to quote Keynote, Match Meeting, and Next-Gen once their designs land + any Youngs add-ons (pop-ups, extra counters).' },
  { owner: 'Chris', urgent: false, text: 'UED Booth reuse — confirmed. Booth ships to San Francisco after CoCreate for reuse at a follow-up event — Plug and Play, Sunnyvale CA, Sep 13 2026, 2:30–6pm PT, same-day load-in/teardown. Need a separate quote for the shipping + reuse.' },
],

DONE_ITEMS: [
  { owner: 'Nickie · Done', text: 'Confirm show dates + scope with Marshal' },
  { owner: 'Marshal · Done', text: 'Design brief V1 received (Jul 10)' },
  { owner: 'Calvin · Done', text: 'AMG COI coverage levels for LACC. Must confirm policy covers: $1M CGL / $2M aggregate / $2M umbrella / $1M workers comp / $1M auto. Additional insured: AEG Management LACC LLC, City of LA, ASM Global Parent Inc.' },
  { owner: 'Youngs · Done', text: 'LACC venue license status. GSC application cannot be submitted until LACC licenses the event. Current status unknown.' },
],

RISKS: {
  high: [
    { title: 'Union labor documentation deadline already breached', body: 'The 90-day rule required union labor documentation at LACC by June 8. That date has passed — venue license and GSC application were not ready in time. This needs immediate escalation with LACC to determine whether an exception or expedited path exists; it cannot be fixed by rescheduling.' },
    { title: 'Production schedule compressed from ~8 weeks to ~5', body: 'Full design scope wasn\'t confirmed until Jul 19 — about 10 weeks later than originally planned. Engineering, quote approval, and fabrication now have to happen back-to-back-to-back between now and the Sep 7 install, with no slack for revisions or delays.' },
    { title: 'GSC Application — now filing', body: 'Venue license received Aug 7. AMG now applying for GSC status at LACC. Jose is handling the application; 楊思 tracking LACC deadlines. Approval timeline still TBD, but submission unblocked.' },
    { title: 'Hanging banners require LACC-authorized rigger', body: 'Chongqing Pavilion (square, double-sided) and LA City Pavilion (circle, double-sided) both require ceiling-hung banners. Rigging is outside AMG\'s GSC scope — must engage separate LACC-authorized rigger. Only ONE rigger contractor allowed per event. Must be named on GSC application.' },
    { title: 'Next-Gen scope received Aug 11', body: '7-page scope document. AMG + JT + Youngs split. Under engineering review — can now proceed with drawings and quote.' },
  ],
  medium: [
    { title: 'Scale — 70+ supplier/sponsor booths', body: 'This is a fundamentally different scope from CoCreate 2025 ($475k, single-zone build). CoCreate 2026 includes 100+ individual booth builds across multiple pavilions, requiring significant I&D labor and crew coordination. Crew blackout Sep 9–11 (show + dismantle) is already fixed.' },
    { title: 'HVAC cost during install/dismantle', body: 'LACC charges $325/hr per hall section during install (Sep 7–8) and dismantle (Sep 11). Must be in Youngs\' budget — not in any quote yet.' },
    { title: 'Breakout Session stage height', body: 'Two Breakout Session stages with wooden platform. If height exceeds 30 inches, LACC requires wet-stamped engineering plans + City of LA Building Safety inspection. Confirm dimensions with design team.' },
    { title: 'Covered structures (fire code)', body: 'Any enclosed/covered zone exceeding 750 sqft requires Automatic Fire Sprinkler System (AFSS). Review all zone designs with canopy/ceiling elements against this limit.' },
  ],
},

ZONES: [
  { name: 'Registration', owner: 'Ari', status: 'Approved', img: 'registration-v2-2', renders: ['registration-v2-2'], drawings: ['registration-dwg-1'], scope: 'AMG provide registration backdrop, front and back graphic.column graphics', flag: 'Lobby area',
    req: ['2× Std Door Panel — White Formica (990×2413×100)', '23× Std Trainel — Raw Wood (990×2413×100)', '12× Std LED arm light', '1× BO fabric — back wall front (REG-BK-WALL-FRT, 9896×2409, 4/0)', '1× BO fabric — back wall back (REG-BK-WALL-BK, 9896×2409, 4/0)', '1× Curved PVC column cover w/ Velcro (COLUMN-COVER, 4/0)', 'RX-101 fabric channel — 164 ft', 'From client (Youngs): 6× 8ft table cloth, 7× stanchion sign support, 28× stanchions'] },
  { name: 'Keynote Hall', owner: 'Ari', status: 'Quoted', img: 'keynote-dark', renders: ['keynote-dark', 'keynote-plan'], scope: 'Carpet removed. All by Youngs / Client.', flag: '⚠ Carpet removed', blocking: true, req: ['All other items — by Youngs / Client'] },
  { name: 'AMA / Influencer Hub', owner: 'Iris', status: 'No quote needed', img: 'ama-hub-render-1', renders: ['ama-hub-render-1'], scope: 'YOUNGS X JOHNATHAN — Banner ×6, Stage, Furniture by Youngs', flag: 'YOUNGS X JOHNATHAN', req: [] },

  { name: 'Match Meeting', owner: 'Chris', status: 'In Review', img: 'match-meeting-render-1', renders: ['match-meeting-render-1', 'match-meeting-render-2'], scope: 'YOUNGS X JOHNATHAN — Furniture by Youngs', flag: 'AMG provide TV', req: ['3× 65" TV with stand'] },
  { name: 'Mini Panel', owner: 'Ari', status: 'No quote needed', img: 'mini-panel-render-1', renders: ['mini-panel-render-1', 'mini-panel-render-2'], scope: 'YOUNGS X JOHNATHAN — Mini Panel ×2, LED 4×2.5m, Banner ×2 each, Stage, Furniture by Youngs', flag: 'YOUNGS X JOHNATHAN', req: [] },
  { name: 'Core Display', owner: 'Ari', status: 'No quote needed', img: 'core-display-v2-2', renders: ['core-display-v2-2'], scope: 'Youngs provide', flag: 'YOUNGS', req: [] },
  { name: 'Next-Gen Sourcing + AI', owner: 'Ari', status: 'Approved', img: 'nextgen-render-1', renders: ['nextgen-render-1', 'nextgen-render-2', 'nextgen-render-3', 'nextgen-render-4', 'nextgen-render-5', 'nextgen-render-6', 'nextgen-render-7'], scope: 'AMG: Hanging Banners, Std+Custom Wood Panels (double-sided graphic), Floor Vinyl ×3, Custom Wood Display ×4, PVC Cut-outs ×3, Banners ×2, Cut-outs ×5, Tilted Wood Platform, 55" TV ×13, 100" TV ×1, Std Counter (9× 990 Black + 5× 495 Black + 1× 990 White + 1× 495 White + 2× 495 Orange), Tables & Stools, Custom Installation. JT: All Mac. All else by Youngs.', flag: 'Structure confirmed 8/17 — AMG+JT+Youngs',
    req: ['9× Std Counter — 990W×1000H×495D, Formica Black', '5× Std Counter — 495W×1000H×495D, Formica Black', '1× Std Counter — 990W×1000H×495D, Formica White', '1× Std Counter — 495W×1000H×495D, Formica White', '2× Std Counter — 495W×1000H×495D, Formica Orange', '13× 55" TV wall mount', '1× 100" TV wall mount', '1× Gray Carpet — 24000 (W)×12000 (L), 3168 sqft'] },
  { name: 'Buyer Story', owner: 'Chris', status: 'Approved', img: 'buyer-story-v2-2', renders: ['buyer-story-v2-2','buyer-story-v2-3','buyer-story-v2-4','buyer-story-v2-5'], scope: 'Youngs provide structure. AMG build + 1× 42" TV + stand + Media Player.', flag: '⚠ Youngs structure · AMG build + TV',
    req: ['Structure (by Youngs)', 'AMG build', '1× 42" TV + stand + Media Player'] },
  { name: 'Unboxing Live', owner: 'Charles', status: 'Approved', img: 'unboxing-live-render-1', renders: ['unboxing-live-render-1'], scope: 'R4 — Display block ×3, Double-sided Pop-up, 55" TV, Furniture by Youngs, Carpet 5584×5584mm', flag: '⚠ R4 — Pop-up + Display blocks + TV', req: ['1× Custom Display Box #03 — 300W×600H×300D, White Formica', '1× Custom Display Box #04 — 300W×650H×300D, White Formica', '1× Custom Display Box #05 — 300W×450H×300D, White Formica', 'Double-sided Pop-up', '1× 55" TV w/ stand', 'Furniture by Youngs', '1× Carpet — 5584 (W)×5584 (L), Finish (Pendent), 343 sqft'] },
  { name: 'Supplier A200 — Block A', owner: 'Jin', status: 'Approved', img: 'zone-a-map-0818', renders: ['zone-a-map-0818'], drawings: [], scope: 'A-01 ~ A-09. 9× 8sqm. Wooden backdrop (4×2.5mH) + 42" TV + stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '9× 8sqm · 9 std counters · AMG shelf',
    req: ['9× Wooden backdrop (4×2.5mH)', '9× 42" TV + stand + Media Player', '9× Std Counter — 990W×1000H×495D, Formica White', '9× Grey carpet (≈792 sqft)', '18× LED arm light', '3× Metal Panel Footing', '— AMG Shelf —', '27× 700mm shelf, Formica (WHT) (23× @300D + 4× @400D A-08)', '4× 900mm shelf, Formica (WHT) (4× @400D A-02)', '3× 1500mm shelf, Formica (WHT)', '82× 450mm shelf, Formica (WHT)', '239× 10" Metal L-Bracket (WHT)', '— YOUNGS —', '9× Furniture', '2× Wire Grid 550×1100×50 (A-04 only)'], tiers: ZONE_A_TIER, units: makeTieredUnits('zone-a', ZONE_A_TIER, i => BOOTH_LABELS.a[i-1], n => [`zone-a-render-${n*2}`, `zone-a-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block B', owner: 'Jin', status: 'Approved', img: 'zone-b-map-0818', renders: ['zone-b-map-0818'], drawings: [], scope: 'B-01 ~ B-07. 5×8m² + 1×12m² + 1×16m². Wooden backdrop (4×2.5mH) + 42" TV + stand + Media Player + Std Counter + Grey carpet. A200 standard build.', flag: '7 booths · 7 std counters · 5×8 + 12 + 16m²',
    req: ['7× Wooden backdrop (4×2.5mH)', '7× 42" TV + stand + Media Player', '7× Std Counter — 990W×1000H×495D, Formica White', '7× Grey carpet (≈748 sqft)', '14× LED arm light', '4× Metal Panel Footing', '— YOUNGS —', '7× Furniture'], tiers: ZONE_B_TIER, units: makeTieredUnits('zone-b', ZONE_B_TIER, i => BOOTH_LABELS.b[i-1], n => [`zone-b-render-${n*2}`, `zone-b-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block C', owner: 'Chris', status: 'Approved', img: 'zone-c-map-0818', renders: ['zone-c-map-0818'], drawings: [], scope: 'C-01 ~ C-13. 11×8m² + 1×14m² + 1×26m². Wooden backdrop (4×2.5mH) + 42" TV + stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '13 booths · 13 std counters · AMG shelf',
    req: ['13× Wooden backdrop (4×2.5mH)', '13× 42" TV + stand + Media Player', '13× Std Counter — 990W×1000H×495D, Formica White', '13× Grey carpet (≈1408 sqft)', '30× LED arm light', '6× Metal Panel Footing', '— AMG Shelf —', '20× 700mm shelf, Formica (WHT)', '12× 450mm shelf, Formica (WHT)', '16× 1500mm shelf, Formica (WHT)', '5× 1700mm shelf, Formica (WHT)', '1× Display Shelving — 1452×1700×440, Curved, Formica (WHT) (C-09)', '132× 10" Metal L-Bracket (WHT)', '— YOUNGS —', '13× Furniture'], tiers: ZONE_C_TIER, units: makeTieredUnits('zone-c', ZONE_C_TIER, i => BOOTH_LABELS.c[i-1], n => [`zone-c-render-${n*2}`, `zone-c-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block D', owner: 'Chris', status: 'Approved', img: 'zone-d-map-0818', renders: ['zone-d-map-0818'], drawings: [], scope: 'D-01 ~ D-07, D-09 ~ D-10. 1×14m² + 7×8m² + 1×10m² = 80m². Wooden backdrop + TV + Std Counter + Grey carpet + AMG shelf & L-bracket.', flag: '9 booths · 9 std counters · AMG shelf (D-08 removed)',
    req: ['9× Wooden backdrop (4×2.5mH)', '9× 42" TV + stand + Media Player', '9× Std Counter — 990W×1000H×495D, Formica White', '9× Grey carpet (≈880 sqft)', '20× LED arm light', '3× Metal Panel Footing', '— AMG Shelf —', '3× 450mm shelf, Formica (WHT)', '9× 700mm shelf, Formica (WHT)', '7× 900mm shelf, Formica (WHT)', '3× 1000mm shelf, Formica (WHT)', '6× 1350mm shelf, Formica (WHT)', '8× 1500mm shelf, Formica (WHT)', '2× 1800mm shelf, Formica (WHT)', '2× 1400mm shelf, Formica (WHT)', '1× 1950mm shelf, Formica (WHT)', '1× Display Shelving — 1452×1700×440, Curved, Formica (WHT) (D-01)', '106× 10" Metal L-Bracket (WHT)', '— YOUNGS —', '9× Furniture'], tiers: ZONE_D_TIER, units: makeTieredUnits('zone-d', ZONE_D_TIER, i => BOOTH_LABELS.d[i-1], n => [`zone-d-render-${n*2}`, `zone-d-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block E', owner: 'Charles', status: 'Approved', img: 'zone-e-map-0818', renders: ['zone-e-map-0818'], drawings: [], scope: 'E-01 ~ E-08. 8× 8m². Wooden backdrop (4×2.5mH) + 42" TV + stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '8× 8m² · 8 std counters · AMG shelf',
    req: ['8× Wooden backdrop (4×2.5mH)', '8× 42" TV + stand + Media Player', '8× Std Counter — 990W×1000H×495D, Formica White', '8× Grey carpet (≈704 sqft)', '16× LED arm light', '4× Metal Panel Footing', '— AMG Shelf —', '17× 450mm shelf, Formica (WHT)', '16× 700mm shelf, Formica (WHT)', '3× 900mm shelf, Formica (WHT)', '3× 1000mm shelf, Formica (WHT)', '1× 1500mm shelf, Formica (WHT)', '1× Display Case — 1902×2092×150, Formica (WHT) (E-06)', '81× 10" Metal L-Bracket (WHT)', '4× Clothes Rack (1×4\'6" + 3×5\'0")', '4× 12" Rod for Clothes', '11× Hat/Coat Hook', '— YOUNGS —', '8× Furniture', '5× Wire Grid 550×1100×50'], tiers: ZONE_E_TIER, units: makeTieredUnits('zone-e', ZONE_E_TIER, i => BOOTH_LABELS.e[i-1], n => [`zone-e-render-${n*2}`, `zone-e-render-${n*2-1}`]) },
  { name: 'Supplier Non-A200 — Block F', owner: 'Iris', status: 'Approved', img: 'zone-f-map', renders: ['zone-f-map'], drawings: [], scope: 'F-01 ~ F-21. 11×6m² + 8×8m² + 2×14m² = 158m². YOUNGS Pop Up. AMG provide counter + TV + lighting + bracket.', flag: '21 booths · 21 std counters · 11/8/2',
    req: ['21× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '21× 42" TV + Media Player + HDMI Cable + Floor Stand', '21× Grey carpet (≈1738 sqft)', '46× LED Arm Light', '26× Popup Bracket for PVC Graphic', '— YOUNGS —', 'Pop Up', 'Displays and shelvings'], tiers: ZONE_F_TIER, units: makeTieredUnits('zone-f', ZONE_F_TIER, i => BOOTH_LABELS.f[i-1], n => [`zone-f-render-${n*2}`, `zone-f-render-${n*2-1}`]) },
  { name: 'Supplier Non-A200 — Block G', owner: 'Charles', status: 'TBD', img: 'zone-g-map', renders: ['zone-g-map'], drawings: [], scope: 'G-01 ~ G-11. 9×8m² + 2×14m². YOUNGS Pop Up. AMG provide counter + TV + lighting + bracket.', flag: '11 booths · 11 std counters · 9/2',
    req: ['11× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '11× 42" TV + Media Player + HDMI Cable + Floor Stand', '11× Grey carpet (≈1100 sqft)', '26× LED Arm Light', '22× Popup Bracket for PVC Graphic', '— YOUNGS —', 'Pop Up', 'Displays and shelvings'], tiers: ZONE_G_TIER, units: makeTieredUnits('zone-g', ZONE_G_TIER, i => BOOTH_LABELS.g[i-1], n => [`zone-g-render-${n*2}`, `zone-g-render-${n*2-1}`]) },
  { name: 'Chongqing Pavilion', owner: 'Chris', status: 'Approved', img: 'chongqing-map', renders: ['chongqing-map', 'chongqing-v2-2'], drawings: ['chongqing-dwg-3'], scope: 'AMG shop drawings A.2–A.4 (JP, RENT). 36m² (4× 9sqm). Central: LED Lighting Structure 1200mm dia×3450mm H + 36× LED strips + 4× Display Stands (BLK Formica). Perimeter: 3× Std No Skin Panels 990×2413 + 42" TV + stand + Media Player wall mount + Counter. Floor Trim 260ft.', flag: '4× 9sqm booths',
    req: ['4× Std No Skin Panel — 3000W×2413H×500D', '4× Std Counter — 990W×1000H×495D, Formica Black', '4× 42" TV wall mount + Media Player', '4× Fabric Graphic — 2966×2409mm, RX-101 Channel 36ft', '8× LED arm light', '4× 9sqm Booths, Black+Orange Carpet'], tiers: ZONE_CQ_TIER, units: makeTieredUnits('cq', ZONE_CQ_TIER, i => BOOTH_LABELS.cq[i-1]) },
  { name: 'Sponsor Booths 15+1', owner: 'Jin', status: 'Approved', img: 'sponsor-booths-map', renders: ['sponsor-booths-map'], drawings: [], scope: 'AMG shop drawings A.2–A.5 (JP, RENT). 16 booths (P-01 ~ P-16): 8×8ft ×9, 10×10ft ×3, 10×15ft ×2, 10×20ft ×2 (P-05 空地, AMG 不提供).', flag: '15+1 booths · 1× 空地',
    req: ['14× Std Counter — 990W×1000H×495D, Formica White', '1× Custom Counter — 1800W×500H×1000D, wooden joinery (Premier)', '5× 42" TV + stand + Media Player', '1× 42" TV wall mount + Media Player (Premier)', '15× Grey carpet (≈1376 sqft)', '1× L-shaped wall structure (Premier)', '2× Full-height wall graphic, front only (Premier)', '49× LED arm light', '— YOUNGS —', 'Pop-up display', 'Furniture + fabric display'],
    tiers: SPONSOR_TIERS,
    units: makeTieredUnits('sponsor', SPONSOR_TIERS) },
  { name: 'National Pavilion', owner: 'Iris', status: 'In Review', img: 'national-v2-2', renders: ['national-v2-2'], drawings: ['national-dwg-1', 'national-dwg-3'], scope: 'GB-01 ~ GB-41 (41 booths). AMG provide carpet + LED arm light only. 3 groups: GB-US×20, GB-Pakistan×11, GB-Others×10.', flag: '41 booths · carpet + lights only',
    req: ['41× Carpet (≈1848 sqft)', '82× LED arm light'], tiers: ZONE_GB_TIER, units: makeTieredUnits('gb', ZONE_GB_TIER, i => BOOTH_LABELS.gb[i-1]) },
  { name: 'Sourcing Hub', owner: 'Iris', status: 'Approved', img: 'sourcing-hub-v2-2', renders: ['sourcing-hub-v2-2', 'sourcing-hub-v2-3', 'sourcing-hub-v2-4', 'sourcing-hub-v2-5', 'sourcing-hub-v2-6', 'sourcing-hub-v2-7'], drawings: ['sourcing-hub-dwg-1', 'sourcing-hub-dwg-2', 'sourcing-hub-dwg-3', 'sourcing-hub-dwg-4', 'sourcing-hub-dwg-5', 'sourcing-hub-dwg-6'], scope: 'AMG shop drawings A.2–A.7 (JP, RENT). 64m² (8×8m). Display Sign 1000×2000mm. 42" TV + stand + Media Player. 4 centers: A 汕頭 (Stair Display), B 永康 (Display Stand+Acrylic), C 鄭州 (5× Display Stands), D 廣州 (Curved Display Stand 2000×1300). PVC graphics + floor vinyl per booth.', flag: '4 sourcing centers (9m² each) inside 64m² space',
    req: ['1× Display Sign — 1000W×2000H×300D, Formica White, Paint Orange, LED Strip', '1× 42" TV + stand + Media Player + Media Player, Floor Stand', 'Booth A 汕頭: Three-Step Stair Display 1200W×900H×900D (WHT) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth B 永康: Display Stand 1424W×1700H×412D (WHT+Wood+Acrylic) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth C 鄭州: 5× Display Stands (1500×500 + 500×500 + 2× 500×800 + 500×1000) Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth D 廣州: Curved Display Stand 2000W×1300H×1000D Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl'] },
  { name: 'Podcast', owner: 'Iris', status: 'Approved', img: 'podcast-render-1', renders: ['podcast-render-1'], drawings: ['podcast-dwg-1'], scope: '5.4×3.4m. Octanorm structure + clear acrylic panels + carpet. Client provides angle tables, chairs, On Air lightbox.', flag: 'OP1 spec A.13 · Client display items',
    req: ['1× Custom Octanorm Structure — 5400W×2423H×3588D', '4× Clear Acrylic #01 — 1208×2266×3mm, 1/8"', '3× Clear Acrylic #02 — 1029×2266×3mm, 1/8"', '1× Carpet — 5180×3368mm (≈192 sqft)', '4× Vinyl Graphic — 1208×898mm, 4/0 (PD-FRONT-GLASS)', '3× Vinyl Graphic — 1029×898mm, 4/0 (PD-LEFT-GLASS)', '— CLIENT —', '4× Angle Table', '1× On Air Lightbox', '6× Chair'] },
  { name: 'Creator Market (Muse)', owner: 'Iris', status: 'Approved', img: 'muse-scope-2', renders: [...gallery('muse-scope', 9)], drawings: [], scope: 'Muse client design (revised 8/14) · Island + Sponsor. 1× Circular flooring 320sqm. 3× 75" TV. 5× Std Counter — 990W×1000H×495D, Formica White. 4× Custom wood frame. 3× PVC graphic. 6× Custom column. 1× Vinyl sticker. Arm lights — pending JT.', flag: 'Structure confirmed 8/17 · 22 booths (12× 8sqm + 6× 16sqm + 4× 32sqm) · arm light pending',
    req: ['1× Circular flooring — black/grey/white w/ text (320sqm)', '3× 75" TV w/ stand', '5× Std Counter — 990W×1000H×495D, Formica White', '4× Custom wood frame structure w/ base (open 5 sides, overhead crossbeam for fishing lines)', '3× PVC graphic on both sides', '6× Custom Column (Island)', '1× Vinyl sticker (Sponsor)', 'Arm lights — pending JT confirmation'] },
  { name: 'UED Booth', owner: 'Charles', status: 'Approved', img: 'ued-render-1', renders: ['ued-render-1', 'ued-render-2'], drawings: ['ued-dwg-1'], scope: '7×2.2m (15.4m²). Std Panel + Std Counter + 55" TV + LED + RX-101 channels. Flooring ≈169 sqft.', flag: 'Furniture and devices from Youngs',
    req: ['5× Std Panel — 990W×2413H×100D, No Finish', '2× Graphic Bracket — 100W×250H×50D, Formica White', '1× Cover PVC White — 4\'×8\', Panel Edges', '4× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '3× Std Counter — 495W×1000H×495D, Formica White, Lockable Door+Shelf', '1× 55" TV + Media Player, HDMI Cable, Floor Stand', '1× Grey carpet — 7000×2200mm, ≈169 sqft', '3× LED Arm Light', '82ft RX-101 Aluminum Channels', '— YOUNGS —', 'Furniture and devices'] },
  { name: 'Agentic Robotics Arena', owner: 'Charles', status: 'TBD', img: 'agentic-robotics-render-1', renders: ['agentic-robotics-render-1', 'agentic-robotics-render-2'], scope: 'AMG only provide carpet and floor vinyl. All else by Youngs. Size TBD.', flag: '⚠ Size TBD — carpet + vinyl only', req: [] },
],

TEAM: [
  { name: 'Nickie Wang', role: 'Niche Exhibit · Client Liaison', tag: 'Lead' },
  { name: 'Calvin Yee', role: 'AMG · Quote / COI', tag: 'AMG' },
  { name: 'Ariana', role: 'AMG', tag: 'AMG' },
  { name: 'Iris', role: 'AMG', tag: 'AMG' },
  { name: 'Jose', role: 'AMG', tag: 'AMG' },
  { name: 'Marshal Zhu', role: 'Youngs · Client', tag: 'Client' },
],

PROGRESS: [
  { label: 'GSC Application', pct: 5, color: 'var(--orange)' },
  { label: 'Design Brief', pct: 90, color: 'var(--blue)' },
  { label: 'Quote / 成控', pct: 40, color: 'var(--green)' },
  { label: 'Production', pct: 0, color: 'var(--accent)' },
],

HARD_DEADLINES: [
  { title: 'Union Labor Docs → LACC', sub: '90-day rule · breached, escalate with LACC', date: '2026-06-08' },
  { title: 'Youngs: 80% design confirm', sub: 'So AMG can schedule. Urgent — stage/backdrop (AMA, Breakout, Match), custom (Creator Market, Next-Gen) + std counter qty', date: '2026-08-07' },
  { title: 'Scaled Floor Diagrams → LACC', sub: '30-day rule · Fire Marshal approval', date: '2026-08-08' },
  { title: 'Youngs: Merchant booth confirm', sub: 'Supplier / exhibitor booth designs locked', date: '2026-08-17' },
  { title: 'Youngs: Graphics + hanging signs', sub: 'All artwork + hanging signs final', date: '2026-08-17' },
  { title: 'Muse carpet drawing + color code → Nickie', sub: '8/19 發包地毯 + vinyl floor (Muse) — 圖 + 色號 8/18 前要給 Nickie', date: '2026-08-18' },
  { title: 'Fire Permit Requests', sub: '21-day rule · LAFD', date: '2026-08-19' },
  { title: 'Electrical Requirement + Floor Plan', sub: 'LACC requirement', date: '2026-08-19' },
  { title: 'Youngs: Add-on pop-ups', sub: 'Any additional pop-up units final', date: '2026-08-26' },
],

GRAPHICS: [
  { zone: 'Registration', items: [
    { item: 'REG-WALL-FRT', size: '9896×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/reg-wall-frt.jpg' },
    { item: 'COLUMN-COVER', size: '—', material: 'Curved PVC', qty: 1, status: 'pending', thumb: '' },
  ]},
  { zone: 'Next Gen', items: [
    { item: 'NG-MEET-FRT', size: '2966×2996mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-MEET-BK', size: '2966×2996mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-MEET-CNTR-FRT', size: '1485×1000mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-SHAPE-1', size: '370×365mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-SHAPE-2', size: '591×573mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-SHAPE-3', size: '570×562mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-FLOOR', size: '7000×7000mm', material: 'Floor Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-GAME-CNTR-LOGO', size: '840×100mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: '' },
    { item: 'NG-GAME-ARROW', size: '80×2700mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: '' },
    { item: 'NG-GAME', size: '1440×3000mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-PLATFORM', size: '1650×1559mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-PLATFORM-SIDES', size: '1536×166mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: '' },
    { item: 'NG-PLATFORM-BK', size: '1649×166mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-CNTR-LOGO', size: '560×90mm', material: 'Vinyl', qty: 4, status: 'pending', thumb: '' },
    { item: 'NG-FRT-HEADER-FRT', size: '3000×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-FRT-HEADER-BK', size: '3000×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-CURVE-HEADER', size: '8928×300mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-CURVE-BOX-1', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-CURVE-BOX-2', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-CURVE-BOX-3', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-CURVE-BOX-4', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-FRT-WALL-FRT', size: '4156×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-FRT-WALL-BK', size: '4156×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-1-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-1-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-2-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-2-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-3-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-3-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-4-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-HEADER-4-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-1-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-1-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-2-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-2-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-3-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-3-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-4-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-4-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-HEADER-1-FRT', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-HEADER-1-BK', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-HEADER-2-FRT', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-HEADER-2-BK', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-WALL-1-FRT', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-WALL-1-BK', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-WALL-2-FRT', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-R-WALL-2-BK', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
  ]},
  { zone: 'Unboxing Live', items: [
    { item: 'EZTube-20ft-Straight', size: '20ft × 7.5ft', material: 'Double Sided Pop Up', qty: 1, status: 'pending', thumb: 'assets/graphics/eztube-20ft-straight.jpg' },
  ]},
  { zone: 'Supplier Block A', items: [
    { item: 'A-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-01-header.jpg' },
    { item: 'A-01-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-01-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-01-SIDE-WALL-OUT', size: '2096×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-02-header.jpg' },
    { item: 'A-02-BK-WALL', size: '3928×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-02-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-02-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-03-header.jpg' },
    { item: 'A-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-03-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-04-header.jpg' },
    { item: 'A-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-04-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-05-BK-WALL', size: '3928×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-05-SIDE-L', size: '1982×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-05-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-06-header.jpg' },
    { item: 'A-06-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-06-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-07-header.jpg' },
    { item: 'A-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-07-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-08-header.jpg' },
    { item: 'A-08-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-08-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-09-header.jpg' },
    { item: 'A-09-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-09-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 9, status: 'pending', thumb: '' },
  ]},
  { zone: 'Chongqing Pavilion', items: [
    { item: 'Fabric Graphic', size: '2966×2409mm', material: 'Fabric / RX-101', qty: 4, status: 'pending', thumb: '' },
  ]},
  { zone: 'Sponsor Booths', items: [
    { item: 'Pop-up display', size: '3000×2500mm', material: '—', qty: 9, status: 'pending', thumb: '' },
    { item: 'Pop-up display', size: '3500×2500mm', material: '—', qty: 3, status: 'pending', thumb: '' },
    { item: 'L-shaped pop-up', size: '5000×2500 + 3000×2500mm', material: '—', qty: 2, status: 'pending', thumb: '' },
    { item: 'Full-height wall graphic', size: '—', material: '—', qty: 1, status: 'pending', thumb: '' },
  ]},
  { zone: 'Sourcing Hub', items: [
    { item: 'Display Sign', size: '1000×2000×300', material: 'Formica White', qty: 1, status: 'pending', thumb: '' },
    { item: 'PVC Graphic', size: '2150×250', material: 'PVC', qty: 4, status: 'pending', thumb: '' },
    { item: 'Floor Vinyl', size: '—', material: 'Vinyl', qty: 4, status: 'pending', thumb: '' },
  ]},
  { zone: 'Podcast', items: [
    { item: 'Vinyl Graphic (front glass)', size: '1208×898mm', material: 'Vinyl', qty: 4, status: 'pending', thumb: '' },
    { item: 'Vinyl Graphic (left glass)', size: '1029×898mm', material: 'Vinyl', qty: 3, status: 'pending', thumb: '' },
  ]},
  { zone: 'Creator Market (Muse)', items: [
    { item: 'PVC graphic (both sides)', size: '—', material: 'PVC', qty: 3, status: 'pending', thumb: '' },
    { item: 'Custom Column (Island)', size: '—', material: '—', qty: 6, status: 'pending', thumb: '' },
    { item: 'Vinyl sticker (Sponsor)', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
  ]},
  { zone: 'UED Booth', items: [
    { item: 'Graphic Bracket', size: '100×250×50', material: 'Formica White', qty: 2, status: 'pending', thumb: '' },
    { item: 'RX-101 Aluminum Channels', size: '82 ft', material: 'RX-101', qty: 1, status: 'pending', thumb: '' },
  ]},
],

SEED_UPDATES: [
  { date: 'Aug 1, 2026', author: 'Nickie Wang', text: 'First quote sent out — covers the zones with designs already received. Keynote, Match Meeting, and Next-Gen (plus any Youngs add-ons like pop-ups / extra counters) will be quoted once their designs/quantities land.' },
  { date: 'Aug 1, 2026', author: 'Nickie Wang', text: 'Deadlines issued to Youngs: 80% design confirm by Aug 7 (priority: AMA/Breakout/Match stage+backdrop, Creator Market + Next-Gen custom, and std counter qty — AMG only has ~30); merchant booths + graphics + hanging signs by Aug 17; any add-on pop-ups by Aug 26.' },
  { date: 'Jul 20, 2026', author: 'Nickie Wang', text: 'Full 3-part design deck (73 pages) reviewed and implanted into the hub. Zone specs refined across 17 of 20 zones with renderings; Keynote Hall, Match Meeting, and Next-Gen Sourcing + AI still have no design received.' },
  { date: 'Jul 19, 2026', author: 'Nickie Wang', text: 'Full design brief (V1) received from Youngs. All 3 parts reviewed. Scope confirmed: 20 zones, 100+ individual booths, 70+ TVs. Next-Gen zone pending — Calvin notified.' },
  { date: 'Jul 17, 2026', author: 'Nickie Wang', text: 'Delta Showroom Timeline Rev 5 updated (AMG crew blackout Sep 9–11 confirmed for CoCreate).' },
  { date: 'Jul 10, 2026', author: 'Marshal Zhu', text: 'Design Proposal V1 issued. Date: 2026/07/10.' },
  { date: 'Mar 27, 2026', author: 'Calvin Yee', text: 'Internal AMG strategy meeting held. Decision: proceed with CoCreate 2026 GSC application.' },
  { date: 'Mar 2026', author: 'Nickie Wang', text: 'Project opened. Venue LACC confirmed. Show dates Sep 9–10 tentative.' },
],

};

// ---------- Persistence: DATA is DEFAULT_DATA, overridden by any saved edits ----------

const CONTENT_KEY = 'cocreate2026_content';
const CONTENT_VER_KEY = 'cocreate2026_content_ver';
// Bump this whenever DEFAULT_DATA is updated in a way that must reach viewers.
// A saved snapshot from an older version is discarded so the new defaults show through.
const CONTENT_VERSION = 29;

// ---------- Firebase (graphics 多人同步) ----------
const FB_CONFIG = {
  apiKey: "AIzaSyA_WfffoyU5_ESBmUiQ680_AmNsSNydmek",
  authDomain: "cocreate2026-62530.firebaseapp.com",
  projectId: "cocreate2026-62530",
  storageBucket: "cocreate2026-62530.firebasestorage.app",
  messagingSenderId: "1036108803620",
  appId: "1:1036108803620:web:ed6a8137a2b4c072e632b1"
};
const GRAPHICS_COLLECTION = 'graphics';
const GRAPHIC_STATUS = [
  { value: 'pending',   label: 'Pending',   emoji: '⏳', color: '#999999' },
  { value: 'received',  label: 'Received',  emoji: '📥', color: '#3b82f6' },
  { value: 'approved',  label: 'Approved',  emoji: '✅', color: '#16a34a' },
  { value: 'printed',   label: 'Printed',   emoji: '🖨️', color: '#a855f7' },
  { value: 'installed', label: 'Installed', emoji: '🏗️', color: '#f59e0b' },
  { value: 'done',      label: 'Done',      emoji: '🎉', color: '#15803d' },
];
function graphicStatusMeta(v){ return GRAPHIC_STATUS.find(s => s.value === v) || GRAPHIC_STATUS[0]; }

let FB_DB = null;
function initFirebase(){
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FB_CONFIG);
      FB_DB = firebase.firestore();
    }
  } catch(e) { console.warn('Firebase init failed:', e); }
}
let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));

function loadSiteData(){
  try{
    const savedVer = Number(localStorage.getItem(CONTENT_VER_KEY) || '0');
    const saved = JSON.parse(localStorage.getItem(CONTENT_KEY));
    if(saved && savedVer === CONTENT_VERSION){
      DATA = saved;
    } else {
      // No snapshot, or one from an older data version — start from the latest defaults.
      localStorage.removeItem(CONTENT_KEY);
      localStorage.removeItem(CONTENT_VER_KEY);
      DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  } catch(e){ /* ignore malformed saved data, keep defaults */ }
}
function saveSiteData(){
  localStorage.setItem(CONTENT_KEY, JSON.stringify(DATA));
  localStorage.setItem(CONTENT_VER_KEY, String(CONTENT_VERSION));
}
function resetSiteData(){
  if(!confirm('Reset all content back to the original defaults? This cannot be undone.')) return;
  localStorage.removeItem(CONTENT_KEY);
  localStorage.removeItem(CONTENT_VER_KEY);
  DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
  renderAll();
}

function getArrayByKey(key){
  const parts = key.split('.');
  let obj = DATA[parts[0]];
  for(let i = 1; i < parts.length; i++) obj = obj[parts[i]];
  return obj;
}

// ---------- Edit Mode ----------

let EDIT_MODE = false;

function toggleEditMode(){
  EDIT_MODE = !EDIT_MODE;
  document.body.classList.toggle('editing', EDIT_MODE);
  document.getElementById('btn-edit-toggle').textContent = EDIT_MODE ? '✓ Done Editing' : '✎ Edit Page';
  document.getElementById('btn-edit-toggle').classList.toggle('editing-active', EDIT_MODE);
  renderAll();
}

// contenteditable text field: saves quietly on blur, no re-render (avoids stealing focus)
function editAttrs(arrKey, idx, field){
  return EDIT_MODE ? ` contenteditable="true" data-arr="${arrKey}" data-idx="${idx}" data-field="${field}" onclick="event.stopPropagation()"` : '';
}
// input/select fields: saves + re-renders on change (fine, since change fires once per discrete pick)
function saveField(arrKey, idx, field, el){
  const arr = getArrayByKey(arrKey);
  if(!arr || !arr[idx]) return;
  arr[idx][field] = el.value !== undefined && el.tagName !== 'DIV' && el.tagName !== 'SPAN' && el.tagName !== 'TD' ? el.value : el.textContent.trim();
  saveSiteData();
}
function saveFieldAndRender(arrKey, idx, field, el){
  saveField(arrKey, idx, field, el);
  renderAll();
}
function saveFieldBool(arrKey, idx, field, el){
  const arr = getArrayByKey(arrKey);
  if(!arr || !arr[idx]) return;
  arr[idx][field] = el.checked;
  saveSiteData();
  renderAll();
}

function addRow(arrKey, template){
  getArrayByKey(arrKey).push(template);
  saveSiteData();
  renderAll();
}
function removeRow(arrKey, idx){
  if(!confirm('Remove this item?')) return;
  getArrayByKey(arrKey).splice(idx, 1);
  saveSiteData();
  renderAll();
}

// Reorder DATA.ZONES: pull the item out of `from`, insert it at `to`.
function moveZone(from, to){
  const arr = DATA.ZONES;
  if(from === to || from < 0 || from >= arr.length) return;
  const [item] = arr.splice(from, 1);
  if(to > from) to--; // account for the removal shifting later indices down
  to = Math.max(0, Math.min(to, arr.length));
  arr.splice(to, 0, item);
  saveSiteData();
  renderAll();
}

function editBtns(arrKey, idx){
  if(!EDIT_MODE) return '';
  return `<button class="edit-remove-btn" onclick="event.stopPropagation();removeRow('${arrKey}',${idx})" title="Remove">&times;</button>`;
}
function addBtn(label, onclick){
  if(!EDIT_MODE) return '';
  return `<button class="edit-add-btn" onclick="${onclick}">+ ${label}</button>`;
}

// ---------- Small render helpers ----------

function avatarHtml(name, size){
  const cls = size === 'sm' ? 'activity-avatar' : 'avatar';
  return `<div class="${cls}" style="background:${colorForName(name)}">${initials(name)}</div>`;
}

function priorityDot(urgent){ return `<span class="priority-dot" style="background:${urgent ? 'var(--red)' : 'var(--orange)'}"></span>`; }

// ---------- Dashboard widgets ----------

function renderStatCards(){
  const daysToShow = daysBetween(TODAY, SHOW_START);
  const nextDeadline = DATA.HARD_DEADLINES.find(d => new Date(d.date) >= TODAY);
  const el = document.getElementById('stat-cards');
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Days to Show</div>
      <div class="stat-value" style="color:var(--accent)">${daysToShow}</div>
      <div class="stat-sub">Sep 9, 2026</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Hard Deadlines</div>
      <div class="stat-value" style="color:var(--red)">${DATA.HARD_DEADLINES.length}</div>
      <div class="stat-sub"><span class="stat-dot" style="background:var(--red)"></span>${nextDeadline ? 'Next: ' + fmtDate(new Date(nextDeadline.date)) : 'All passed'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Open Items</div>
      <div class="stat-value" style="color:var(--yellow)">${DATA.OPEN_ITEMS.length}</div>
      <div class="stat-sub">${DATA.OPEN_ITEMS.filter(i => i.urgent).length} urgent</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">GSC Application</div>
      <div class="stat-value" style="color:var(--orange); font-size:16px; padding-top:5px;">Pending</div>
      <div class="stat-sub">Awaiting venue license</div>
    </div>
  `;
}

function renderTimelinePreview(){
  const items = [
    { date: 'Jul 19', color: 'var(--green)', title: 'Full design scope confirmed', sub: '20 zones, 100+ booths — Next-Gen zone still pending' },
    { date: 'Jun 8', color: 'var(--red)', title: 'Union labor documentation', hard: true, sub: 'Breached — venue license wasn\'t ready in time, escalate with LACC' },
    { date: 'Now', color: 'var(--red)', title: 'Confirm venue license + COI', sub: 'Youngs owned — still unconfirmed, gates GSC application' },
    { date: 'Jul 20–Aug 10', color: 'var(--blue)', title: 'AMG engineering + drawings (full scope)', sub: 'Compressed — starts now, not back in spring' },
    { date: 'Jul 21–Aug 7', color: 'var(--blue)', title: 'AMG quote → client approval', sub: '75% deposit from Youngs needed fast' },
    { date: 'Aug 8', color: 'var(--red)', title: 'Scaled floor diagrams to LACC', hard: true, sub: '30 days prior to move-in' },
    { date: 'Aug 19', color: 'var(--orange)', title: 'Fire permit requests due', sub: '21 days prior to show' },
    { date: 'Aug 1–Sep 5', color: 'var(--blue)', title: 'Fabrication + production', sub: 'Compressed to ~5 weeks (was ~8)' },
    { date: 'Sep 7–8', color: 'var(--green)', title: 'Installation', sub: 'Union labor · AMG crew' },
    { date: 'Sep 9–10', color: 'var(--accent)', title: '🎉 CoCreate 2026 Show Days', sub: 'Los Angeles Convention Center' },
    { date: 'Sep 11', color: 'var(--purple)', title: 'Dismantle', sub: 'Post-show teardown', last: true },
  ];
  document.getElementById('timeline-preview').innerHTML = items.map(it => `
    <div class="timeline-item">
      <div class="t-date">${it.date}</div>
      <div class="t-dot-col"><div class="t-dot" style="background:${it.color}"></div>${it.last ? '' : '<div class="t-line"></div>'}</div>
      <div class="t-content">
        <div class="t-title">${it.title}${it.hard ? '<span class="t-hard">HARD</span>' : ''}</div>
        <div class="t-sub">${it.sub}</div>
      </div>
    </div>
  `).join('');
}

function renderDeadlinesWidget(){
  const el = document.getElementById('deadlines-widget');
  el.innerHTML = DATA.HARD_DEADLINES.map((d, i) => {
    const days = daysBetween(TODAY, new Date(d.date));
    const overdue = days < 0;
    const cls = overdue ? 'countdown-red' : (days <= 30 ? 'countdown-orange' : 'countdown-yellow');
    const dateColor = overdue ? 'var(--red)' : (days <= 30 ? 'var(--orange)' : 'var(--yellow)');
    return `<div class="deadline-item">
      <div class="d-left">
        <div class="d-title"${editAttrs('HARD_DEADLINES', i, 'title')}>${escapeHtml(d.title)}</div>
        <div class="d-sub"${editAttrs('HARD_DEADLINES', i, 'sub')}>${escapeHtml(d.sub)}</div>
      </div>
      <div class="d-right">
        ${EDIT_MODE ? `<input type="date" class="edit-date-input" value="${d.date}" onchange="saveFieldAndRender('HARD_DEADLINES',${i},'date',this)">` : `<div class="d-date" style="color:${dateColor}">${fmtDate(new Date(d.date))}</div>`}
        <div class="d-countdown ${cls}">${overdue ? 'OVERDUE ' + Math.abs(days) + 'd' : days + ' days'}</div>
      </div>
      ${editBtns('HARD_DEADLINES', i)}
    </div>`;
  }).join('') + addBtn('Deadline', `addRow('HARD_DEADLINES',{title:'New deadline',sub:'',date:'${TODAY.toISOString().slice(0,10)}'})`);
}

function renderProgressWidget(){
  document.getElementById('progress-widget').innerHTML = DATA.PROGRESS.map((p, i) => `
    <div class="progress-wrap">
      <div class="progress-label">
        <span${editAttrs('PROGRESS', i, 'label')}>${escapeHtml(p.label)}</span>
        <span>${EDIT_MODE ? `<input type="number" class="edit-pct-input" min="0" max="100" value="${p.pct}" onchange="saveFieldAndRender('PROGRESS',${i},'pct',this)">` : p.pct + '%'}</span>
        ${editBtns('PROGRESS', i)}
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%;background:${p.color}"></div></div>
    </div>
  `).join('') + addBtn('Progress row', `addRow('PROGRESS',{label:'New row',pct:0,color:'var(--accent)'})`);
}

function renderTasksPreview(){
  const el = document.getElementById('tasks-preview');
  const doneHtml = DATA.DONE_ITEMS.map((d, i) => `
    <div class="task-item">
      <div class="task-check done" onclick="markItemOpen(${i})" title="Mark as open">✓</div>
      <div class="task-info">
        <div class="task-title done">${escapeHtml(d.text)}</div>
        <div class="task-meta"><span class="task-assign" style="color:var(--green)">${escapeHtml(d.owner)}</span></div>
      </div>
    </div>
  `).join('');
  const openHtml = DATA.OPEN_ITEMS.slice(0, 3).map((i, idx) => `
    <div class="task-item">
      <div class="task-check" onclick="markItemDone(${idx})" title="Mark as done"></div>
      <div class="task-info">
        <div class="task-title">${escapeHtml(i.text.split('.')[0])}</div>
        <div class="task-meta">${priorityDot(i.urgent)}<span class="task-assign">${escapeHtml(i.owner)} · ${i.urgent ? 'Critical' : 'Open'}</span></div>
      </div>
    </div>
  `).join('');
  el.innerHTML = doneHtml + openHtml;
}

function zoneThumbHtml(z){
  return z.img
    ? `<img src="assets/zones/${z.img}.jpg${IMG_CACHE_BUST}" alt="${escapeHtml(z.name)} rendering" loading="lazy">`
    : (ZONE_ICONS[z.name] || '⬡');
}

function renderZonesPreview(){
  const el = document.getElementById('zones-preview');
  el.innerHTML = DATA.ZONES.slice(0, 6).map(z => `
    <div class="zone-card" data-zone-index="${DATA.ZONES.indexOf(z)}">
      <div class="zone-thumb">${zoneThumbHtml(z)}</div>
      <div class="zone-name">${escapeHtml(z.name)}</div>
      <div class="zone-status" style="color:${z.status === 'TBD' ? 'var(--text-dim)' : 'var(--yellow)'}">${escapeHtml(z.status)}</div>
    </div>
  `).join('');
}

function renderTeamWidget(){
  document.getElementById('team-widget').innerHTML = DATA.TEAM.map((m, i) => {
    const ts = TAG_STYLES[m.tag] || TAG_STYLES.AMG;
    const tagSelect = EDIT_MODE
      ? `<select class="edit-tag-select" onchange="saveFieldAndRender('TEAM',${i},'tag',this)">${['Lead','AMG','Client'].map(t => `<option value="${t}" ${t === m.tag ? 'selected' : ''}>${t}</option>`).join('')}</select>`
      : `<span class="member-tag" style="background:${ts.bg};color:${ts.color}">${escapeHtml(m.tag)}</span>`;
    return `
    <div class="team-member">
      <div class="member-avatar" style="background:${colorForName(m.name)}">${initials(m.name)}</div>
      <div>
        <div class="member-name"${editAttrs('TEAM', i, 'name')}>${escapeHtml(m.name)}</div>
        <div class="member-role"${editAttrs('TEAM', i, 'role')}>${escapeHtml(m.role)}</div>
      </div>
      ${tagSelect}
      ${editBtns('TEAM', i)}
    </div>`;
  }).join('') + addBtn('Team Member', `addRow('TEAM',{name:'New Member',role:'Role',tag:'AMG'})`);
}

function renderActivityPreview(all){
  document.getElementById('activity-preview').innerHTML = all.slice(0, 3).map(u => `
    <div class="activity-item">
      ${avatarHtml(u.author, 'sm')}
      <div>
        <div class="activity-text"><strong>${escapeHtml(u.author.split(' ')[0])}</strong> ${escapeHtml(u.text)}</div>
        <div class="activity-time">${escapeHtml(u.date)}</div>
      </div>
    </div>
  `).join('');
}

// ---------- Full sections ----------

function renderGantt(){
  const months = ['Jun','Jul','Aug','Sep','Oct'];
  const monthsHtml = months.map(m => `<div class="m">${m} 2026</div>`).join('');

  const rowsHtml = DATA.GANTT_ROWS.map((row, i) => {
    let barHtml = '';
    if(row.point){
      const d = new Date(row.point);
      const overdue = d < TODAY;
      const isHard = row.color === 'red';
      const left = pct(d);
      const labelText = (overdue && isHard) ? `⚠ BREACHED · ${fmtDate(d)}` : fmtDate(d);
      barHtml = `<div class="gantt-marker ${row.color}" style="left:${left}%"></div>
        <div class="gantt-marker-label" style="left:${left}%">${labelText}</div>`;
    } else {
      const s = new Date(row.start), e = new Date(row.end);
      const left = pct(s);
      const rawWidth = pct(e) - left;
      const width = Math.max(rawWidth, 2.2);
      const overdue = e < TODAY && (row.color === 'amber' || row.color === 'blue');
      const dateText = (s.getTime() === e.getTime() ? fmtDate(s) : `${fmtDate(s)}–${fmtDate(e)}`) + (overdue ? ' ⚠' : '');
      if(rawWidth < 6){
        barHtml = `<div class="gantt-bar ${row.color} chip" style="left:${left}%;width:${width}%" title="${escapeHtml(row.label)}: ${fmtDate(s)} – ${fmtDate(e)}"></div>
          <div class="gantt-bar-label" style="left:calc(${left}% + ${width}% + 6px)">${dateText}</div>`;
      } else {
        barHtml = `<div class="gantt-bar ${row.color}" style="left:${left}%;width:${width}%" title="${escapeHtml(row.label)}: ${fmtDate(s)} – ${fmtDate(e)}">${dateText}</div>`;
      }
    }
    const editDates = EDIT_MODE ? `
      <div class="edit-gantt-dates">
        ${row.point
          ? `<input type="date" value="${row.point}" onchange="saveFieldAndRender('GANTT_ROWS',${i},'point',this)">`
          : `<input type="date" value="${row.start}" onchange="saveFieldAndRender('GANTT_ROWS',${i},'start',this)"><input type="date" value="${row.end}" onchange="saveFieldAndRender('GANTT_ROWS',${i},'end',this)">`
        }
        <select onchange="saveFieldAndRender('GANTT_ROWS',${i},'color',this)">
          ${['red','amber','blue','green','grey','orange'].map(c => `<option value="${c}" ${c === row.color ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>` : '';
    return `<div class="gantt-row">
      <div class="gantt-rowlabel">
        <span${editAttrs('GANTT_ROWS', i, 'label')}>${escapeHtml(row.label)}</span>
        <span class="owner"${editAttrs('GANTT_ROWS', i, 'owner')}>${escapeHtml(row.owner)}</span>
        <span class="owner"${editAttrs('GANTT_ROWS', i, 'note')}>${escapeHtml(row.note)}</span>
        ${editDates}
        ${editBtns('GANTT_ROWS', i)}
      </div>
      <div class="gantt-track">${barHtml}</div>
    </div>`;
  }).join('');

  const todayPct = pct(TODAY);
  const rowLabelWidth = 220;
  const todayLabel = TODAY.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  document.getElementById('gantt').innerHTML = `
    <div class="gantt-body" style="position:relative;">
      <div class="gantt-row" style="min-height:0;">
        <div class="gantt-rowlabel"></div>
        <div class="gantt-months" style="flex:1;">${monthsHtml}</div>
      </div>
      ${rowsHtml}
      <div class="gantt-today" style="left:calc(${rowLabelWidth}px + (100% - ${rowLabelWidth}px) * ${todayPct / 100})">
        <span class="tag">TODAY · ${todayLabel}</span>
      </div>
    </div>
  `;
  document.getElementById('gantt-add-row').innerHTML = addBtn('Schedule Row', `addRow('GANTT_ROWS',{label:'New item',owner:'',start:'${TODAY.toISOString().slice(0,10)}',end:'${TODAY.toISOString().slice(0,10)}',color:'blue',note:''})`);
}

const STATUS_OPTIONS = ['done','progress','watch','hard','unconfirmed','notstarted'];
const STATUS_LABELS = { done: 'Done', progress: 'In progress', watch: 'Watch', hard: 'Hard deadline', unconfirmed: 'Unconfirmed', notstarted: 'Not started' };

function renderPhases(){
  document.getElementById('phases-body').innerHTML = DATA.PHASES.map((p, i) => `
    <tr>
      <td${editAttrs('PHASES', i, 'phase')}>${escapeHtml(p.phase)}</td>
      <td class="dates"${editAttrs('PHASES', i, 'dates')}>${escapeHtml(p.dates)}</td>
      <td class="dates"${editAttrs('PHASES', i, 'duration')}>${escapeHtml(p.duration)}</td>
      <td>${EDIT_MODE
        ? `<select onchange="const v=this.value; saveField('PHASES',${i},'status',{value:v}); saveField('PHASES',${i},'statusLabel',{value:STATUS_LABELS[v]}); renderAll();">${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}</select>`
        : `<span class="pill ${p.status}">${escapeHtml(p.statusLabel)}</span>`}</td>
      <td class="notes"${editAttrs('PHASES', i, 'notes')}>${escapeHtml(p.notes)}</td>
      <td>${editBtns('PHASES', i)}</td>
    </tr>
  `).join('');
  document.getElementById('phases-add-row').innerHTML = addBtn('Phase', `addRow('PHASES',{phase:'New phase',dates:'TBD',duration:'—',status:'notstarted',statusLabel:'Not started',notes:''})`);
}

function markItemDone(idx){
  const item = DATA.OPEN_ITEMS[idx];
  DATA.OPEN_ITEMS.splice(idx, 1);
  DATA.DONE_ITEMS.push({ owner: item.owner + ' · Done', text: item.text });
  saveSiteData();
  renderAll();
}
function markItemOpen(idx){
  const item = DATA.DONE_ITEMS[idx];
  DATA.DONE_ITEMS.splice(idx, 1);
  const owner = item.owner.replace(/\s*·\s*Done$/i, '').trim();
  DATA.OPEN_ITEMS.push({ owner: owner || 'TBD', urgent: false, text: item.text });
  saveSiteData();
  renderAll();
}
function addOpenItemQuick(){
  const ownerInput = document.getElementById('quick-add-owner');
  const textInput = document.getElementById('quick-add-text');
  const text = textInput.value.trim();
  if(!text) return;
  DATA.OPEN_ITEMS.push({ owner: ownerInput.value.trim() || 'TBD', urgent: false, text });
  saveSiteData();
  renderAll();
  const freshText = document.getElementById('quick-add-text');
  if(freshText) freshText.focus();
}

function renderOpenItemsFull(){
  const doneHtml = DATA.DONE_ITEMS.map((d, i) => `
    <div class="task-item">
      <div class="task-check done" onclick="markItemOpen(${i})" title="Mark as open">✓</div>
      <div class="task-info">
        <div class="task-title done"${editAttrs('DONE_ITEMS', i, 'text')}>${escapeHtml(d.text)}</div>
        <div class="task-meta"><span class="task-assign" style="color:var(--green)"${editAttrs('DONE_ITEMS', i, 'owner')}>${escapeHtml(d.owner)}</span>${editBtns('DONE_ITEMS', i)}</div>
      </div>
    </div>
  `).join('') + addBtn('Done Item', `addRow('DONE_ITEMS',{owner:'TBD · Done',text:'New completed item'})`);

  const openHtml = DATA.OPEN_ITEMS.map((i, idx) => `
    <div class="task-item">
      <div class="task-check" onclick="markItemDone(${idx})" title="Mark as done"></div>
      <div class="task-info">
        <div class="task-title"${editAttrs('OPEN_ITEMS', idx, 'text')}>${escapeHtml(i.text)}</div>
        <div class="task-meta">
          ${EDIT_MODE ? `<input type="checkbox" ${i.urgent ? 'checked' : ''} onchange="saveFieldBool('OPEN_ITEMS',${idx},'urgent',this)" title="Urgent">` : priorityDot(i.urgent)}
          <span class="task-assign"${editAttrs('OPEN_ITEMS', idx, 'owner')}>${escapeHtml(i.owner)}</span> · ${i.urgent ? 'Critical' : 'Open'}
          ${editBtns('OPEN_ITEMS', idx)}
        </div>
      </div>
    </div>
  `).join('');

  const quickAdd = `
    <div class="quick-add-item">
      <input type="text" id="quick-add-owner" placeholder="Owner" class="quick-add-owner">
      <input type="text" id="quick-add-text" placeholder="Add an open item..." class="quick-add-text" onkeydown="if(event.key==='Enter') addOpenItemQuick()">
      <button onclick="addOpenItemQuick()">+ Add</button>
    </div>`;

  document.getElementById('open-items-list').innerHTML = '<div class="edit-section-label edit-only">Done</div>' + doneHtml + '<div class="edit-section-label edit-only">Open</div>' + openHtml + quickAdd;
}

function renderRisk(){
  document.getElementById('risk-high').innerHTML = DATA.RISKS.high.map((r, i) => `
    <div class="risk-card">
      <span class="risk-title"${editAttrs('RISKS.high', i, 'title')}>${escapeHtml(r.title)}</span>
      <p${editAttrs('RISKS.high', i, 'body')}>${escapeHtml(r.body)}</p>
      ${editBtns('RISKS.high', i)}
    </div>
  `).join('') + addBtn('High Risk', `addRow('RISKS.high',{title:'New risk',body:'Describe the risk...'})`);
  document.getElementById('risk-medium').innerHTML = DATA.RISKS.medium.map((r, i) => `
    <div class="risk-card medium">
      <span class="risk-title"${editAttrs('RISKS.medium', i, 'title')}>${escapeHtml(r.title)}</span>
      <p${editAttrs('RISKS.medium', i, 'body')}>${escapeHtml(r.body)}</p>
      ${editBtns('RISKS.medium', i)}
    </div>
  `).join('') + addBtn('Medium Risk', `addRow('RISKS.medium',{title:'New risk',body:'Describe the risk...'})`);
}

const ZONE_STATUS_OPTIONS = ['TBD', 'In Review', 'Quoted', 'Approved', 'In Production', 'Complete', 'No quote needed'];

function renderZonesFull(){
  document.getElementById('zone-grid').innerHTML = DATA.ZONES.map((z, i) => `
    <div class="zone-card${EDIT_MODE ? ' draggable-zone' : ''}" data-zone-index="${i}">
      ${EDIT_MODE ? '<div class="zone-drag-handle" title="Drag to reorder" draggable="true" onclick="event.stopPropagation()">⠿ drag to reorder</div>' : ''}
      <div class="zone-thumb">${zoneThumbHtml(z)}${z.owner ? `<span class="zone-owner-tag" title="Owner">${escapeHtml(z.owner)}</span>` : ''}${(z.drawings && z.drawings.length) ? '<span class="zone-dwg-tag" title="AMG shop drawing received">📐 spec</span>' : ''}</div>
      <div class="zone-name"${editAttrs('ZONES', i, 'name')}>${escapeHtml(z.name)}</div>
      ${EDIT_MODE
        ? `<div class="zone-owner-edit">Owner <span contenteditable="true" data-arr="ZONES" data-idx="${i}" data-field="owner" onclick="event.stopPropagation()">${escapeHtml(z.owner || '')}</span></div>`
        : ''}
      ${EDIT_MODE
        ? `<select onclick="event.stopPropagation()" onchange="event.stopPropagation();saveFieldAndRender('ZONES',${i},'status',this)">${ZONE_STATUS_OPTIONS.map(s => `<option value="${s}" ${s === z.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`
        : `<div class="zone-status" style="color:${z.status === 'TBD' ? 'var(--red)' : z.status === 'No quote needed' ? 'var(--green)' : 'var(--yellow)'}">${escapeHtml(z.status)}</div>`}
      <div class="zone-scope"${editAttrs('ZONES', i, 'scope')}>${escapeHtml(z.scope)}</div>
      <div class="zone-flag ${z.blocking ? 'blocking' : ''}"${editAttrs('ZONES', i, 'flag')}>${escapeHtml(z.flag)}</div>
      ${EDIT_MODE ? `<button class="edit-remove-btn" onclick="event.stopPropagation();removeRow('ZONES',${i})" title="Remove zone">&times; Remove zone</button>` : ''}
    </div>
  `).join('');
  document.getElementById('zones-add-row').innerHTML = addBtn('Zone', `addRow('ZONES',{name:'New Zone',status:'TBD',scope:'TBD',flag:'',req:[]})`);
}

let graphicsList = []; // 當前顯示的 graphics 資料（Firestore 或 seed）

function renderGraphics(){
  const el = document.getElementById('graphics-list');
  if(!el) return;
  if (!FB_DB) {
    // 無 Firebase → 用 seed
    graphicsList = DATA.GRAPHICS;
    renderGraphicsWith(graphicsList);
    return;
  }
  // 先顯示 loading，等 Firestore 權威資料（避免先畫 seed 的 pending 閃現、
  // 造成用戶在 Firestore 載入前改 status 卻沒寫回 Firestore → reload 又跳回 pending）
  el.innerHTML = '<p style="color:#999;padding:12px;">Loading graphics…</p>';
  FB_DB.collection(GRAPHICS_COLLECTION).orderBy('order').get().then(snap => {
    if (!snap.empty) {
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ id: d.id, zone: data.zone, items: data.items || [] });
      });
      graphicsList = list;
      renderGraphicsWith(list);
    } else {
      // Firestore 空 → seed（seed 後會重新讀取並 render）
      seedGraphics();
    }
  }).catch(e => {
    console.warn('load graphics failed:', e);
    graphicsList = DATA.GRAPHICS;
    renderGraphicsWith(graphicsList);
  });
}

function seedGraphics(){
  if (!FB_DB) return;
  const batch = FB_DB.batch();
  DATA.GRAPHICS.forEach((g, i) => {
    const ref = FB_DB.collection(GRAPHICS_COLLECTION).doc();
    batch.set(ref, { zone: g.zone, items: g.items, order: i });
  });
  batch.commit().then(() => {
    // seed 後重新讀取，讓 graphicsList 帶上 doc id（後續 status 更新才能寫回 Firestore）
    FB_DB.collection(GRAPHICS_COLLECTION).orderBy('order').get().then(snap => {
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ id: d.id, zone: data.zone, items: data.items || [] });
      });
      graphicsList = list;
      renderGraphicsWith(list);
    }).catch(e => console.warn('reload after seed failed:', e));
  }).catch(e => console.warn('seed graphics failed:', e));
}

function renderGraphicsWith(list){
  const el = document.getElementById('graphics-list');
  if(!el) return;
  el.innerHTML = list.map((g, gi) => `
    <details class="card graphic-card" ${gi === 0 ? 'open' : ''} style="margin-bottom:12px;">
      <summary class="card-header graphic-summary" style="cursor:pointer;list-style:none;">
        <div class="card-title">🖼 ${escapeHtml(g.zone)}</div>
        <span class="pill">${(g.items||[]).length} items</span>
      </summary>
      <div class="card-body" style="padding:0;overflow-x:auto;">
        <table class="phases">
          <thead><tr><th>Item</th><th>Size</th><th>Material</th><th>Qty</th><th>Thumbnail</th><th>Status</th></tr></thead>
          <tbody>
            ${(g.items||[]).map((it, ii) => {
              const meta = graphicStatusMeta(it.status);
              const thumbHtml = it.thumb
                ? `<img src="${escapeHtml(it.thumb)}" alt="" style="width:72px;height:auto;border-radius:6px;cursor:zoom-in;" onclick="event.stopPropagation();openGraphicModal('${escapeHtml(it.item)}','${escapeHtml(it.thumb)}')">`
                : `<span style="color:#ccc;font-size:12px;">none</span>`;
              return `
              <tr>
                <td>${escapeHtml(it.item)}</td>
                <td>${escapeHtml(it.size)}</td>
                <td>${escapeHtml(it.material)}</td>
                <td>${it.qty || 1}</td>
                <td>${thumbHtml}</td>
                <td>
                  <select data-gi="${gi}" data-ii="${ii}" onchange="setGraphicStatus(this)" style="color:${meta.color};font-weight:600;border:1px solid ${meta.color}33;background:${meta.color}11;">
                    ${GRAPHIC_STATUS.map(s => `<option value="${s.value}" ${s.value === it.status ? 'selected' : ''}>${s.emoji} ${s.label}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `).join('');
}

function setGraphicStatus(sel){
  const gi = parseInt(sel.dataset.gi, 10);
  const ii = parseInt(sel.dataset.ii, 10);
  const val = sel.value;
  if (graphicsList[gi] && graphicsList[gi].items && graphicsList[gi].items[ii]) {
    graphicsList[gi].items[ii].status = val;
  }
  const meta = graphicStatusMeta(val);
  sel.style.color = meta.color;
  sel.style.border = `1px solid ${meta.color}33`;
  sel.style.background = `${meta.color}11`;
  if (FB_DB && graphicsList[gi] && graphicsList[gi].id) {
    FB_DB.collection(GRAPHICS_COLLECTION).doc(graphicsList[gi].id).update({ items: graphicsList[gi].items })
      .catch(e => console.warn('update graphic failed:', e));
  }
}

function loadPostedUpdates(){
  try{ return JSON.parse(localStorage.getItem('cocreate2026_updates') || '[]'); }
  catch(e){ return []; }
}
function savePostedUpdates(list){
  localStorage.setItem('cocreate2026_updates', JSON.stringify(list));
}

function getAllUpdates(){
  return loadPostedUpdates().map((u, i) => ({ ...u, isNew: true, source: 'posted', idx: i }))
    .concat(DATA.SEED_UPDATES.map((u, i) => ({ ...u, source: 'seed', idx: i })));
}

function removeUpdate(source, idx){
  if(!confirm('Remove this update?')) return;
  if(source === 'posted'){
    const posted = loadPostedUpdates();
    posted.splice(idx, 1);
    savePostedUpdates(posted);
  } else {
    DATA.SEED_UPDATES.splice(idx, 1);
    saveSiteData();
  }
  const allUpdates = getAllUpdates();
  renderActivityPreview(allUpdates);
  renderUpdatesFull(allUpdates);
}

function renderUpdatesFull(all){
  document.getElementById('updates-list').innerHTML = all.map(u => `
    <div class="activity-item ${u.isNew ? 'new' : ''}">
      ${avatarHtml(u.author, 'sm')}
      <div>
        <div class="activity-text"><strong>${escapeHtml(u.author)}</strong>${u.type ? ' · ' + escapeHtml(u.type) : ''} — ${escapeHtml(u.text)}</div>
        <div class="activity-time">${escapeHtml(u.date)}</div>
      </div>
      ${EDIT_MODE ? `<button class="edit-remove-btn" onclick="removeUpdate('${u.source}',${u.idx})" title="Remove">&times;</button>` : ''}
    </div>
  `).join('');
}

function renderAll(){
  renderStatCards();
  renderTimelinePreview();
  renderDeadlinesWidget();
  renderProgressWidget();
  renderTasksPreview();
  renderZonesPreview();
  renderTeamWidget();
  renderGantt();
  renderPhases();
  renderOpenItemsFull();
  renderRisk();
  renderZonesFull();
  renderGraphics();

  const allUpdates = getAllUpdates();
  renderActivityPreview(allUpdates);
  renderUpdatesFull(allUpdates);

  document.getElementById('nav-badge-items').textContent = DATA.OPEN_ITEMS.filter(i => i.urgent).length;
  document.getElementById('nav-badge-risk').textContent = DATA.RISKS.high.length;
}

// generic save-on-blur for contenteditable fields (quiet — no re-render, so focus isn't disturbed)
document.addEventListener('focusout', (e) => {
  const el = e.target;
  if(!el.matches || !el.matches('[data-arr][data-field]')) return;
  saveField(el.dataset.arr, Number(el.dataset.idx), el.dataset.field, el);
});

// ---------- Nav active state ----------
function setupNav(){
  const links = Array.from(document.querySelectorAll('.nav-item'));
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));
  function onScroll(){
    let idx = 0;
    const y = window.scrollY + 100;
    sections.forEach((s, i) => { if(s && s.offsetTop <= y) idx = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === idx));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.getElementById('btn-view-tasks').addEventListener('click', () => {
    window.location.hash = '#open-items';
  });
  document.getElementById('btn-edit-toggle').addEventListener('click', toggleEditMode);
  document.getElementById('btn-reset-content').addEventListener('click', resetSiteData);
}

// ---------- Sidebar user chip ----------
function loadSignedInUser(){
  try{ return JSON.parse(localStorage.getItem('cocreate2026_user') || 'null'); }
  catch(e){ return null; }
}
function saveSignedInUser(user){
  localStorage.setItem('cocreate2026_user', JSON.stringify(user));
}
function renderSidebarUser(){
  const user = loadSignedInUser();
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl = document.getElementById('sidebar-name');
  const roleEl = document.getElementById('sidebar-role');
  if(user){
    avatarEl.textContent = initials(user.name);
    avatarEl.style.background = colorForName(user.name);
    nameEl.textContent = user.name;
    roleEl.textContent = 'Signed in';
  } else {
    avatarEl.textContent = '?';
    avatarEl.style.background = 'linear-gradient(135deg, var(--accent), var(--accent2))';
    nameEl.textContent = 'Sign in';
    roleEl.textContent = 'via Report / Ask';
  }
}

// ---------- Report / Ask modal ----------
function setupModal(){
  const overlay = document.getElementById('modal-overlay');
  const fab = document.getElementById('fab-btn');
  const addUpdateBtn = document.getElementById('btn-add-update');
  const closeX = document.getElementById('modal-close');
  const stepEmail = document.getElementById('modal-step-email');
  const stepPost = document.getElementById('modal-step-post');
  const emailInput = document.getElementById('email-input');
  const emailError = document.getElementById('email-error');
  const emailContinue = document.getElementById('email-continue');
  const modalWho = document.getElementById('modal-who');
  const postType = document.getElementById('post-type');
  const postText = document.getElementById('post-text');
  const postCancel = document.getElementById('post-cancel');
  const postSubmit = document.getElementById('post-submit');
  const sidebarChip = document.getElementById('sidebar-user-chip');

  let currentUser = loadSignedInUser();

  function openModal(){
    overlay.classList.add('open');
    const remembered = loadSignedInUser();
    emailInput.value = remembered ? remembered.email : '';
    stepEmail.style.display = 'block';
    stepPost.style.display = 'none';
    emailError.classList.remove('show');
    emailInput.focus();
  }
  function closeModal(){ overlay.classList.remove('open'); }

  fab.addEventListener('click', openModal);
  addUpdateBtn.addEventListener('click', openModal);
  sidebarChip.addEventListener('click', openModal);
  closeX.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });

  emailContinue.addEventListener('click', () => {
    const email = emailInput.value.trim().toLowerCase();
    const name = ACCESS_LIST[email];
    if(!name){
      emailError.classList.add('show');
      return;
    }
    currentUser = { email, name };
    saveSignedInUser(currentUser);
    renderSidebarUser();
    modalWho.textContent = `Signed in as ${name}`;
    stepEmail.style.display = 'none';
    stepPost.style.display = 'block';
    postText.value = '';
    postText.focus();
  });
  emailInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') emailContinue.click(); });

  postCancel.addEventListener('click', closeModal);
  postSubmit.addEventListener('click', () => {
    const text = postText.value.trim();
    if(!text || !currentUser) return;
    const posted = loadPostedUpdates();
    posted.unshift({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: currentUser.name,
      type: postType.value,
      text,
    });
    savePostedUpdates(posted);
    const allUpdates = getAllUpdates();
    renderActivityPreview(allUpdates);
    renderUpdatesFull(allUpdates);
    closeModal();
    window.location.hash = '#updates';
  });
}

// ---------- Zone gallery modal ----------
function setupZoneModal(){
  const overlay = document.getElementById('zone-modal-overlay');
  const closeBtn = document.getElementById('zone-modal-close');
  const titleEl = document.getElementById('zone-modal-title');
  const statusEl = document.getElementById('zone-modal-status');
  const viewer = document.querySelector('.zone-modal-viewer');
  const imgEl = document.getElementById('zone-modal-img');
  const counterEl = document.getElementById('zone-modal-counter');
  const phototypeEl = document.getElementById('zone-modal-phototype');
  const prevBtn = document.getElementById('zone-modal-prev');
  const nextBtn = document.getElementById('zone-modal-next');
  const thumbsEl = document.getElementById('zone-modal-thumbs');
  const checklistEl = document.getElementById('zone-modal-checklist');
  const flagEl = document.getElementById('zone-modal-flag');

  let zone = null;
  let photoIndex = 0;
  let currentPhotoSlug = null;

  // Tap a shop drawing to open it full-size in a new tab (specs are text-heavy).
  imgEl.addEventListener('click', () => {
    if(imgEl.classList.contains('is-drawing') && currentPhotoSlug){
      window.open(`assets/zones/${currentPhotoSlug}.jpg${IMG_CACHE_BUST}`, '_blank');
    }
  });

  const newItemInput = document.getElementById('zone-modal-new-item');
  const addItemBtn = document.getElementById('zone-modal-add-btn');
  const unitsEl = document.getElementById('zone-modal-units');
  const checklistLabelEl = document.getElementById('zone-modal-checklist-label');

  let currentUnit = null; // a reference into zone.units[i], or null = viewing the shared/category checklist

  // Photos = client renders first, then AMG shop drawings. Each tagged with its type.
  function currentPhotos(){
    const src = (currentUnit && ((currentUnit.renders && currentUnit.renders.length) || (currentUnit.drawings && currentUnit.drawings.length)))
      ? currentUnit : zone;
    const renders = (src.renders || []).map(s => ({ slug: s, type: 'render' }));
    const drawings = (src.drawings || []).map(s => ({ slug: s, type: 'drawing' }));
    return renders.concat(drawings);
  }

  // In Category overview, each RENDER can represent a distinct tier (Community, Associate, ...).
  // Only renders map to tiers — shop drawings (which come after) never drive the checklist.
  function currentTier(){
    if(currentUnit) return null;
    const renders = zone.renders || [];
    if(!zone.tiers || zone.tiers.length !== renders.length) return null;
    if(photoIndex >= renders.length) return null; // viewing a drawing, not a tier render
    return zone.tiers[photoIndex] || null;
  }
  function checklistKey(){
    if(currentUnit) return `${zone.name} :: ${currentUnit.id}`;
    const tier = currentTier();
    return tier ? `${zone.name} :: tier-${tier.key}` : zone.name;
  }
  function checklistBase(){
    if(currentUnit) return currentUnit.req;
    const tier = currentTier();
    return tier ? tier.req : zone.req;
  }

  function loadAllState(){
    try{ return JSON.parse(localStorage.getItem('cocreate2026_checklist') || '{}'); }
    catch(e){ return {}; }
  }
  function saveAllState(state){
    localStorage.setItem('cocreate2026_checklist', JSON.stringify(state));
  }
  function loadZoneState(zoneName){
    const all = loadAllState();
    const zs = all[zoneName] || {};
    return { checked: zs.checked || [], removed: zs.removed || [], custom: zs.custom || [], edits: zs.edits || {} };
  }
  function saveZoneState(zoneName, zs){
    const all = loadAllState();
    all[zoneName] = zs;
    saveAllState(all);
  }

  let editingItem = null; // { type: 'base'|'custom', i: number }

  function renderUnits(){
    if(!zone.units || zone.units.length === 0){
      unitsEl.classList.remove('show');
      checklistLabelEl.classList.remove('show');
      unitsEl.innerHTML = '';
      return;
    }
    unitsEl.classList.add('show');
    checklistLabelEl.classList.add('show');
    const statusColor = (s) => s === 'TBD' ? 'var(--red)' : (s === 'Approved' ? 'var(--green)' : 'var(--yellow)');
    unitsEl.innerHTML = `
      <span class="unit-chip category-chip ${!currentUnit ? 'active' : ''}" data-unit="">Category overview</span>
      ${zone.units.map((u, i) => {
        const boothId = (u.label || '').split(' ')[0];
        const supplier = SUPPLIER_EN[boothId];
        return `
          <span class="unit-chip ${currentUnit === u ? 'active' : ''}" data-unit="${i}">
            <span class="unit-dot" style="background:${statusColor(u.status)}"></span>
            <span class="unit-chip-text">
              <span class="unit-label">${escapeHtml(u.label)}</span>
              ${supplier ? `<span class="unit-supplier">${escapeHtml(supplier)}</span>` : ''}
            </span>
          </span>
        `;
      }).join('')}
    `;
    renderChecklistLabel();
  }

  function renderChecklistLabel(){
    if(!zone.units || zone.units.length === 0){
      checklistLabelEl.innerHTML = '';
      return;
    }
    if(!currentUnit){
      const tier = currentTier();
      if(tier){
        checklistLabelEl.innerHTML = `<span>Viewing: ${escapeHtml(tier.name)} tier (${escapeHtml(tier.sqm)}) — ${tier.count} of ${zone.units.length} booths</span>`;
      } else {
        checklistLabelEl.innerHTML = `<span>Shared checklist — applies to all ${zone.units.length} booths by default</span>`;
      }
      return;
    }
    const unitIdx = zone.units.indexOf(currentUnit);
    if(EDIT_MODE){
      checklistLabelEl.innerHTML = `
        <span>Viewing:</span>
        <span class="unit-edit-fields">
          <input type="text" value="${escapeHtml(currentUnit.label)}" onblur="DATA.ZONES[${DATA.ZONES.indexOf(zone)}].units[${unitIdx}].label=this.value.trim()||'${jsAttrEscape(currentUnit.label)}';saveSiteData();document.dispatchEvent(new CustomEvent('unit-changed'));">
          <select onchange="DATA.ZONES[${DATA.ZONES.indexOf(zone)}].units[${unitIdx}].status=this.value;saveSiteData();document.dispatchEvent(new CustomEvent('unit-changed'));">
            ${ZONE_STATUS_OPTIONS.map(s => `<option value="${s}" ${s === currentUnit.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </span>`;
    } else {
      checklistLabelEl.innerHTML = `<span>Viewing: ${escapeHtml(currentUnit.label)} (${escapeHtml(currentUnit.status)})</span>`;
    }
  }

  unitsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.unit-chip');
    if(!chip) return;
    const idx = chip.dataset.unit;
    currentUnit = idx === '' ? null : zone.units[Number(idx)];
    editingItem = null;
    photoIndex = 0;
    renderUnits();
    renderChecklist();
    renderPhoto();
  });
  document.addEventListener('unit-changed', () => renderUnits());

  function renderChecklist(){
    const zs = loadZoneState(checklistKey());
    const baseItems = (checklistBase() || [])
      .map((text, i) => ({ text: zs.edits[i] !== undefined ? zs.edits[i] : text, i, checked: !!zs.checked[i], type: 'base' }))
      .filter(it => !zs.removed.includes(it.i));
    const customItems = zs.custom.map((c, i) => ({ text: c.text, i, checked: !!c.checked, type: 'custom' }));
    const all = baseItems.concat(customItems);

    if(all.length === 0){
      checklistEl.innerHTML = '<div class="zone-modal-empty-req">No itemized requirements yet — add one below.</div>';
      return;
    }
    checklistEl.innerHTML = all.map(it => {
      const isEditing = editingItem && editingItem.type === it.type && editingItem.i === it.i;
      if(isEditing){
        return `
          <div class="zone-checklist-item" data-type="${it.type}" data-i="${it.i}">
            <span class="check">${it.checked ? '✓' : ''}</span>
            <input type="text" class="zone-checklist-edit-input" value="${escapeHtml(it.text)}">
          </div>`;
      }
      return `
        <div class="zone-checklist-item ${it.checked ? 'checked' : ''}" data-type="${it.type}" data-i="${it.i}">
          <span class="check">${it.checked ? '✓' : ''}</span>
          <span class="label">${escapeHtml(it.text)}</span>
          <button class="item-edit" title="Edit">✎</button>
          <button class="item-remove" title="Remove">&times;</button>
        </div>`;
    }).join('');

    if(editingItem){
      const input = checklistEl.querySelector('.zone-checklist-edit-input');
      if(input){
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        const commit = () => {
          const zs2 = loadZoneState(checklistKey());
          const newText = input.value.trim();
          if(newText){
            if(editingItem.type === 'base') { zs2.edits[editingItem.i] = newText; }
            else { zs2.custom[editingItem.i].text = newText; }
            saveZoneState(checklistKey(), zs2);
          }
          editingItem = null;
          renderChecklist();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
          if(e.key === 'Enter') input.blur();
          if(e.key === 'Escape'){ editingItem = null; renderChecklist(); }
        });
      }
    }
  }

  checklistEl.addEventListener('click', (e) => {
    const item = e.target.closest('.zone-checklist-item');
    if(!item || !zone) return;
    const i = Number(item.dataset.i);
    const type = item.dataset.type;

    if(e.target.closest('.item-edit')){
      editingItem = { type, i };
      renderChecklist();
      return;
    }
    if(e.target.closest('.item-remove')){
      const zs = loadZoneState(checklistKey());
      if(type === 'base'){
        if(!zs.removed.includes(i)) zs.removed.push(i);
      } else {
        zs.custom.splice(i, 1);
      }
      saveZoneState(checklistKey(), zs);
      renderChecklist();
      return;
    }
    const zs = loadZoneState(checklistKey());
    if(type === 'base'){
      zs.checked[i] = !zs.checked[i];
    } else {
      zs.custom[i].checked = !zs.custom[i].checked;
    }
    saveZoneState(checklistKey(), zs);
    renderChecklist();
  });

  function addCustomItem(){
    const text = newItemInput.value.trim();
    if(!text || !zone) return;
    const zs = loadZoneState(checklistKey());
    zs.custom.push({ text, checked: false });
    saveZoneState(checklistKey(), zs);
    newItemInput.value = '';
    renderChecklist();
  }
  addItemBtn.addEventListener('click', addCustomItem);
  newItemInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') addCustomItem(); });

  function renderPhoto(){
    const photos = currentPhotos();
    const contextLabel = currentUnit ? currentUnit.label : zone.name;
    let existingEmpty = viewer.querySelector('.empty');
    if(existingEmpty) existingEmpty.remove();

    if(photos.length === 0){
      imgEl.style.display = 'none';
      counterEl.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      phototypeEl.style.display = 'none';
      currentPhotoSlug = null;
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = currentUnit
        ? 'No photo for this booth yet — showing the category default above, or add one in Edit Page.'
        : 'No renderings yet — design not received for this zone.';
      viewer.appendChild(empty);
    } else {
      const p = photos[photoIndex];
      currentPhotoSlug = p.slug;
      const isDwg = p.type === 'drawing';
      imgEl.style.display = '';
      imgEl.src = `assets/zones/${p.slug}.jpg${IMG_CACHE_BUST}`;
      imgEl.alt = `${contextLabel} ${isDwg ? 'shop drawing' : 'rendering'} ${photoIndex + 1}`;
      imgEl.classList.toggle('is-drawing', isDwg);
      phototypeEl.style.display = '';
      phototypeEl.className = `zone-modal-phototype ${isDwg ? 'drawing' : 'render'}`;
      phototypeEl.textContent = isDwg ? '📐 AMG shop drawing · tap to enlarge' : '🎨 Client render';
      const multi = photos.length > 1;
      counterEl.style.display = multi ? '' : 'none';
      prevBtn.style.display = multi ? '' : 'none';
      nextBtn.style.display = multi ? '' : 'none';
      counterEl.textContent = `${photoIndex + 1} / ${photos.length}`;
    }

    thumbsEl.style.display = photos.length > 1 ? 'flex' : 'none';
    thumbsEl.innerHTML = photos.map((p, i) => {
      const divider = (p.type === 'drawing' && i > 0 && photos[i - 1].type !== 'drawing')
        ? '<span class="thumb-divider" title="AMG shop drawings">📐</span>' : '';
      return `${divider}<img src="assets/zones/${p.slug}.jpg${IMG_CACHE_BUST}" class="thumb-${p.type} ${i === photoIndex ? 'active' : ''}" data-i="${i}" alt="thumbnail ${i + 1}">`;
    }).join('');
  }

  function openZone(index){
    zone = DATA.ZONES[index];
    currentUnit = null;
    photoIndex = 0;
    titleEl.textContent = zone.name;
    statusEl.textContent = zone.status;
    statusEl.className = `pill ${zone.status === 'TBD' ? 'hard' : 'unconfirmed'}`;
    newItemInput.value = '';
    editingItem = null;
    renderUnits();
    renderChecklist();
    flagEl.textContent = zone.flag;
    flagEl.className = `zone-flag ${zone.blocking ? 'blocking' : ''}`;
    renderPhoto();
    overlay.classList.add('open');
  }
  function closeZone(){ overlay.classList.remove('open'); }

  document.getElementById('zones-preview').addEventListener('click', (e) => {
    const card = e.target.closest('.zone-card');
    if(card) openZone(Number(card.dataset.zoneIndex));
  });
  document.getElementById('zone-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.zone-card');
    if(card) openZone(Number(card.dataset.zoneIndex));
  });

  closeBtn.addEventListener('click', closeZone);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeZone(); });

  function onPhotoChanged(){
    renderPhoto();
    // The photo may have just switched to a different tier — only relevant in Category overview.
    if(!currentUnit && currentTier()){
      editingItem = null;
      renderChecklistLabel();
      renderChecklist();
    }
  }
  function step(delta){
    const photos = currentPhotos();
    if(photos.length === 0) return;
    photoIndex = (photoIndex + delta + photos.length) % photos.length;
    onPhotoChanged();
  }
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  thumbsEl.addEventListener('click', (e) => {
    const t = e.target.closest('img[data-i]');
    if(t){ photoIndex = Number(t.dataset.i); onPhotoChanged(); }
  });

  document.addEventListener('keydown', (e) => {
    if(!overlay.classList.contains('open')) return;
    if(e.key === 'Escape') closeZone();
    if(e.key === 'ArrowLeft') step(-1);
    if(e.key === 'ArrowRight') step(1);
  });
}

// ---------- Drag-to-reorder zones (Edit Mode only) ----------
function setupZoneDrag(){
  const grid = document.getElementById('zone-grid');
  let dragSrc = null;      // source zone index
  let dropBefore = null;   // insert-before index in the current array

  function clearIndicators(){
    grid.querySelectorAll('.zone-card').forEach(c => c.classList.remove('drop-before', 'drop-after', 'zone-dragging'));
  }

  grid.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.zone-drag-handle');
    if(!handle || !EDIT_MODE){ e.preventDefault(); return; }
    const card = handle.closest('.zone-card');
    dragSrc = Number(card.dataset.zoneIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragSrc));
    try { e.dataTransfer.setDragImage(card, 20, 20); } catch(_){}
    card.classList.add('zone-dragging');
  });

  grid.addEventListener('dragover', (e) => {
    if(dragSrc === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.zone-card');
    grid.querySelectorAll('.zone-card').forEach(c => c.classList.remove('drop-before', 'drop-after'));
    if(!card){ dropBefore = DATA.ZONES.length; return; }
    const idx = Number(card.dataset.zoneIndex);
    const rect = card.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    if(after){ card.classList.add('drop-after'); dropBefore = idx + 1; }
    else { card.classList.add('drop-before'); dropBefore = idx; }
  });

  grid.addEventListener('drop', (e) => {
    if(dragSrc === null) return;
    e.preventDefault();
    const from = dragSrc;
    const to = (dropBefore === null) ? DATA.ZONES.length : dropBefore;
    dragSrc = null; dropBefore = null;
    clearIndicators();
    moveZone(from, to);
  });

  grid.addEventListener('dragend', () => {
    dragSrc = null; dropBefore = null;
    clearIndicators();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSiteData();
  initFirebase();
  renderAll();
  renderSidebarUser();
  setupNav();
  setupModal();
  setupZoneModal();
  setupZoneDrag();
});
