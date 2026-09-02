// CoCreate 2026 — Project Hub
// Static, client-side. Report/Ask uses a local access list + localStorage — no real backend.
// All project content lives in DATA and is editable in-browser via Edit Mode (persisted to localStorage).

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const SHOW_START = new Date('2026-09-09');
const IMG_CACHE_BUST = '?v=20260903';  // bump to bust image CDN cache

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

const ZONE_ICONS = { 'Registration': '🏛', 'Core Display': '🔤', 'Keynote Hall': '🎤', 'AMA / Influencer Hub': '📷', 'Match Meeting': '🤝', 'Mini Panel': '🎙', 'Buyer Story': '📖', 'Unboxing Live': '📦', 'Next-Gen Sourcing + AI': '🤖', 'Podcast': '🎧', 'Chongqing Pavilion': '🏮', 'National Pavilion': '🌐', 'Sourcing Hub': '🔎', 'Sponsor Booths 16+1': '🏷', 'Supplier A200 — Block A': '🅰️', 'Supplier A200 — Block B': '🅱️', 'Supplier A200 — Block C': '©️', 'Supplier A200 — Block D': '🅳', 'Supplier A200 — Block E': '🅴', 'Supplier Non-A200 — Block F': '🅵', 'Supplier Non-A200 — Block G': '🅶', 'Muse Booth': '🎨', 'UED Booth': '💻', 'Creator Market': '🧵', 'Agentic Robotics Arena': '🦾' };

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
const SPONSOR_COMMUNITY_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '2× LED arm light', 'Grey carpet'];
const SPONSOR_ASSOCIATE_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '1× 42" TV + floor stand + Media Player', '4× LED arm light', 'Grey carpet'];
const SPONSOR_EXECUTIVE_REQ = ['1× Std Counter — 990W×1000H×495D, Formica White', '1× 42" TV + floor stand + Media Player', '6× LED arm light', 'Grey carpet'];
const SPONSOR_PREMIER_REQ = ['1× Custom Counter — 1800W×500H×1000D, wooden joinery', '1× 42" TV wall mount + Media Player', '7× LED arm light', 'Grey carpet'];

const R_8X8 = ['sponsor-booths-2'];
const R_10X10 = ['sponsor-booths-3'];
const R_10X15 = ['sponsor-booths-4'];
const R_10X20 = ['sponsor-booths-5'];

const SPONSOR_TIERS = [
  { key:'p01', name:'P-01', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-01-0825'] },
  { key:'p02', name:'P-02', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-02-0825'] },
  { key:'p03', name:'P-03', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-03-0825'] },
  { key:'p04', name:'P-04', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-04-0825'] },
  { key:'p05', name:'P-05', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-05-0825'] },
  { key:'p06', name:'P-06', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: R_8X8 },
  { key:'p07', name:'P-07', sqm:'10×15ft', count:1, req: SPONSOR_EXECUTIVE_REQ, renders: ['sponsor-p-07-0825'] },
  { key:'p08', name:'P-08', sqm:'10×20ft', count:1, req: SPONSOR_PREMIER_REQ, renders: ['sponsor-p-08-0825'] },
  { key:'p09', name:'P-09', sqm:'10×15ft', count:1, req: SPONSOR_EXECUTIVE_REQ, renders: ['sponsor-p-09-0825'] },
  { key:'p10', name:'P-10', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-10-0825'] },
  { key:'p11', name:'P-11', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-11-0825'] },
  { key:'p12', name:'P-12', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-12-0825'] },
  { key:'p13', name:'P-13', sqm:'8×8ft', count:1, req: SPONSOR_COMMUNITY_REQ, renders: ['sponsor-p-13-0825'] },
  { key:'p14', name:'P-14', sqm:'10×10ft', count:1, req: [], renders: ['sponsor-p-14-0825'] },
  { key:'p15', name:'P-15', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: ['sponsor-p-15-0825'] },
  { key:'p16', name:'P-16', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: ['sponsor-p-16-0825'] },
  { key:'p17', name:'P-17', sqm:'10×10ft', count:1, req: SPONSOR_ASSOCIATE_REQ, renders: ['sponsor-p-17-0825'] },
];

const ZONE_A_TIER = [
  { key:'a01', name:'A-01', sqm:'8m²', count:1, drawings: ['block-a-dwg-8'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)'] },
  { key:'a02', name:'A-02', sqm:'8m²', count:1, drawings: ['block-a-dwg-9'], renders: ['a-02-0829', 'a-02-0829-2', 'a-02-layout'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)'] },
  { key:'a03', name:'A-03', sqm:'8m²', count:1, drawings: ['block-a-dwg-10'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','7x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)'] },
  { key:'a04', name:'A-04', sqm:'8m²', count:1, drawings: ['block-a-dwg-11'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','24x) 10" Metal L-Bracket (WHT)'] },
  { key:'a05', name:'A-05', sqm:'8m²', count:1, drawings: ['block-a-dwg-12'], renders: ['a-05-0829', 'a-05-0829-2', 'a-05-layout'], req: ['Grey carpet'] },
  { key:'a06', name:'A-06', sqm:'8m²', count:1, drawings: ['block-a-dwg-13'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','10x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','28x) 10" Metal L-Bracket (WHT)'] },
  { key:'a07', name:'A-07', sqm:'8m²', count:1, drawings: ['block-a-dwg-14'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','26x) 10" Metal L-Bracket (WHT)'] },
  { key:'a08', name:'A-08', sqm:'8m²', count:1, drawings: ['block-a-dwg-15'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*400 (D), Shelf, Formica (WHT)','11x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','30x) 10" Metal L-Bracket (WHT)'] },
  { key:'a09', name:'A-09', sqm:'8m²', count:1, drawings: ['block-a-dwg-16'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','9x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','27x) 10" Metal L-Bracket (WHT)'] },
];
const ZONE_B_TIER = [
  { key:'b01', name:'B-01', sqm:'8m²', count:1, drawings: ['block-b-dwg-11'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b02', name:'B-02', sqm:'8m²', count:1, drawings: ['block-b-dwg-9'],  renders: ['b-02-0829', 'b-02-0829-2', 'b-02-layout'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b03', name:'B-03', sqm:'8m²', count:1, drawings: ['block-b-dwg-9'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b04', name:'B-04', sqm:'8m²', count:1, drawings: ['block-b-dwg-10'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b05', name:'B-05', sqm:'16m²', count:1, drawings: ['block-b-dwg-10'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b06', name:'B-06', sqm:'12m²', count:1, drawings: ['block-b-dwg-11'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'b07', name:'B-07', sqm:'8m²', count:1, drawings: ['block-b-dwg-9'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
];
const ZONE_C_TIER = [
  { key:'c01', name:'C-01', sqm:'8m²', count:1, drawings: ['block-c-dwg-9'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'c02', name:'C-02', sqm:'8m²', count:1, drawings: ['block-c-dwg-10'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','10x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','20x) 10" Metal L-Bracket (WHT)'] },
  { key:'c03', name:'C-03', sqm:'8m²', count:1, drawings: ['block-c-dwg-11'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 10" Metal L-Bracket (WHT)'] },
  { key:'c04', name:'C-04', sqm:'8m²', count:1, drawings: ['block-c-dwg-12'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','6x) 10" Metal L-Bracket (WHT)'] },
  { key:'c05', name:'C-05', sqm:'8m²', count:1, drawings: ['block-c-dwg-13'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','5x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','15x) 10" Metal L-Bracket (WHT)'] },
  { key:'c06', name:'C-06', sqm:'8m²', count:1, drawings: ['block-c-dwg-14'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','8x) 10" Metal L-Bracket (WHT)'] },
  { key:'c07', name:'C-07', sqm:'8m²', count:1, drawings: ['block-c-dwg-15'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','6x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','18x) 10" Metal L-Bracket (WHT)'] },
  { key:'c08', name:'C-08', sqm:'8m²', count:1, drawings: ['block-c-dwg-16'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','14x) 10" Metal L-Bracket (WHT)'] },
  { key:'c09', name:'C-09', sqm:'14m²', count:1, drawings: ['supplier-display-dwg-1', 'block-c-dwg-17'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','1x) Display Shelving — 1452W×1700H×440D, Curved, Formica (WHT)'] },
  { key:'c10', name:'C-10', sqm:'8m²', count:1, drawings: ['block-c-dwg-18'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','12x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','27x) 10" Metal L-Bracket (WHT)'] },
  { key:'c11', name:'C-11', sqm:'8m²', count:1, drawings: ['block-c-dwg-19'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'c12', name:'C-12', sqm:'8m²', count:1, drawings: ['block-c-dwg-20'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','5x) 1700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','20x) 10" Metal L-Bracket (WHT)'] },
  { key:'c13', name:'C-13', sqm:'8+18m²', count:1, drawings: ['block-c-dwg-21'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'c14', name:'C-14', sqm:'8m²', count:1, renders: ['c14-render-1'], drawings: ['block-c-dwg-22'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
];
const ZONE_D_TIER = [
  { key:'d01', name:'D-01', sqm:'14m²', count:1, drawings: ['supplier-display-dwg-2', 'block-d-dwg-11'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light','2x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1000 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1950 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','14x) 10" Metal L-Bracket (WHT)','1x) Display Shelving — 1452W×1700H×440D, Curved, Formica (WHT)'] },
  { key:'d02', name:'D-02', sqm:'8m²', count:1, drawings: ['block-d-dwg-12'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','16x) 10" Metal L-Bracket (WHT)'] },
  { key:'d03', name:'D-03', sqm:'8m²', count:1, drawings: ['block-d-dwg-13'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','12x) 10" Metal L-Bracket (WHT)'] },
  { key:'d04', name:'D-04', sqm:'8m²', count:1, drawings: ['block-d-dwg-14'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','3x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1800 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','13x) 10" Metal L-Bracket (WHT)'] },
  { key:'d05', name:'D-05', sqm:'8m²', count:1, drawings: ['block-d-dwg-15'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'d06', name:'D-06', sqm:'8m²', count:1, drawings: ['block-d-dwg-16'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 1350 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1800 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','13x) 10" Metal L-Bracket (WHT)'] },
  { key:'d07', name:'D-07', sqm:'8m²', count:1, drawings: ['block-d-dwg-17'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'d08', name:'D-08', sqm:'8m²', count:1, drawings: ['block-d-dwg-18'],  renders: ['d08-render-1'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'d09', name:'D-09', sqm:'8m²', count:1, drawings: ['block-d-dwg-19'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','7x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','22x) 10" Metal L-Bracket (WHT)'] },
  { key:'d10', name:'D-10', sqm:'10m²', count:1, drawings: ['block-d-dwg-20'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','2x) 1400 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','16x) 10" Metal L-Bracket (WHT)'] },
];
const ZONE_E_TIER = [
  { key:'e01', name:'E-01', sqm:'8m²', count:1, drawings: ['block-e-dwg-7'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','1x) 1500 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','7x) 10" Metal L-Bracket (WHT)','1× 4\'-6" Clothes Rack','1× 5\'-0" Clothes Rack'] },
  { key:'e02', name:'E-02', sqm:'8m²', count:1, drawings: ['block-e-dwg-8'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'e03', name:'E-03', sqm:'8m²', count:1, drawings: ['block-e-dwg-9'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','8x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','4x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','24x) 10" Metal L-Bracket (WHT)'] },
  { key:'e04', name:'E-04', sqm:'8m²', count:1, drawings: ['block-e-dwg-10'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','6x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','12x) 10" Metal L-Bracket (WHT)'] },
  { key:'e05', name:'E-05', sqm:'8m²', count:1, drawings: ['block-e-dwg-11'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2× 5\'-0" Clothes Rack','4× 12" Rod for Clothes, Wall Mount'] },
  { key:'e06', name:'E-06', sqm:'8m²', count:1, drawings: ['supplier-display-dwg-3', 'block-e-dwg-12'], req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','1x) Display Case — 1902W×2092H×150D, Formica (WHT)'] },
  { key:'e07', name:'E-07', sqm:'8m²', count:1, drawings: ['block-e-dwg-13'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','2x) 900 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','3x) 1000 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','10x) 10" Metal L-Bracket (WHT)','11× Hat/Coat Hook'] },
  { key:'e08', name:'E-08', sqm:'8m²', count:1, drawings: ['block-e-dwg-14'],  req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light','8x) 450 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','6x) 700 (W)*18 (H)*300 (D), Shelf, Formica (WHT)','28x) 10" Metal L-Bracket (WHT)'] },
];
const ZONE_F_TIER = [
  { key:'sm', name:'Booth', sqm:'6m²', count:11, req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'md', name:'Booth', sqm:'8m²', count:8, req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'lg', name:'Booth', sqm:'14m²', count:2, req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light'] },
];
const ZONE_G_TIER = [
  { key:'sm', name:'Booth', sqm:'8m²', count:9, req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','2× LED arm light'] },
  { key:'lg', name:'Booth', sqm:'14m²', count:2, req: ['42" TV + floor stand + Media Player','Std Counter — 990W×1000H×495D, Formica White','Grey carpet','4× LED arm light'] },
];
const ZONE_CQ_TIER = [
  { key:'cq1', name:'CQ-1', sqm:'9m²', count:1, renders: ['chongqing-0825-5', 'cq-01-layout'], req: ['1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','Black+Orange Carpet'] },
  { key:'cq2', name:'CQ-2', sqm:'9m²', count:1, renders: ['chongqing-0825-6', 'cq-02-layout'], req: ['1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','Black+Orange Carpet'] },
  { key:'cq3', name:'CQ-3', sqm:'9m²', count:1, renders: ['chongqing-0825-7', 'cq-03-layout'], req: ['1× Std Counter — 990W×1000H×495D, Formica Black','1× 42" TV wall mount + Media Player','2× LED arm light','Black+Orange Carpet'] },
];

const ZONE_GB_TIER = [
  { key:'us', name:'GB-US', sqm:'4m²', count:19, req: ['Grey carpet', '2× LED arm light'] },
  { key:'pk', name:'GB-Pakistan', sqm:'4m²', count:9, req: ['Grey carpet', '2× LED arm light'] },
  { key:'ot', name:'GB-Others', sqm:'4m²', count:14, req: ['Grey carpet', '2× LED arm light'] },
];

const ZONE_I_TIER = [
  { key:'i01', name:'I-01', sqm:'—', count:1, renders: ['agentic-robotics-render-3'], req: [] },
  { key:'i02', name:'I-02', sqm:'—', count:1, renders: ['agentic-robotics-render-4'], req: [] },
  { key:'i03', name:'I-03', sqm:'—', count:1, renders: ['agentic-robotics-render-5'], req: [] },
];

// Booth ID labels with individual sqm from floor plan
const BOOTH_LABELS = {
  a: ['A-01 (8m²)','A-02 (8m²)','A-03 (8m²)','A-04 (8m²)','A-05 (8m²)','A-06 (8m²)','A-07 (8m²)','A-08 (8m²)','A-09 (8m²)'],
  b: ['B-01 (8m²)','B-02 (8m²)','B-03 (8m²)','B-04 (8m²)','B-05 (8+8m²)','B-06 (8+4m²)','B-07 (8m²)'],
  c: ['C-01 (8m²)','C-02 (8m²)','C-03 (8m²)','C-04 (8m²)','C-05 (8m²)','C-06 (8m²)','C-07 (8m²)','C-08 (8m²)','C-09 (14m²)','C-10 (8m²)','C-11 (8m²)','C-12 (8m²)','C-13 (8+18m²)','C-14 (8m²)'],
  d: ['D-01 (14m²)','D-02 (8m²)','D-03 (8m²)','D-04 (8m²)','D-05 (8m²)','D-06 (8m²)','D-07 (8m²)','D-08 (8m²)','D-09 (8m²)','D-10 (8+2m²)'],
  e: ['E-01 (8m²)','E-02 (8m²)','E-03 (8m²)','E-04 (8m²)','E-05 (8m²)','E-06 (8m²)','E-07 (8m²)','E-08 (8m²)'],
  f: ['F-01 (8m²)','F-02 (8m²)','F-03 (6m²)','F-04 (6m²)','F-05 (6m²)','F-06 (6m²)','F-07 (6m²)','F-08 (6m²)','F-09 (6m²)','F-10 (6m²)','F-11 (8m²)','F-12 (8m²)','F-13 (14m²)','F-14 (8m²)','F-15 (8m²)','F-16 (4m²)','F-17 (4m²)','F-18 (4m²)','F-19 (8m²)','F-20 (8m²)','F-21 (14m²)'],
  g: ['G-01 (8m²)','G-02 (8m²)','G-03 (8m²)','G-04 (8m²)','G-05 (8m²)','G-06 (8m²)','G-07 (14m²)','G-08 (14m²)','G-09 (8m²)','G-10 (8m²)','G-11 (8m²)'],
  cq: ['CQ-1 (9m²)','CQ-2 (9m²)','CQ-3 (9m²)'],
  i: ['I-01','I-02','I-03'],
  gb: ['GB-01 (6m²)','GB-02 (4m²)','GB-03 (4m²)','GB-04 (4m²)','GB-05 (4m²)','GB-06 (6m²)','GB-07 (4m²)','GB-08 (4m²)','GB-09 (4m²)','GB-10 (4m²)','GB-11 (4m²)','GB-12 (4m²)','GB-13 (4m²)','GB-14 (4m²)','GB-15 (4m²)','GB-16 (4m²)','GB-17 (4m²)','GB-18 (4m²)','GB-19 (4m²)','GB-20 (4m²)','GB-21 (4m²)','GB-22 (4m²)','GB-23 (4m²)','GB-24 (4m²)','GB-26 (4m²)','GB-27 (4m²)','GB-28 (4m²)','GB-30 (4m²)','GB-31 (4m²)','GB-32 (4m²)','GB-33 (4m²)','GB-34 (4m²)','GB-35 (4m²)','GB-36 (4m²)','GB-37 (4m²)','GB-38 (4m²)','GB-39 (4m²)','GB-40 (4m²)','GB-41 (4m²)','GB-42 (4m²)','GB-43 (4m²)','GB-44 (4m²)'],
};

// Supplier English short names (0818 floor plan) — keyed by booth ID
const SUPPLIER_EN = {
  'A-01':'Wenzhou Baoshijie','A-02':'Ningbo Youyi','A-03':'Choebe','A-04':'Zhejiang Minghui','A-06':'Sowin','A-07':'OPT','A-08':'Xiamen Xiefa','A-09':'Fuzhou Sencai',
  'B-01':'Shandong Nuoman','B-02':'Shanghai Kaiwei','B-03':'Henan Zhongyu Dingli','B-04':'Suzhou Transparent','B-05':'Shandong Eachan','B-06':'Shandong Hightop','B-07':'Suzhou Tongda',
  'C-01':'Ningbo Super','C-02':'Dongguan Yujie','C-03':'Charming','C-04':'Beijing Doorwin','C-05':'Masuma','C-06':'Xiamen Mingyuansheng','C-07':'Xiamen Hym','C-08':'Shenzhen Ejeas','C-09':'Foshan Fuson','C-10':'Zhangzhou Builder','C-11':'Guangdong Dejiyoupin','C-12':'SACA','C-13':'Qingdao Seahisun','C-14':'Shanghai Kenda',
  'D-01':'Biocaro','D-02':'Huion','D-03':'Quanzhou Binqi','D-04':'Xiamen Weiyou','D-05':'Gardensun','D-06':'Chiyang','D-07':'Superlaser','D-08':'South Intelligent Manufacturing','D-09':'Rundarongjia','D-10':'EMOKA',
  'E-01':'Healy','E-02':'Heniemo','E-03':'Funan Willow','E-04':'Bright Show','E-05':'YSTAR','E-06':'Allbright','E-07':'Yuze','E-08':'Sentron',
  'F-01':'Guangzhou Colorful Bag','F-02':'Shijiazhuang Xiameng','F-03':'Henan Nuoou','F-04':'Xuchang Fuxin','F-05':'Shenzhen Minshunlong','F-06':'Henan Anhuilong','F-07':'Haining Jinhu','F-08':'Guangzhou Horae','F-09':'Hangzhou Bingzhi','F-10':'Qingdao Haohao','F-11':'Zhejiang Oron','F-12':'Zhejiang Zhengjia','F-13':'Shenzhen Hopestar','F-14':'Yongkang Bomo','F-15':'Dongguan Juli','F-16':'Huizhou Shiwang','F-17':'Suzhou Cleva (代展)','F-18':'Yangjiang Huirui (代展)','F-19':'Sy Electronic (代展)','F-20':'Shanghai Yuedong (代展)','F-21':'Guangzhou Xin Flying',
  'G-01':'Optor','G-02':'HMG','G-03':'JEWELUX','G-04':'VF Home','G-05':'Nongshim','G-06':'TAIDOC','G-07':'Gowinpc','G-08':'PACK EVER','G-09':'PACE SPORTS','G-10':'SNDZ','G-11':'GAME ON',
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
  { phase: 'GSC Application submitted', dates: 'Starting Aug 7', duration: '—', status: 'progress', statusLabel: 'In progress', notes: 'Venue license received — AMG now applying. Jose leading + Yang Si tracking LACC deadlines.' },
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

ZONES: [
  { name: 'Registration', owner: 'Ari', status: 'Approved', img: 'registration-v2-2', renders: ['registration-0825-2'], drawings: ['registration-dwg-3', 'registration-dwg-5', 'registration-dwg-6', 'registration-dwg-7', 'registration-dwg-8', 'registration-dwg-9', 'registration-dwg-10'], scope: 'AMG provide registration backdrop, front and back graphic.column graphics', flag: 'Lobby area',
    req: ['12× Std LED arm light', '1× BO fabric — back wall front (REG-BK-WALL-FRT, 9896×2409, 4/0)', '1× BO fabric — back wall back (REG-BK-WALL-BK, 9896×2409, 4/0)', '1× Curved PVC column cover w/ Velcro (COLUMN-COVER, 4/0)'] },
  { name: 'Wayfinding System & Promotion Materials', owner: 'Ari', status: 'Approved', img: 'wayfinding-0825-1', renders: ['wayfinding-0825-1', 'wayfinding-render-2', 'wayfinding-render-3', 'wayfinding-floorplan-0903'], drawings: ['wayfinding-dwg-1', 'octanorm-dwg-3', 'octanorm-dwg-4', 'octanorm-dwg-5', 'octanorm-dwg-6', 'octanorm-dwg-7', 'octanorm-dwg-8'], scope: 'AMG provide. Stand ×5 (70×170cmH) + 100" TV ×2 w/ floor stand + Pop up ×3 (3×6.5ft).', flag: '', req: ['5× Stand — 70×170cmH', '2× 100" TV w/ floor stand', '3× Pop up — 3×6.5ft'] },
  { name: 'Keynote Hall', owner: 'Ari', status: 'Approved', img: 'keynote-dark', renders: ['keynote-dark', 'keynote-plan'], scope: 'Carpet removed. All by Youngs / Client.', flag: '⚠ Carpet removed', blocking: true, req: ['All other items — by Youngs / Client'] },
  { name: 'AMA / Influencer Hub', owner: 'Iris', status: 'Approved', img: 'ama-hub-render-1', renders: ['ama-hub-render-1'], scope: 'YOUNGS X JOHNATHAN — Banner ×6, Stage, Furniture by Youngs', flag: 'YOUNGS X JOHNATHAN', req: [] },

  { name: 'Match Meeting', owner: 'Chris', status: 'Approved', img: 'match-meeting-render-1', renders: ['match-meeting-render-1', 'match-meeting-render-2'], scope: 'YOUNGS X JOHNATHAN — Furniture by Youngs', req: [] },
  { name: 'Mini Panel', owner: 'Ari', status: 'Approved', img: 'mini-panel-render-1', renders: ['mini-panel-render-1', 'mini-panel-render-2'], scope: 'YOUNGS X JOHNATHAN — Mini Panel ×2, LED 4×2.5m, Banner ×2 each, Stage, Furniture by Youngs', flag: 'YOUNGS X JOHNATHAN', req: [] },
  { name: 'Core Display', owner: 'Ari', status: 'Approved', img: 'core-display-v2-2', renders: ['core-display-0825-2'], scope: 'Youngs provide', flag: 'YOUNGS', req: [] },
  { name: 'Next-Gen Sourcing + AI', owner: 'Ari', status: 'Approved', img: 'nextgen-render-1', renders: ['nextgen-render-1', 'nextgen-render-2', 'nextgen-render-3', 'nextgen-render-4', 'nextgen-render-5', 'nextgen-render-6', 'nextgen-render-7', 'nextgen-render-8', 'nextgen-render-9', 'nextgen-render-10', 'nextgen-render-11', 'nextgen-render-12', 'nextgen-render-13', 'nextgen-render-14', 'nextgen-render-15', 'nextgen-render-16', 'nextgen-render-17', 'nextgen-render-18', 'nextgen-render-19', 'nextgen-render-20', 'nextgen-render-21', 'nextgen-render-22'], drawings: ['nextgen-dwg-3', 'nextgen-dwg-5', 'nextgen-dwg-6', 'nextgen-dwg-7', 'nextgen-dwg-8', 'nextgen-dwg-9', 'nextgen-dwg-10', 'nextgen-dwg-11', 'nextgen-dwg-12', 'nextgen-dwg-13', 'nextgen-dwg-14', 'nextgen-dwg-16', 'nextgen-dwg-17', 'nextgen-dwg-18', 'nextgen-dwg-19', 'nextgen-dwg-20', 'nextgen-dwg-21', 'nextgen-dwg-22', 'nextgen-dwg-23', 'nextgen-dwg-24', 'nextgen-dwg-25', 'nextgen-dwg-26', 'nextgen-dwg-27', 'nextgen-dwg-28', 'nextgen-dwg-29', 'nextgen-dwg-30', 'nextgen-dwg-31', 'nextgen-dwg-32', 'nextgen-dwg-33', 'nextgen-dwg-34', 'nextgen-dwg-35', 'nextgen-dwg-36'], scope: 'AMG: Hanging Banners, Std+Custom Wood Panels (double-sided graphic), Floor Vinyl ×3, Custom Wood Display ×4, PVC Cut-outs ×3, Banners ×2, Cut-outs ×5, Tilted Wood Platform, 55" TV ×13, 100" TV ×1, Std Counter (9× 990 Black + 5× 495 Black + 1× 990 White + 1× 495 White + 2× 495 Orange), Tables & Stools, Custom Installation. JT: All Mac. All else by Youngs.', flag: 'Structure confirmed 8/17 — AMG+JT+Youngs',
    req: ['9× Std Counter — 990W×1000H×495D, Formica Black', '5× Std Counter — 495W×1000H×495D, Formica Black', '1× Std Counter — 990W×1000H×495D, Formica White', '1× Std Counter — 495W×1000H×495D, Formica White', '2× Std Counter — 495W×1000H×495D, Formica Orange', '13× 55" TV wall mount', '1× 100" TV wall mount', '1× Gray Carpet — 24000 (W)×12000 (L), 3168 sqft'] },
  { name: 'Buyer Story', owner: 'Chris', status: 'Approved', img: 'buyer-story-v2-2', renders: ['buyer-story-0825-2', 'buyer-story-0825-3', 'buyer-story-0825-4', 'buyer-story-0825-5', 'buyer-story-0825-6'], scope: 'Youngs provide structure. AMG build + 1× 42" TV (portrait) + floor stand + Media Player.', flag: '⚠ Youngs structure · AMG build + TV',
    req: ['Structure (by Youngs)', 'AMG build', '1× 42" TV (portrait) + floor stand + Media Player'] },
  { name: 'Unboxing Live', owner: 'Iris', status: 'Approved', img: 'unboxing-live-render-1', renders: ['unboxing-live-0825-2'], drawings: ['unboxing-dwg-3', 'unboxing-dwg-5', 'unboxing-dwg-6', 'unboxing-dwg-7', 'unboxing-dwg-8', 'unboxing-dwg-9', 'unboxing-dwg-10', 'unboxing-dwg-11', 'unboxing-dwg-12', 'unboxing-dwg-13', 'unboxing-dwg-14'], scope: 'R4 — Display block ×3, Double-sided Pop-up, 55" TV, Furniture by Youngs, Carpet 5584×5584mm', flag: '⚠ R4 — Pop-up + Display blocks + TV', req: ['1× Custom Display Box #03 — 300W×600H×300D, White Formica', '1× Custom Display Box #04 — 300W×650H×300D, White Formica', '1× Custom Display Box #05 — 300W×450H×300D, White Formica', 'Double-sided Pop-up', '1× 55" TV w/ floor stand', '1× Carpet — 5584 (W)×5584 (L), Finish (Pendent), 343 sqft'] },
  { name: 'Supplier A200 — Block A', owner: 'Jin', status: 'Approved', img: 'zone-a-map-0825b', renders: ['zone-a-map-0825b', 'block-a-graphic-final-1', 'block-a-graphic-final-2'], drawings: ['block-a-dwg-1', 'block-a-dwg-2', 'block-a-dwg-3', 'block-a-dwg-4', 'block-a-dwg-5', 'block-a-dwg-6'], scope: 'A-01 ~ A-09. 9× 8sqm. Wooden backdrop (4×2.5mH) + 42" TV + floor stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '9× 8sqm · 8 std counters · AMG shelf',
    req: ['8× 42" TV + floor stand + Media Player', '8× Std Counter — 990W×1000H×495D, Formica White', '9× Grey carpet (≈792 sqft)', '16× LED arm light', '3× Metal Panel Footing', '— AMG Shelf —', '27× 700mm shelf, Formica (WHT) (23× @300D + 4× @400D A-08)', '4× 900mm shelf, Formica (WHT) (4× @400D A-02)', '3× 1500mm shelf, Formica (WHT)', '73× 450mm shelf, Formica (WHT)', '213× 10" Metal L-Bracket (WHT)'], tiers: ZONE_A_TIER, units: makeTieredUnits('zone-a', ZONE_A_TIER, i => BOOTH_LABELS.a[i-1], n => [`a-${String(n).padStart(2,'0')}-0829`, `a-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier A200 — Block B', owner: 'Jin', status: 'Approved', img: 'zone-b-map-0825', renders: ['zone-b-map-0825', 'block-b-graphic-final-1', 'block-b-graphic-final-2'], drawings: ['block-b-dwg-1', 'block-b-dwg-2', 'block-b-dwg-3', 'block-b-dwg-4', 'block-b-dwg-5', 'block-b-dwg-6', 'block-b-dwg-7', 'block-b-dwg-8'], scope: 'B-01 ~ B-07. 5×8m² + 1×12m² + 1×16m². Wooden backdrop (4×2.5mH) + 42" TV + floor stand + Media Player + Std Counter + Grey carpet. A200 standard build.', flag: '7 booths · 7 std counters · 5×8 + 12 + 16m²',
    req: ['7× 42" TV + floor stand + Media Player', '7× Std Counter — 990W×1000H×495D, Formica White', '7× Grey carpet (≈748 sqft)', '14× LED arm light', '4× Metal Panel Footing'], tiers: ZONE_B_TIER, units: makeTieredUnits('zone-b', ZONE_B_TIER, i => BOOTH_LABELS.b[i-1], n => [`b-${String(n).padStart(2,'0')}-0829`, `b-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier A200 — Block C', owner: 'Chris', status: 'Approved', img: 'zone-c-map-0825', renders: ['zone-c-map-0825', 'block-c-graphic-final-1', 'block-c-graphic-final-2', 'block-c-graphic-final-3', 'block-c-graphic-final-4'], drawings: ['block-c-dwg-1', 'block-c-dwg-2', 'block-c-dwg-3', 'block-c-dwg-4', 'block-c-dwg-5', 'block-c-dwg-6', 'block-c-dwg-7', 'block-c-dwg-8'], scope: 'C-01 ~ C-14. 13×8m² + 1×14m² + 18m² extra carpet (C-13). Wooden backdrop (4×2.5mH) + 42" TV + floor stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '14 booths · 14 std counters · AMG shelf',
    req: ['14× 42" TV + floor stand + Media Player', '14× Std Counter — 990W×1000H×495D, Formica White', '14× Grey carpet (≈1496 sqft)', '30× LED arm light', '6× Metal Panel Footing', '— AMG Shelf —', '20× 700mm shelf, Formica (WHT)', '12× 450mm shelf, Formica (WHT)', '16× 1500mm shelf, Formica (WHT)', '5× 1700mm shelf, Formica (WHT)', '1× Display Shelving — 1452×1700×440, Curved, Formica (WHT) (C-09)', '132× 10" Metal L-Bracket (WHT)'], tiers: ZONE_C_TIER, units: makeTieredUnits('zone-c', ZONE_C_TIER, i => BOOTH_LABELS.c[i-1], n => [`c-${String(n).padStart(2,'0')}-0829`, `c-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier A200 — Block D', owner: 'Chris', status: 'Approved', img: 'zone-d-map-0825', renders: ['zone-d-map-0825', 'block-d-graphic-final-1', 'block-d-graphic-final-2'], drawings: ['block-d-dwg-1', 'block-d-dwg-2', 'block-d-dwg-3', 'block-d-dwg-4', 'block-d-dwg-5', 'block-d-dwg-6', 'block-d-dwg-7', 'block-d-dwg-8', 'block-d-dwg-9', 'block-d-dwg-10'], scope: 'D-01 ~ D-10. 1×14m² + 8×8m² + 1×10m² = 88m². Wooden backdrop + TV + Std Counter + Grey carpet + AMG shelf & L-bracket.', flag: '10 booths · 10 std counters · AMG shelf',
    req: ['10× 42" TV + floor stand + Media Player', '10× Std Counter — 990W×1000H×495D, Formica White', '10× Grey carpet (≈968 sqft)', '22× LED arm light', '3× Metal Panel Footing', '— AMG Shelf —', '3× 450mm shelf, Formica (WHT)', '9× 700mm shelf, Formica (WHT)', '7× 900mm shelf, Formica (WHT)', '3× 1000mm shelf, Formica (WHT)', '6× 1350mm shelf, Formica (WHT)', '8× 1500mm shelf, Formica (WHT)', '2× 1800mm shelf, Formica (WHT)', '2× 1400mm shelf, Formica (WHT)', '1× 1950mm shelf, Formica (WHT)', '1× Display Shelving — 1452×1700×440, Curved, Formica (WHT) (D-01)', '106× 10" Metal L-Bracket (WHT)'], tiers: ZONE_D_TIER, units: makeTieredUnits('zone-d', ZONE_D_TIER, i => BOOTH_LABELS.d[i-1], n => [`d-${String(n).padStart(2,'0')}-0829`, `d-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier A200 — Block E', owner: 'Chris', status: 'Approved', img: 'zone-e-map-0825', renders: ['zone-e-map-0825', 'block-e-graphic-final-1', 'block-e-graphic-final-2'], drawings: ['block-e-dwg-1', 'block-e-dwg-2', 'block-e-dwg-3', 'block-e-dwg-4', 'block-e-dwg-5', 'block-e-dwg-6'], scope: 'E-01 ~ E-08. 8× 8m². Wooden backdrop (4×2.5mH) + 42" TV + floor stand + Media Player + Std Counter + Grey carpet + AMG provide shelf & L-bracket.', flag: '8× 8m² · 8 std counters · AMG shelf',
    req: ['8× 42" TV + floor stand + Media Player', '8× Std Counter — 990W×1000H×495D, Formica White', '8× Grey carpet (≈704 sqft)', '16× LED arm light', '4× Metal Panel Footing', '— AMG Shelf —', '17× 450mm shelf, Formica (WHT)', '16× 700mm shelf, Formica (WHT)', '3× 900mm shelf, Formica (WHT)', '3× 1000mm shelf, Formica (WHT)', '1× 1500mm shelf, Formica (WHT)', '1× Display Case — 1902×2092×150, Formica (WHT) (E-06)', '81× 10" Metal L-Bracket (WHT)', '4× Clothes Rack (1×4\'6" + 3×5\'0")', '4× 12" Rod for Clothes', '11× Hat/Coat Hook'], tiers: ZONE_E_TIER, units: makeTieredUnits('zone-e', ZONE_E_TIER, i => BOOTH_LABELS.e[i-1], n => [`e-${String(n).padStart(2,'0')}-0829`, `e-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier Non-A200 — Block F', owner: 'Siyu', status: 'Approved', img: 'zone-f-map-0825', renders: ['zone-f-map-0825'], drawings: ['block-f-dwg-1', 'block-f-dwg-2', 'block-f-dwg-3'], scope: 'F-01 ~ F-21. 11×6m² + 8×8m² + 2×14m² = 158m². YOUNGS Pop Up. AMG provide counter + TV + lighting + bracket.', flag: '21 booths · 21 std counters · 11/8/2',
    req: ['21× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '21× 42" TV + Media Player + HDMI Cable + Floor Stand', '21× Grey carpet (≈1738 sqft)', '46× LED Arm Light', '26× Popup Bracket for PVC Graphic'], tiers: ZONE_F_TIER, units: makeTieredUnits('zone-f', ZONE_F_TIER, i => BOOTH_LABELS.f[i-1], n => [`f-${String(n).padStart(2,'0')}-0829`, `f-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Supplier Non-A200 — Block G', owner: 'Siyu', status: 'Approved', img: 'zone-g-map-0825', renders: ['zone-g-map-0825'], drawings: ['block-g-dwg-1', 'block-g-dwg-2'], scope: 'G-01 ~ G-11. 9×8m² + 2×14m². YOUNGS Pop Up. AMG provide counter + TV + lighting + bracket.', flag: '11 booths · 11 std counters · 9/2',
    req: ['11× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '11× 42" TV + Media Player + HDMI Cable + Floor Stand', '11× Grey carpet (≈1100 sqft)', '26× LED Arm Light', '22× Popup Bracket for PVC Graphic'], tiers: ZONE_G_TIER, units: makeTieredUnits('zone-g', ZONE_G_TIER, i => BOOTH_LABELS.g[i-1], n => [`g-${String(n).padStart(2,'0')}-0829`, `g-${String(n).padStart(2,'0')}-layout`]) },
  { name: 'Chongqing Pavilion', owner: 'Chris', status: 'Approved', img: 'chongqing-map', renders: ['chongqing-0825-2', 'chongqing-0825-3', 'chongqing-0825-4'], drawings: ['chongqing-dwg-1', 'chongqing-dwg-2', 'chongqing-dwg-3', 'chongqing-dwg-4', 'chongqing-dwg-5', 'chongqing-dwg-6'], scope: 'AMG shop drawings A.2–A.4 (JP, RENT). 27m² (3× 9sqm). Central: LED Lighting Structure 1200mm dia×3450mm H + 27× LED strips + 3× Display Stands (BLK Formica). Perimeter: 3× Std No Skin Panels 990×2413 + 42" TV wall mount + Media Player + Counter. Floor Trim 260ft.', flag: '3× 9sqm booths',
    req: ['3× Std Counter — 990W×1000H×495D, Formica Black', '3× 42" TV wall mount + Media Player', '6× LED arm light', '3× 9sqm Booths, Black+Orange Carpet'], tiers: ZONE_CQ_TIER, units: makeTieredUnits('cq', ZONE_CQ_TIER, i => BOOTH_LABELS.cq[i-1]) },
  { name: 'Sponsor Booths 16+1', owner: 'Jin', status: 'Approved', img: 'sponsor-booths-map-0825', renders: ['sponsor-booths-map-0825'], drawings: ['sponsor-dwg-1', 'sponsor-dwg-2', 'sponsor-dwg-3', 'sponsor-dwg-4', 'sponsor-dwg-5', 'sponsor-dwg-6', 'sponsor-dwg-7', 'sponsor-dwg-8'], scope: 'AMG shop drawings A.2–A.5 (JP, RENT). 17 booths (P-01 ~ P-17): 8×8ft ×10, 10×10ft ×3, 10×15ft ×2, 10×20ft ×1 (P-14 empty lot, not provided by AMG).', flag: '16+1 booths · 1× empty lot',
    req: ['15× Std Counter — 990W×1000H×495D, Formica White', '1× Custom Counter — 1800W×500H×1000D, wooden joinery (Premier)', '5× 42" TV + floor stand + Media Player', '1× 42" TV wall mount + Media Player (Premier)', '16× Grey carpet (≈1440 sqft)', '51× LED arm light'],
    tiers: SPONSOR_TIERS,
    units: makeTieredUnits('sponsor', SPONSOR_TIERS) },
  { name: 'National Pavilion', owner: 'Siyu', status: 'Approved', img: 'national-gb-map', renders: ['national-gb-map'], drawings: ['national-dwg-1', 'national-dwg-2'], scope: 'GB-01 ~ GB-44 (42 booths, GB-25 & GB-29 withdrew). AMG provide carpet + LED arm light only. 3 groups: GB-US×19, GB-Pakistan×9, GB-Others×14.', flag: '42 booths · carpet + lights only',
    req: ['42× Carpet (≈1890 sqft)', '84× LED arm light'], tiers: ZONE_GB_TIER, units: makeTieredUnits('gb', ZONE_GB_TIER, i => BOOTH_LABELS.gb[i-1], n => [`${BOOTH_LABELS.gb[n-1].split(' ')[0].toLowerCase()}-0829`]) },
  { name: 'Sourcing Hub', owner: 'Iris', status: 'Approved', img: 'sourcing-hub-map', renders: ['sourcing-hub-0825-2', 'sourcing-hub-0825-3'], drawings: ['sourcing-hub-dwg-1', 'sourcing-hub-dwg-2', 'sourcing-hub-dwg-3', 'sourcing-hub-dwg-4', 'sourcing-hub-dwg-5', 'sourcing-hub-dwg-6', 'sourcing-hub-dwg-7', 'sourcing-hub-dwg-8', 'sourcing-hub-dwg-9', 'sourcing-hub-dwg-10', 'sourcing-hub-dwg-11'], scope: 'AMG shop drawings A.2–A.7 (JP, RENT). 64m² (8×8m). Display Sign 1000×2000mm. 42" TV + floor stand + Media Player. 4 centers: A Shantou (Stair Display), B Yongkang (Display Stand+Acrylic), C Zhengzhou (5× Display Stands), D Guangzhou (Curved Display Stand 2000×1300). PVC graphics + floor vinyl per booth.', flag: '4 sourcing centers (9m² each) inside 64m² space',
    req: ['1× Display Sign — 1000W×2000H×300D, Formica White, Paint Orange, LED Strip', '8× LED arm light', '1× 42" TV + floor stand + Media Player', 'Booth A Shantou: Three-Step Stair Display 1200W×900H×900D (WHT) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth B Yongkang: Display Stand 1424W×1700H×412D (WHT+Wood+Acrylic) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth C Zhengzhou: 5× Display Stands (1500×500 + 500×500 + 2× 500×800 + 500×1000) Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth D Guangzhou: Curved Display Stand 2000W×1300H×1000D Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl'] },
  { name: 'Podcast', owner: 'Iris', status: 'Approved', img: 'podcast-render-1', renders: ['podcast-0825-2'], drawings: ['podcast-dwg-1', 'podcast-dwg-2', 'podcast-dwg-3', 'podcast-dwg-4', 'podcast-dwg-5', 'podcast-dwg-6', 'podcast-dwg-7', 'podcast-dwg-8', 'podcast-dwg-9', 'podcast-dwg-10', 'podcast-dwg-11', 'podcast-dwg-12', 'podcast-dwg-13'], scope: '5.4×3.4m. Octanorm structure + clear acrylic panels + carpet. Client provides angle tables, chairs, On Air lightbox.', flag: 'OP1 spec A.13 · Client display items',
    req: ['1× Carpet — 5180×3368mm (≈192 sqft)', '4× Vinyl Graphic — 1208×898mm, 4/0 (PD-FRONT-GLASS)', '3× Vinyl Graphic — 1029×898mm, 4/0 (PD-LEFT-GLASS)'] },
  { name: 'Creator Market (Muse)', owner: 'Iris', status: 'Approved', img: 'muse-scope-0822-1', renders: ['muse-scope-0822-1', 'muse-scope-0822-2', 'muse-scope-0822-3', 'muse-scope-0822-4', 'muse-scope-0822-5', 'muse-scope-0822-6', 'muse-scope-7'], drawings: ['muse-dwg-1', 'muse-dwg-2', 'muse-dwg-3', 'muse-dwg-4', 'muse-dwg-5', 'muse-dwg-6', 'muse-dwg-7', 'muse-dwg-8'], scope: 'Muse client design (revised 8/14) · Island + Sponsor. 1× Circular flooring 320sqm. 4× Custom wood frame. 3× PVC graphic. 6× Custom column. 1× Vinyl sticker.', flag: 'Structure confirmed 8/17 · 22 booths (12× 8sqm + 6× 16sqm + 4× 32sqm)',
    req: ['1× Circular flooring — black/grey/white w/ text (320sqm)', '3× PVC graphic on both sides', '3x) Track', '7x) Track Light', '1× Vinyl sticker (Sponsor)'] },
  { name: 'UED Booth', owner: 'Ari', status: 'Approved', img: 'ued-0825-1', renders: ['ued-0825-1', 'ued-0825-2', 'ued-0825-3', 'ued-0825-4', 'ued-0825-5', 'ued-0825-6', 'ued-0825-7'], drawings: ['ued-dwg-1', 'ued-dwg-2', 'ued-dwg-3', 'ued-dwg-4', 'ued-dwg-5'], scope: '7×2.2m (15.4m²). Std Panel + Std Counter + 55" TV + LED + RX-101 channels. Flooring ≈169 sqft.', flag: 'Furniture and devices from Youngs',
    req: ['2× Graphic Bracket — 100W×250H×50D, Formica White', '4× Std Counter — 990W×1000H×495D, Formica White, Lockable Door+Shelf', '3× Std Counter — 495W×1000H×495D, Formica White, Lockable Door+Shelf', '1× 55" TV + Media Player, HDMI Cable, Floor Stand', '1× Grey carpet — 7000×2200mm, ≈169 sqft', '3× LED Arm Light'] },
  { name: 'Agentic Robotics Arena', owner: 'Iris', status: 'Approved', img: 'agentic-robotics-render-1', renders: ['agentic-robotics-render-1', 'agentic-robotics-render-2'], drawings: ['agentic-dwg-1'], scope: 'AMG only provide carpet and floor vinyl. All else by Youngs. Size TBD.', flag: '⚠ Size TBD — carpet + vinyl only', req: [], tiers: ZONE_I_TIER, units: makeTieredUnits('i', ZONE_I_TIER, i => BOOTH_LABELS.i[i-1]) },
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
  { label: 'Quote / Cost Control', pct: 40, color: 'var(--green)' },
  { label: 'Production', pct: 0, color: 'var(--accent)' },
],

HARD_DEADLINES: [
  { title: 'Union Labor Docs → LACC', sub: '90-day rule · breached, escalate with LACC', date: '2026-06-08' },
  { title: 'Youngs: 80% design confirm', sub: 'So AMG can schedule. Urgent — stage/backdrop (AMA, Breakout, Match), custom (Creator Market, Next-Gen) + std counter qty', date: '2026-08-07' },
  { title: 'Scaled Floor Diagrams → LACC', sub: '30-day rule · Fire Marshal approval', date: '2026-08-08' },
  { title: 'Youngs: Merchant booth confirm', sub: 'Supplier / exhibitor booth designs locked', date: '2026-08-17' },
  { title: 'Youngs: Graphics + hanging signs', sub: 'All artwork + hanging signs final', date: '2026-08-17' },
  { title: 'Muse carpet drawing + color code → Nickie', sub: '8/19 carpet + vinyl floor (Muse) issued — drawing + color code due to Nickie by 8/18', date: '2026-08-18' },
  { title: 'Fire Permit Requests', sub: '21-day rule · LAFD', date: '2026-08-19' },
  { title: 'Electrical Requirement + Floor Plan', sub: 'LACC requirement', date: '2026-08-19' },
  { title: 'Youngs: Add-on pop-ups', sub: 'Any additional pop-up units final', date: '2026-08-26' },
],

GRAPHICS: [
  { zone: 'Registration', items: [
    { item: 'REG-WALL-FRT', size: '9896×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/reg-wall-frt.jpg' },
  ]},
  { zone: 'Wayfinding System & Promotion Materials', items: [
    { item: 'COLUMN-COVER', size: '—', material: 'Curved PVC', qty: 1, status: 'pending', thumb: '' },
    { item: 'ASK-ME-ANYTHING', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ask-me-anything.jpg' },
    { item: 'VIP-LOUNGE', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/vip-lounge.jpg' },
    { item: 'COCREATE-MATCH', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/cocreate-match.jpg' },
    { item: 'ALIBABA-COCREATE-2026', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/alibaba-cocreate-2026.jpg' },
    { item: 'SOURCING-HUB', size: '700×1700mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/sourcing-hub.jpg' },
    { item: 'NATIONAL-PAVILION', size: '700×1700mm', material: 'Vinyl', qty: 3, status: 'pending', thumb: 'assets/graphics/national-pavilion.jpg' },
    { item: 'MAIN-FORUM', size: '700×1700mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/main-forum.jpg' },
  ]},
  { zone: 'Next Gen', items: [
    { item: 'NG-MEET-FRT', size: '2966×2996mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-meet-frt.jpg' },
    { item: 'NG-MEET-BK', size: '2966×2996mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-meet-bk.jpg' },
    { item: 'NG-MEET-CNTR-FRT', size: '1485×1000mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-meet-cntr-frt.jpg' },
    { item: 'NG-SHAPE-1', size: '365×365mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-shape-1.jpg' },
    { item: 'NG-SHAPE-2', size: '573×573mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-shape-2.jpg' },
    { item: 'NG-SHAPE-3', size: '562×562mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-shape-3.jpg' },
    { item: 'NG-FLOOR', size: '7000×7000mm', material: 'Floor Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-floor.jpg' },
    { item: 'NG-GAME-CNTR-LOGO', size: '840×100mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: 'assets/graphics/ng-game-cntr-logo.jpg' },
    { item: 'NG-GAME-ARROW', size: '80×2700mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-game-arrow.jpg' },
    { item: 'NG-GAME', size: '1440×3000mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-game.jpg' },
    { item: 'NG-GAME-BK', size: '1440×3000mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-game-bk.jpg' },
    { item: 'NG-CUSTOM-PANEL-03', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-custom-panel-03.jpg' },
    { item: 'NG-CUSTOM-PANEL-05', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-custom-panel-05.jpg' },
    { item: 'NG-CUSTOM-PANEL-06', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-custom-panel-06.jpg' },
    { item: 'NG-CUSTOM-PANEL-07', size: '—', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-custom-panel-07.jpg' },
    { item: 'NG-PLATFORM', size: '1650×1559mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-platform.jpg' },
    { item: 'NG-PLATFORM-SIDES', size: '1536×166mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: 'assets/graphics/ng-platform-sides.jpg' },
    { item: 'NG-PLATFORM-BK', size: '1649×166mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-platform-bk.jpg' },
    { item: 'NG-R-CNTR-LOGO', size: '560×90mm', material: 'Vinyl', qty: 4, status: 'pending', thumb: 'assets/graphics/ng-r-cntr-logo.jpg' },
    { item: 'NG-FRT-HEADER-FRT', size: '3000×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-frt-header-frt.jpg' },
    { item: 'NG-FRT-HEADER-BK', size: '3000×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-frt-header-bk.jpg' },
    { item: 'NG-CURVE-HEADER', size: '8928×300mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-curve-header.jpg' },
    { item: 'NG-CURVE-BOX-1', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-curve-box-1.jpg' },
    { item: 'NG-CURVE-BOX-2', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-curve-box-2.jpg' },
    { item: 'NG-CURVE-BOX-3', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-curve-box-3.jpg' },
    { item: 'NG-CURVE-BOX-4', size: '1280×1140mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-curve-box-4.jpg' },
    { item: 'NG-FRT-WALL-FRT', size: '4156×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-frt-wall-frt.jpg' },
    { item: 'NG-FRT-WALL-BK', size: '4156×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-frt-wall-bk.jpg' },
    { item: 'NG-L-HEADER-1-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-1-frt.jpg' },
    { item: 'NG-L-HEADER-1-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-1-bk.jpg' },
    { item: 'NG-L-HEADER-2-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-2-frt.jpg' },
    { item: 'NG-L-HEADER-2-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-2-bk.jpg' },
    { item: 'NG-L-HEADER-3-FRT', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-3-frt.jpg' },
    { item: 'NG-L-HEADER-4-BK', size: '2038×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-header-4-bk.jpg' },
    { item: 'NG-L-WALL-1-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-wall-1-frt.jpg' },
    { item: 'NG-L-WALL-1-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-wall-1-bk.jpg' },
    { item: 'NG-L-WALL-2-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-wall-2-frt.jpg' },
    { item: 'NG-L-WALL-2-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-wall-2-bk.jpg' },
    { item: 'NG-L-WALL-3-FRT', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'NG-L-WALL-3-BK', size: '1976×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-l-wall-3-bk.jpg' },
    { item: 'NG-R-HEADER-1-FRT', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-header-1-frt.jpg' },
    { item: 'NG-R-HEADER-1-BK', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-header-1-bk.jpg' },
    { item: 'NG-R-HEADER-2-FRT', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-header-2-frt.jpg' },
    { item: 'NG-R-HEADER-2-BK', size: '2242×300mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-header-2-bk.jpg' },
    { item: 'NG-R-WALL-1-FRT', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-wall-1-frt.jpg' },
    { item: 'NG-R-WALL-1-BK', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-wall-1-bk.jpg' },
    { item: 'NG-R-WALL-2-FRT', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-wall-2-frt.jpg' },
    { item: 'NG-R-WALL-2-BK', size: '3461×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-r-wall-2-bk.jpg' },
    { item: 'NG-COCREATE-BANNER-FRT', size: '1000×1900mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-cocreate-banner-frt.jpg' },
    { item: 'NG-COCREATE-BANNER-BK', size: '1000×1900mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-cocreate-banner-bk.jpg' },
    { item: 'NG-ACCIO-BANNER-FRT', size: '1000×1900mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-accio-banner-frt.jpg' },
    { item: 'NG-ACCIO-BANNER-BK', size: '1000×1900mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/ng-accio-banner-bk.jpg' },
  ]},
  { zone: 'Unboxing Live', items: [
    { item: 'EZTube-20ft-Straight', size: '20ft × 7.5ft', material: 'Double Sided Pop Up', qty: 1, status: 'pending', thumb: 'assets/graphics/eztube-20ft-straight.jpg' },
  ]},
  { zone: 'Supplier Block A', items: [
    { item: 'A-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-01-header.jpg' },
    { item: 'A-01-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-01-bk-wall.jpg' },
    { item: 'A-01-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-01-side-wall-in.jpg' },
    { item: 'A-01-SIDE-WALL-OUT', size: '2096×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-01-side-wall-out.jpg' },
    { item: 'A-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-02-header.jpg' },
    { item: 'A-02-BK-WALL', size: '3928×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-02-bk-wall.jpg' },
    { item: 'A-02-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-02-side-l.jpg' },
    { item: 'A-02-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-02-side-r.jpg' },
    { item: 'A-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-03-header.jpg' },
    { item: 'A-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-03-bk-wall.jpg' },
    { item: 'A-03-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-03-side-r.jpg' },
    { item: 'A-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-04-header.jpg' },
    { item: 'A-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-04-bk-wall.jpg' },
    { item: 'A-04-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-04-side-l.jpg' },
    { item: 'A-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-05-header.jpg' },
    { item: 'A-05-BK-WALL', size: '3928×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-05-bk-wall.jpg' },
    { item: 'A-05-SIDE-L', size: '1982×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-05-side-l.jpg' },
    { item: 'A-05-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-05-side-r.jpg' },
    { item: 'A-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-06-header.jpg' },
    { item: 'A-06-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-06-bk-wall.jpg' },
    { item: 'A-06-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-06-side-l.jpg' },
    { item: 'A-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-07-header.jpg' },
    { item: 'A-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/a-07-bk-wall.jpg' },
    { item: 'A-07-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-07-side-r.jpg' },
    { item: 'A-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-08-header.jpg' },
    { item: 'A-08-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-08-bk-wall.jpg' },
    { item: 'A-08-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'A-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/a-09-header.jpg' },
    { item: 'A-09-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-09-bk-wall.jpg' },
    { item: 'A-09-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/a-09-side-r.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 8, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Supplier Block B', items: [
    { item: 'B-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-01-header.jpg' },
    { item: 'B-01-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-01-bk-wall.jpg' },
    { item: 'B-01-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-01-side-l.jpg' },
    { item: 'B-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-02-header.jpg' },
    { item: 'B-02-BK-WALL', size: '3928×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-02-bk-wall.jpg' },
    { item: 'B-02-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-02-side-l.jpg' },
    { item: 'B-02-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-02-side-r.jpg' },
    { item: 'B-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-03-header.jpg' },
    { item: 'B-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/b-03-bk-wall.jpg' },
    { item: 'B-03-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-03-side-r.jpg' },
    { item: 'B-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-04-header.jpg' },
    { item: 'B-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/b-04-bk-wall.jpg' },
    { item: 'B-04-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-04-side-l.jpg' },
    { item: 'B-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-05-header.jpg' },
    { item: 'B-05-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/b-05-bk-wall.jpg' },
    { item: 'B-05-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-05-side-r.jpg' },
    { item: 'B-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-06-header.jpg' },
    { item: 'B-06-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/b-06-bk-wall.jpg' },
    { item: 'B-06-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-06-side-l.jpg' },
    { item: 'B-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/b-07-header.jpg' },
    { item: 'B-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-07-bk-wall.jpg' },
    { item: 'B-07-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/b-07-side-r.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 7, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
    { item: 'B-BK-WALL', size: '12076×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
  ]},
  { zone: 'Supplier Block C', items: [
    { item: 'C-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-01-header.jpg' },
    { item: 'C-01-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-01-bk-wall.jpg' },
    { item: 'C-01-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-01-side-l.jpg' },
    { item: 'C-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-02-header.jpg' },
    { item: 'C-02-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-02-bk-wall.jpg' },
    { item: 'C-02-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-02-side-r.jpg' },
    { item: 'C-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-03-header.jpg' },
    { item: 'C-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-03-bk-wall.jpg' },
    { item: 'C-03-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-03-side-l.jpg' },
    { item: 'C-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-04-header.jpg' },
    { item: 'C-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-04-bk-wall.jpg' },
    { item: 'C-04-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-04-side-r.jpg' },
    { item: 'C-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-05-header.jpg' },
    { item: 'C-05-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-05-bk-wall.jpg' },
    { item: 'C-05-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-05-side-l.jpg' },
    { item: 'C-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-06-header.jpg' },
    { item: 'C-06-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-06-bk-wall.jpg' },
    { item: 'C-06-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-06-side-r.jpg' },
    { item: 'C-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-07-header.jpg' },
    { item: 'C-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-07-bk-wall.jpg' },
    { item: 'C-07-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-07-side-l.jpg' },
    { item: 'C-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-08-header.jpg' },
    { item: 'C-08-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-08-bk-wall.jpg' },
    { item: 'C-08-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-08-side-r.jpg' },
    { item: 'C-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-09-header.jpg' },
    { item: 'C-09-BK-WALL', size: '4076×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-09-bk-wall.jpg' },
    { item: 'C-10-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-10-header.jpg' },
    { item: 'C-10-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-10-bk-wall.jpg' },
    { item: 'C-10-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-10-side-wall-in.jpg' },
    { item: 'C-11-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-11-header.jpg' },
    { item: 'C-11-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-11-wall-backside.jpg' },
    { item: 'C-11-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-11-side-l.jpg' },
    { item: 'C-12-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/c-12-header.jpg' },
    { item: 'C-12-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-12-bk-wall.jpg' },
    { item: 'C-12-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-12-side-r.jpg' },
    { item: 'C-13-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/c-13-header.jpg' },
    { item: 'C-13-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-13-bk-wall.jpg' },
    { item: 'C-13-SIDE-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/c-13-side-in.jpg' },
    { item: 'C-13-SIDE-OUT', size: '2491×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-13-side-out.jpg' },
    { item: 'C-14-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/c-14-header.jpg' },
    { item: 'C-14-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-14-bk-wall.jpg' },
    { item: 'C-14-SIDE', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/c-14-side.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 14, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Supplier Block D', items: [
    { item: 'D-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-01-header.jpg' },
    { item: 'D-01-FRT', size: '3956×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-01-frt.jpg' },
    { item: 'D-01-BK', size: '3956×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-01-bk.jpg' },
    { item: 'D-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-02-header.jpg' },
    { item: 'D-02-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-02-bk-wall.jpg' },
    { item: 'D-02-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-02-side-l.jpg' },
    { item: 'D-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-03-header.jpg' },
    { item: 'D-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-03-bk-wall.jpg' },
    { item: 'D-03-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-03-side-r.jpg' },
    { item: 'D-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-04-header.jpg' },
    { item: 'D-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-04-bk-wall.jpg' },
    { item: 'D-04-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-04-side-l.jpg' },
    { item: 'D-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-05-header.jpg' },
    { item: 'D-05-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-05-bk-wall.jpg' },
    { item: 'D-05-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-05-side-r.jpg' },
    { item: 'D-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-06-header.jpg' },
    { item: 'D-06-BK-WALL', size: '3962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-06-bk-wall.jpg' },
    { item: 'D-06-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-06-side-wall-in.jpg' },
    { item: 'D-06-SIDE-WALL-OUT', size: '2096×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-06-side-wall-out.jpg' },
    { item: 'D-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-07-header.jpg' },
    { item: 'D-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-07-bk-wall.jpg' },
    { item: 'D-07-SIDE-L', size: '1982×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-07-side-l.jpg' },
    { item: 'D-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/d-08-header.jpg' },
    { item: 'D-08-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/d-08-bk-wall.jpg' },
    { item: 'D-08-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/d-08-side.jpg' },
    { item: 'D-08-SIDE-WALL-OUT', size: '2096×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/d-08-side-wall-out.jpg' },
    { item: 'D-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-09-header.jpg' },
    { item: 'D-09-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-09-bk-wall.jpg' },
    { item: 'D-09-SIDE-WALL-IN', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-09-side-wall-in.jpg' },
    { item: 'D-10-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/d-10-header.jpg' },
    { item: 'D-10-BK-WALL', size: '3962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-10-bk-wall.jpg' },
    { item: 'D-10-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-10-side-r.jpg' },
    { item: 'D-10-SIDE-WALL-OUT', size: '2096×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/d-10-side-wall-out.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 10, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Supplier Block E', items: [
    { item: 'E-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-01-header.jpg' },
    { item: 'E-01-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-01-bk-wall.jpg' },
    { item: 'E-01-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-01-side-l.jpg' },
    { item: 'E-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-02-header.jpg' },
    { item: 'E-02-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-02-bk-wall.jpg' },
    { item: 'E-02-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-02-side-r.jpg' },
    { item: 'E-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-03-header.jpg' },
    { item: 'E-03-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-03-bk-wall.jpg' },
    { item: 'E-03-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-03-side-l.jpg' },
    { item: 'E-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-04-header.jpg' },
    { item: 'E-04-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-04-bk-wall.jpg' },
    { item: 'E-04-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-04-side-r.jpg' },
    { item: 'E-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-05-header.jpg' },
    { item: 'E-05-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-05-bk-wall.jpg' },
    { item: 'E-05-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-05-side-l.jpg' },
    { item: 'E-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-06-header.jpg' },
    { item: 'E-06-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: '' },
    { item: 'E-06-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-06-side-r.jpg' },
    { item: 'E-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-07-header.jpg' },
    { item: 'E-07-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-07-bk-wall.jpg' },
    { item: 'E-07-SIDE-L', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-07-side-l.jpg' },
    { item: 'E-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/e-08-header.jpg' },
    { item: 'E-08-BK-WALL', size: '3942×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-08-bk-wall.jpg' },
    { item: 'E-08-SIDE-R', size: '1962×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/e-08-side-r.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 8, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Supplier Non-A200 — Block F', items: [
    { item: 'F-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-01-header.jpg' },
    { item: 'F-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-02-header.jpg' },
    { item: 'F-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-03-header.jpg' },
    { item: 'F-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-04-header.jpg' },
    { item: 'F-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-05-header.jpg' },
    { item: 'F-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-06-header.jpg' },
    { item: 'F-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-07-header.jpg' },
    { item: 'F-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-08-header.jpg' },
    { item: 'F-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-09-header.jpg' },
    { item: 'F-10-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-10-header.jpg' },
    { item: 'F-11-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-11-header.jpg' },
    { item: 'F-12-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-12-header.jpg' },
    { item: 'F-13-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-13-header.jpg' },
    { item: 'F-14-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-14-header.jpg' },
    { item: 'F-15-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-15-header.jpg' },
    { item: 'F-16-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-16-header.jpg' },
    { item: 'F-17-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-17-header.jpg' },
    { item: 'F-18-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-18-header.jpg' },
    { item: 'F-19-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-19-header.jpg' },
    { item: 'F-20-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-20-header.jpg' },
    { item: 'F-21-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/f-21-header.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 21, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Supplier Non-A200 — Block G', items: [
    { item: 'G-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-01-header.jpg' },
    { item: 'G-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-02-header.jpg' },
    { item: 'G-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-03-header.jpg' },
    { item: 'G-04-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-04-header.jpg' },
    { item: 'G-05-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-05-header.jpg' },
    { item: 'G-06-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-06-header.jpg' },
    { item: 'G-07-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-07-header.jpg' },
    { item: 'G-08-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-08-header.jpg' },
    { item: 'G-09-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-09-header.jpg' },
    { item: 'G-10-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-10-header.jpg' },
    { item: 'G-11-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'approved', thumb: 'assets/graphics/g-11-header.jpg' },
    { item: 'Counter Logo', size: '800×250mm', material: 'Vinyl', qty: 11, status: 'approved', thumb: 'assets/graphics/counter-logo.jpg' },
  ]},
  { zone: 'Chongqing Pavilion', items: [
    { item: 'CQ-01-WALL-FRT', size: '2966×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-01-wall-frt.jpg' },
    { item: 'CQ-01-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-01-header.jpg' },
    { item: 'CQ-02-WALL-FRT', size: '2966×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-02-wall-frt.jpg' },
    { item: 'CQ-02-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-02-header.jpg' },
    { item: 'CQ-03-WALL-FRT', size: '2966×2409mm', material: 'BO Fabric', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-03-wall-frt.jpg' },
    { item: 'CQ-03-HEADER', size: '1600×250mm', material: 'PVC', qty: 1, status: 'pending', thumb: 'assets/graphics/cq-03-header.jpg' },
    { item: 'CQ-CNTR-LOGO', size: '800×250mm', material: 'Vinyl', qty: 3, status: 'pending', thumb: 'assets/graphics/cq-cntr-logo.jpg' },
  ]},
  { zone: 'Sponsor Booths', items: [
    { item: 'COMM-LOGO-1', size: '400×100mm', material: 'Vinyl', qty: 14, status: 'pending', thumb: 'assets/graphics/comm-logo-1.jpg' },
    { item: 'COMM-P-01-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-01-logo.jpg' },
    { item: 'COMM-P-02-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-02-logo.jpg' },
    { item: 'COMM-P-03-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-03-logo.jpg' },
    { item: 'COMM-P-04-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'COMM-P-05-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-05-logo.jpg' },
    { item: 'COMM-P-06-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'COMM-P-07-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-07-logo.jpg' },
    { item: 'COMM-P-09-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'COMM-P-10-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-10-logo.jpg' },
    { item: 'COMM-P-11-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'COMM-P-12-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-12-logo.jpg' },
    { item: 'COMM-P-13-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-13-logo.jpg' },
    { item: 'COMM-P-15-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: '' },
    { item: 'COMM-P-16-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-16-logo.jpg' },
    { item: 'COMM-P-17-LOGO', size: '800×150mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/comm-p-17-logo.jpg' },
    { item: 'PREM-BK-WALL', size: '4932×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/prem-bk-wall.jpg' },
    { item: 'PREM-SIDE-WALL-IN', size: '3962×2409mm', material: 'BO Fabric', qty: 1, status: 'approved', thumb: 'assets/graphics/prem-side-wall-in.jpg' },
    { item: 'PREM-LOGO-1', size: '400×100mm', material: 'Vinyl', qty: 1, status: 'approved', thumb: 'assets/graphics/prem-logo-1.jpg' },
    { item: 'PREM-LOGO-2', size: '1000×150mm', material: 'Vinyl', qty: 1, status: 'approved', thumb: 'assets/graphics/prem-logo-2.jpg' },
  ]},
  { zone: 'Sourcing Hub', items: [
    { item: 'SH-HEADER-1', size: '2150×250mm', material: 'PVC', qty: 2, status: 'pending', thumb: 'assets/graphics/sh-header-1.jpg' },
    { item: 'SH-HEADER-2', size: '2150×250mm', material: 'PVC', qty: 2, status: 'pending', thumb: 'assets/graphics/sh-header-2.jpg' },
    { item: 'SH-HEADER-3', size: '2150×250mm', material: 'PVC', qty: 2, status: 'pending', thumb: 'assets/graphics/sh-header-3.jpg' },
    { item: 'SH-HEADER-4', size: '2150×250mm', material: 'PVC', qty: 2, status: 'pending', thumb: 'assets/graphics/sh-header-4.jpg' },
  ]},
  { zone: 'Podcast', items: [
    { item: 'PODCAST-VINYL', size: '1208×898mm', material: 'Vinyl', qty: 7, status: 'pending', thumb: 'assets/graphics/podcast-vinyl.jpg' },
  ]},
  { zone: 'Creator Market (Muse)', items: [
    { item: 'MB-MID-SIDE-OUT-1', size: '600×2400mm', material: 'Vinyl', qty: 2, status: 'approved', thumb: 'assets/graphics/mb-mid-side-out.jpg' },
    { item: 'MB-MID-SIDE-OUT-2', size: '600×2400mm', material: 'Vinyl', qty: 2, status: 'approved', thumb: 'assets/graphics/mb-mid-side-out-2.jpg' },
    { item: 'MB-MID-SIDE-OUT-3', size: '600×2400mm', material: 'Vinyl', qty: 2, status: 'approved', thumb: 'assets/graphics/mb-mid-side-out-3.jpg' },
    { item: 'MB-FLOOR-OUT', size: '14326×14326mm', material: 'Vinyl', qty: 1, status: 'approved', thumb: 'assets/graphics/mb-floor-out.jpg' },
    { item: 'MB-FLOOR-IN', size: '3656×3656mm', material: 'Vinyl', qty: 1, status: 'approved', thumb: 'assets/graphics/mb-floor-in.jpg' },
  ]},
  { zone: 'UED Booth', items: [
    { item: 'UED-HEADER', size: '1386×390mm', material: 'Ultrafoam', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-header.jpg' },
    { item: 'UED-WALL-IN-FRT', size: '2870×2409mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-wall-in-frt.jpg' },
    { item: 'UED-WALL-IN-SIDE', size: '1976×2409mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-wall-in-side.jpg' },
    { item: 'UED-CNTR-IN-1', size: '1485×1000mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-cntr-in-1.jpg' },
    { item: 'UED-CNTR-IN-2', size: '3465×1000mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-cntr-in-2.jpg' },
    { item: 'UED-CNTR-OUT-2', size: '900×150mm', material: 'Vinyl', qty: 2, status: 'pending', thumb: 'assets/graphics/ued-cntr-out-2.jpg' },
    { item: 'UED-CNTR-OUT-1', size: '2000×200mm', material: 'Vinyl', qty: 1, status: 'pending', thumb: 'assets/graphics/ued-cntr-out-1.jpg' },
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
const CONTENT_VERSION = 187;

// ---------- Firebase (graphics multi-user sync) ----------
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
function graphicIsApproved(v){ const i = GRAPHIC_STATUS.findIndex(s => s.value === v); const a = GRAPHIC_STATUS.findIndex(s => s.value === 'approved'); return i >= a; }

let FB_DB = null;
function initFirebase(){
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FB_CONFIG);
      FB_DB = firebase.firestore();
    }
  } catch(e) { console.warn('Firebase init failed:', e); }
}

// ---------- Zone checklist Firestore multi-user sync ----------
let CHECKLIST_CACHE = {};
let CHECKLIST_SYNC_TIMER = null;
function checklistSyncToFirestore(state){
  if(!FB_DB) return;
  try{
    const batch = FB_DB.batch();
    Object.keys(state).forEach(key => {
      const zs = state[key] || {};
      const ref = FB_DB.collection('checklists').doc(encodeURIComponent(key));
      batch.set(ref, {
        key: key,
        checked: zs.checked || [],
        removed: zs.removed || [],
        custom: (zs.custom || []).map(c => ({ text: c.text, checked: !!c.checked })),
        edits: zs.edits || {},
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    batch.commit().catch(e => console.warn('checklist sync failed:', e));
  }catch(e){ console.warn('checklist sync error:', e); }
}
function loadChecklistFromFirestore(callback){
  if(!FB_DB){ callback(); return; }
  FB_DB.collection('checklists').get().then(snapshot => {
    const state = {};
    snapshot.forEach(doc => {
      const d = doc.data();
      state[d.key] = {
        checked: d.checked || [],
        removed: d.removed || [],
        custom: d.custom || [],
        edits: d.edits || {}
      };
    });
    if(Object.keys(state).length === 0){
      // Firestore empty → use existing localStorage checkboxes, and write a copy back to Firestore to establish initial sync
      try{ CHECKLIST_CACHE = JSON.parse(localStorage.getItem('cocreate2026_checklist') || '{}'); }catch(e){ CHECKLIST_CACHE = {}; }
      if(Object.keys(CHECKLIST_CACHE).length > 0) checklistSyncToFirestore(CHECKLIST_CACHE);
    } else {
      CHECKLIST_CACHE = state;
      try{ localStorage.setItem('cocreate2026_checklist', JSON.stringify(state)); }catch(e){}
    }
    callback();
  }).catch(() => {
    try{ CHECKLIST_CACHE = JSON.parse(localStorage.getItem('cocreate2026_checklist') || '{}'); }catch(e){ CHECKLIST_CACHE = {}; }
    callback();
  });
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

function zoneThumbHtml(z){
  const thumb = (z.renders && z.renders.length) ? z.renders[0] : z.img;
  return thumb
    ? `<img src="assets/zones/${thumb}.jpg${IMG_CACHE_BUST}" alt="${escapeHtml(z.name)} rendering" loading="lazy">`
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

const ZONE_STATUS_OPTIONS = ['TBD', 'In Review', 'Quoted', 'Approved', 'In Production', 'Complete', 'No quote needed'];

function graphicZoneToZoneName(gz) {
  const map = {
    'Supplier Block A': 'Supplier A200 — Block A',
    'Supplier Block B': 'Supplier A200 — Block B',
    'Supplier Block C': 'Supplier A200 — Block C',
    'Supplier Block D': 'Supplier A200 — Block D',
    'Supplier Block E': 'Supplier A200 — Block E',
    'Sponsor Booths': 'Sponsor Booths 16+1',
  };
  return map[gz] || gz;
}

function getZoneGraphicStats(zoneName) {
  const g = (graphicsList || []).find(x => graphicZoneToZoneName(x.zone) === zoneName);
  const items = (g && g.items) || [];
  const total = items.length;
  const done = items.filter(it => it.thumb).length;
  return { done, total };
}

function zoneProgressHtml(zoneName) {
  const s = getZoneGraphicStats(zoneName);
  const pct = s.total ? Math.round(s.done / s.total * 100) : 0;
  const color = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
  return `<div class="zone-progress" data-zone-progress="${escapeHtml(zoneName)}">
    <div class="zone-progress-track"><div class="zone-progress-fill" style="width:${pct}%;background:${color};"></div></div>
    <div class="zone-progress-label">🖼 ${s.done}/${s.total}</div>
  </div>`;
}

function updateZoneProgressBars() {
  document.querySelectorAll('[data-zone-progress]').forEach(el => {
    const name = el.getAttribute('data-zone-progress');
    const s = getZoneGraphicStats(name);
    const pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    const color = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
    const fill = el.querySelector('.zone-progress-fill');
    const label = el.querySelector('.zone-progress-label');
    if (fill) { fill.style.width = pct + '%'; fill.style.background = color; }
    if (label) label.textContent = `🖼 ${s.done}/${s.total}`;
  });
}

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
      ${zoneProgressHtml(z.name)}
      <div class="zone-scope"${editAttrs('ZONES', i, 'scope')}>${escapeHtml(z.scope)}</div>
      <div class="zone-flag ${z.blocking ? 'blocking' : ''}"${editAttrs('ZONES', i, 'flag')}>${escapeHtml(z.flag)}</div>
      ${EDIT_MODE ? `<button class="edit-remove-btn" onclick="event.stopPropagation();removeRow('ZONES',${i})" title="Remove zone">&times; Remove zone</button>` : ''}
    </div>
  `).join('');
  document.getElementById('zones-add-row').innerHTML = addBtn('Zone', `addRow('ZONES',{name:'New Zone',status:'TBD',scope:'TBD',flag:'',req:[]})`);
}

let graphicsList = []; // current graphics data (Firestore or seed)

function renderGraphics(){
  const el = document.getElementById('graphics-list');
  if(!el) return;
  if (!FB_DB) {
    // no Firebase → use seed
    graphicsList = DATA.GRAPHICS;
    renderGraphicsWith(graphicsList);
    return;
  }
  // Show loading first, wait for Firestore authoritative data (avoid flashing seed's pending state,
  // which would let users change status before Firestore loads, then lose it on reload)
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
      // Firestore empty → seed (re-read after seeding so graphicsList gets doc ids)
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
    // re-read after seeding so graphicsList carries doc ids (needed for later status writes)
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

function renderGraphicsMissing() {
  const el = document.getElementById('graphics-missing');
  if (!el) return;
  const missing = [];
  (graphicsList || []).forEach(g => {
    (g.items || []).forEach(it => {
      const noThumb = !it.thumb;
      if (noThumb) {
        missing.push({ zone: g.zone, item: it.item });
      }
    });
  });
  if (!missing.length) {
    el.innerHTML = '<div class="card" style="margin-bottom:12px;border-left:4px solid var(--green);"><div class="card-body" style="color:var(--green);">✓ All graphics complete</div></div>';
    return;
  }
  el.innerHTML = `
    <div class="card" style="margin-bottom:12px;border-left:4px solid var(--red);">
      <div class="card-header"><div class="card-title">⚠️ Missing graphics — ${missing.length}</div></div>
      <div class="card-body" style="padding:0;overflow-x:auto;">
        <table class="phases">
          <thead><tr><th>Zone</th><th>Item</th></tr></thead>
          <tbody>
            ${missing.map(m => `
              <tr>
                <td>${escapeHtml(m.zone)}</td>
                <td>${escapeHtml(m.item)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderGraphicsWith(list){
  const el = document.getElementById('graphics-list');
  if(!el) return;
  el.innerHTML = list.map((g, gi) => `
    <details class="card graphic-card" ${gi === 0 ? 'open' : ''} style="margin-bottom:12px;">
      <summary class="card-header graphic-summary" style="cursor:pointer;list-style:none;">
        <div class="card-title">🖼 ${escapeHtml(g.zone)}</div>
        <span class="pill">${(g.items||[]).filter(it => graphicIsApproved(it.status)).length}/${(g.items||[]).length} approved</span>
      </summary>
      <div class="card-body" style="padding:0;overflow-x:auto;">
        <table class="phases">
          <thead><tr><th>Item</th><th>Size</th><th>Material</th><th>Qty</th><th>Thumbnail</th><th>Status</th><th>Niche</th><th>Checked</th></tr></thead>
          <tbody>
            ${(g.items||[]).map((it, ii) => {
              const meta = graphicStatusMeta(it.status);
              const thumbHtml = it.thumb
                ? `<img src="${escapeHtml(it.thumb)}${IMG_CACHE_BUST}" alt="" style="width:72px;height:auto;border-radius:6px;cursor:zoom-in;" onclick="event.stopPropagation();openGraphicModal('${escapeHtml(it.item)}','${escapeHtml(it.thumb)}')">`
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
                <td><input type="checkbox" data-gi="${gi}" data-ii="${ii}" data-field="niche" ${it.niche ? 'checked' : ''} onchange="toggleGraphicFlag(this)" style="width:18px;height:18px;cursor:pointer;"></td>
                <td><input type="checkbox" data-gi="${gi}" data-ii="${ii}" data-field="checked" ${it.checked ? 'checked' : ''} onchange="toggleGraphicFlag(this)" style="width:18px;height:18px;cursor:pointer;"></td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `).join('');
  updateZoneProgressBars();
  renderGraphicsMissing();
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
    const ref = FB_DB.collection(GRAPHICS_COLLECTION).doc(graphicsList[gi].id);
    // use transaction read-modify-write to avoid overwriting other fields (like thumb) and losing multi-user sync
    FB_DB.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      const items = Array.isArray(data.items) ? data.items : [];
      if (items[ii]) { items[ii] = { ...items[ii], status: val }; }
      tx.update(ref, { items: items });
    }).catch(e => console.warn('update graphic failed:', e));
  }
}

function toggleGraphicFlag(cb){
  const gi = parseInt(cb.dataset.gi, 10);
  const ii = parseInt(cb.dataset.ii, 10);
  const field = cb.dataset.field;
  if (graphicsList[gi] && graphicsList[gi].items && graphicsList[gi].items[ii]) {
    graphicsList[gi].items[ii][field] = cb.checked;
  }
  if (FB_DB && graphicsList[gi] && graphicsList[gi].id) {
    const ref = FB_DB.collection(GRAPHICS_COLLECTION).doc(graphicsList[gi].id);
    FB_DB.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      const items = Array.isArray(data.items) ? data.items : [];
      if (items[ii]) { items[ii] = { ...items[ii], [field]: cb.checked }; }
      tx.update(ref, { items: items });
    }).catch(e => console.warn('update graphic flag failed:', e));
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

// ---------- Youngs -> AMG Delivery ----------
const DELIVERIES = [
  { no: '1', client: 'UED', item: 'Printer', qty: '2', tracking: 'TBA333785388391', arrival: '8/22', status: 'Arrived' },
  { no: '2', client: 'UED', item: 'Heat Press Machine', qty: '2', tracking: 'TBA333785388391', arrival: '8/22', status: 'Arrived' },
  { no: '3', client: 'UED', item: 'Trolley', qty: '1', tracking: 'TBA333785388391', arrival: '8/22', status: 'Arrived' },
  { no: '4', client: 'E-01(Healy)', item: 'Mannequin', qty: '1', tracking: 'FedEx 876293166017', arrival: '', status: 'Order Placed' },
  { no: '5', client: 'E-01(Healy)', item: 'Mannequin', qty: '1', tracking: 'FedEx 876293166017', arrival: '', status: 'Order Placed' },
  { no: '6', client: 'C-11(Deji)', item: 'Display Table', qty: '1', tracking: 'UPS 1ZXH04600381612632', arrival: '', status: 'Order Placed' },
  { no: '7', client: 'E-05(Ystar)*1 / A-04(Minghui)*2 / E-04(Brightshow)*4', item: 'Wire Grid', qty: '3', tracking: 'ONTRAC 1LSD40D0018K37G', arrival: '', status: 'Order Placed' },
  { no: '8', client: 'US Pavilion', item: '', qty: '2', tracking: 'TBA334064123740', arrival: '', status: 'Order Placed' },
  { no: '9', client: 'US Pavilion', item: 'Display Shelf 1', qty: '12', tracking: '', arrival: '', status: 'Pending' },
  { no: '10', client: 'US Pavilion', item: 'Display Shelf 2', qty: '7', tracking: '', arrival: '', status: 'Pending' },
  { no: '11', client: 'Sourcing Hub', item: 'Pegboard', qty: '1', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '12', client: 'Genral', item: 'Foam Board Stand 1', qty: '16', tracking: '', arrival: '', status: 'Pending' },
  { no: '13', client: 'Genral', item: 'Foam Board Stand 2', qty: '2', tracking: 'TBA334067230579 / TBA334065471844', arrival: '', status: 'Order Placed' },
  { no: '14', client: 'F-19(Sy)', item: 'White Display Stand', qty: '2', tracking: 'TBA334062386323', arrival: '', status: 'Order Placed' },
  { no: '15', client: 'Muse', item: 'Mannequin Riser 1', qty: '2', tracking: 'UPS 1Z196EB10329834700', arrival: '', status: 'Order Placed' },
  { no: '16', client: 'Muse', item: 'Mannequin Riser 2', qty: '2', tracking: 'TBA334065815427', arrival: '', status: 'Order Placed' },
  { no: '17', client: 'Muse', item: '75" TV', qty: '3', tracking: '', arrival: '', status: 'Pending' },
  { no: '18', client: 'Muse', item: 'TV Stand / TV Mount', qty: '3', tracking: 'TBA334054280119 / TBA334055711746', arrival: '', status: 'Order Placed' },
  { no: '19', client: 'Muse', item: '47" Writing Desk', qty: '9', tracking: 'UPS 1ZXH04600307384671', arrival: '', status: 'Order Placed' },
  { no: '20', client: 'Muse', item: 'Tablecloth', qty: '3', tracking: 'TBA334064428476', arrival: '', status: 'Order Placed' },
  { no: '21', client: 'Muse', item: 'Display Plinth', qty: '1', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '22', client: 'Muse', item: 'Storage Rack', qty: '1', tracking: 'USPS 9361289711067753564820', arrival: '', status: 'Order Placed' },
  { no: '23', client: 'Muse', item: 'Mannequin', qty: '12', tracking: '', arrival: '', status: 'Pending' },
  { no: '24', client: 'Muse', item: 'Christmas Tree 1', qty: '2', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '25', client: 'Muse', item: 'Christmas Tree 2', qty: '3', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '26', client: 'Muse', item: 'iPad Stand', qty: '5', tracking: '', arrival: '', status: 'Pending' },
  { no: '27', client: 'Muse', item: 'Dressing Mirror', qty: '29', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '28', client: 'Muse', item: 'Steamer', qty: '4', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '29', client: 'Muse', item: 'Partition Screen', qty: '1', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '30', client: 'Muse', item: 'Disco Ball 1', qty: '1', tracking: 'TBA334054089530', arrival: '', status: 'Order Placed' },
  { no: '31', client: 'Muse', item: 'Disco Ball 2', qty: '1', tracking: 'TBA334054089530', arrival: '', status: 'Order Placed' },
  { no: '32', client: 'Muse', item: 'Disco Ball 3', qty: '1', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '33', client: 'Muse', item: 'Leopard Print Rug', qty: '1', tracking: 'TBA334058128171', arrival: '', status: 'Order Placed' },
  { no: '34', client: 'Muse', item: 'Acrylic Paint Marker', qty: '1', tracking: 'TBA334058128171', arrival: '', status: 'Order Placed' },
  { no: '35', client: 'Muse', item: 'Heart-Shaped Balloon 1', qty: '1', tracking: 'TBA334054280119', arrival: '', status: 'Order Placed' },
  { no: '36', client: 'Muse', item: 'Heart-Shaped Balloon 2', qty: '1', tracking: '', arrival: '', status: 'Order Placed' },
  { no: '37', client: 'Muse', item: 'LED Fill Light', qty: '3', tracking: 'TBA334055408168 / TBA334055711746', arrival: '', status: 'Order Placed' },
  { no: '38', client: 'Muse', item: 'Decorative Bow', qty: '1', tracking: 'TBA334055408168', arrival: '', status: 'Order Placed' },
];

const DELIVERY_STATUSES = ['Pending', 'Order Placed', 'Shipped', 'In Transit', 'Arrived', 'Delivered'];
let deliveryList = [];

function renderDelivery(){
  const el = document.getElementById('delivery-list');
  if(!el) return;
  el.innerHTML = '<div class="card" style="margin-bottom:12px;"><div class="card-body">Loading deliveries…</div></div>';
  FB_DB.collection('deliveries').orderBy('no').get().then(snap => {
    if(snap.empty){
      const batch = FB_DB.batch();
      DELIVERIES.forEach(d => {
        batch.set(FB_DB.collection('deliveries').doc(String(d.no)), { no: Number(d.no), client: d.client, item: d.item, qty: d.qty, tracking: d.tracking, arrival: d.arrival, status: d.status, notes: (d.notes || '') });
      });
      return batch.commit().then(() => renderDelivery());
    }
    const list = [];
    snap.forEach(d => { const data = d.data(); list.push(Object.assign({ id: d.id }, data)); });
    renderDeliveryTable(list);
  }).catch(() => {
    renderDeliveryTable(DELIVERIES.map(d => Object.assign({ id: String(d.no) }, d)));
  });
}

function renderDeliveryTable(list){
  const el = document.getElementById('delivery-list');
  if(!el) return;
  deliveryList = list;
  const rows = list.map(d => {
    const opts = DELIVERY_STATUSES.map(s => `<option value="${s}"${s === d.status ? ' selected' : ''}>${s}</option>`).join('');
    return `<tr>
      <td>${d.no}</td>
      <td>${escapeHtml(d.client)}</td>
      <td>${escapeHtml(d.item || '—')}</td>
      <td>${d.qty}</td>
      <td>${escapeHtml(d.tracking || '—')}</td>
      <td>${escapeHtml(d.arrival || '—')}</td>
      <td><select class="delivery-status" data-id="${d.id}" onchange="setDeliveryStatus(this)">${opts}</select></td>
      <td><input class="delivery-note" data-id="${d.id}" value="${escapeHtml(d.notes || '')}" onchange="setDeliveryNote(this)" placeholder="—"></td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <details class="card" open style="margin-bottom:12px;">
      <summary class="card-header" style="cursor:pointer;list-style:none;">
        <div class="card-title">📦 Youngs → AMG Delivery (${list.length} items)</div>
      </summary>
      <div class="card-body" style="padding:0;overflow-x:auto;">
        <table class="phases">
          <thead><tr><th>No.</th><th>Client</th><th>Item</th><th>Qty.</th><th>Tracking ID.</th><th>Est. Arrival</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${deliveryAddForm()}
      </div>
    </details>`;
}

function setDeliveryStatus(sel){
  const id = sel.dataset.id;
  const status = sel.value;
  FB_DB.collection('deliveries').doc(id).update({ status }).catch(e => console.warn('delivery status save fail', e));
}

function setDeliveryNote(input){
  const id = input.dataset.id;
  const notes = input.value;
  FB_DB.collection('deliveries').doc(id).update({ notes }).catch(e => console.warn('delivery note save fail', e));
}

function deliveryAddForm(){
  const opts = DELIVERY_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
  const base = 'background:transparent;color:inherit;border:1px solid #444;border-radius:6px;padding:6px 8px;';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px;border-top:1px solid #333;align-items:center;">
    <input id="dlv-client" placeholder="Client" style="flex:1;min-width:130px;${base}">
    <input id="dlv-item" placeholder="Item" style="flex:1;min-width:150px;${base}">
    <input id="dlv-qty" placeholder="Qty" style="flex:0 0 55px;${base}">
    <input id="dlv-tracking" placeholder="Tracking ID" style="flex:1;min-width:140px;${base}">
    <input id="dlv-arrival" placeholder="Arrival" style="flex:0 0 85px;${base}">
    <select id="dlv-status" style="${base}flex:0 0 auto;">${opts}</select>
    <input id="dlv-notes" placeholder="Notes" style="flex:1;min-width:120px;${base}">
    <button onclick="addDelivery()" style="flex:0 0 auto;background:var(--accent,#4f8cff);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:600;">＋ Add</button>
  </div>`;
}

function addDelivery(){
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const client = get('dlv-client');
  const item = get('dlv-item');
  const qty = get('dlv-qty');
  const tracking = get('dlv-tracking');
  const arrival = get('dlv-arrival');
  const notes = get('dlv-notes');
  const statusSel = document.getElementById('dlv-status');
  const status = statusSel ? statusSel.value : 'Pending';
  if(!client && !item){ alert('Please fill Client or Item.'); return; }
  const no = Math.max(...deliveryList.map(d => Number(d.no) || 0), 0) + 1;
  const doc = { no: no, client: client, item: item, qty: qty, tracking: tracking, arrival: arrival, status: status, notes: notes };
  if(FB_DB){
    FB_DB.collection('deliveries').doc(String(no)).set(doc).then(() => renderDelivery()).catch(e => { console.warn('add delivery fail', e); alert('Add failed: ' + e.message); });
  } else {
    deliveryList.push(Object.assign({ id: String(no) }, doc));
    renderDeliveryTable(deliveryList);
  }
}

function renderAll(){
  renderStatCards();
  renderTimelinePreview();
  renderDeadlinesWidget();
  renderProgressWidget();
  renderZonesPreview();
  renderTeamWidget();
  renderGantt();
  renderPhases();
  renderZonesFull();
  renderGraphics();
  renderDelivery();

  const allUpdates = getAllUpdates();
  renderActivityPreview(allUpdates);
  renderUpdatesFull(allUpdates);
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

// ---------- Project Q&A assistant ----------
function answerProjectQuestion(q){
  const s = (q || '').toLowerCase().trim();
  if(!s) return '請輸入問題～';
  const has = (...kws) => kws.some(k => s.includes(k));

  const zones = DATA.ZONES || [];
  const dead = DATA.HARD_DEADLINES || [];
  const gantt = DATA.GANTT_ROWS || [];
  const phases = DATA.PHASES || [];
  const progress = DATA.PROGRESS || [];

  // --- Delivery ---
  if(has('delivery','送貨','到貨','貨運','shipping','arrive','tracking','快遞','物流')){
    const dl = deliveryList || [];
    if(!dl.length) return 'Delivery 資料還沒載入，稍等再試～';
    const by = {};
    dl.forEach(d => { by[d.status] = (by[d.status]||0)+1; });
    const lines = [`📦 Delivery 現況（Youngs → AMG，共 ${dl.length} 筆）：`];
    DELIVERY_STATUSES.forEach(st => { if(by[st]) lines.push(`· ${st}：${by[st]} 筆`); });
    const notArrived = dl.filter(d => d.status !== 'Arrived' && d.status !== 'Delivered');
    if(notArrived.length){
      lines.push('', `尚未到貨 ${notArrived.length} 筆，前幾筆：`);
      notArrived.slice(0,6).forEach(d => lines.push(`· ${d.client} — ${d.item||'—'}（${d.status}）`));
    }
    return lines.join('\n');
  }

  // --- Graphics / 美工 ---
  if(has('美工','graphics','graphic','圖面','banner','design')){
    const gl = graphicsList || [];
    if(!gl.length) return '美工資料還沒載入，稍等再試～';
    const lines = ['🖼 美工現況（approved / 總數）：'];
    gl.forEach(g => {
      const items = g.items || [];
      const ok = items.filter(it => graphicIsApproved(it.status)).length;
      lines.push(`· ${g.zone}：${ok}/${items.length}`);
    });
    const notDone = gl.filter(g => (g.items||[]).some(it => !graphicIsApproved(it.status)));
    if(notDone.length) lines.push('', '還沒全數 approved：' + notDone.map(g => g.zone).join('、'));
    return lines.join('\n');
  }

  // --- Specific zone (name match) ---
  for(const z of zones){
    const name = z.name || '';
    const nl = name.toLowerCase();
    const words = nl.split(/[^a-z0-9]+/).filter(w => w.length > 3);
    if(s.includes(nl) || words.some(w => s.includes(w))){
      const lines = [`🏷 ${name}`, `狀態：${z.status}`, `負責：${z.owner || '—'}`];
      if(z.flag) lines.push(`備註：${z.flag}`);
      return lines.join('\n');
    }
  }

  // --- Approved zones ---
  if(has('approved','通過','approve','已確認','哪些 zone','哪些區')){
    const approved = zones.filter(z => z.status === 'Approved');
    const others = zones.filter(z => z.status !== 'Approved');
    let r = `✅ 已通過的 zone（${approved.length} 個）：\n` + (approved.length ? approved.map(z=>`· ${z.name}`).join('\n') : '（無）');
    if(others.length) r += '\n\n其他狀態：\n' + others.map(z=>`· ${z.name}（${z.status}）`).join('\n');
    return r;
  }

  // --- Deadlines / schedule / next ---
  if(has('deadline','截止','時程','schedule','due','when','日期','接下來','next','下一步')){
    const lines = ['📅 時程 / 接下來的 deadline：'];
    dead.forEach(d => lines.push(`· ${d.date} — ${d.title}`));
    gantt.slice(0,8).forEach(g => lines.push(`· ${g.label}：${g.start} → ${g.end}`));
    phases.forEach(p => lines.push(`· ${p.phase}：${p.dates}（${p.statusLabel || p.status}）`));
    return lines.join('\n');
  }

  // --- Overall / progress ---
  if(has('進度','progress','整體','overview','summary','狀態','總覽')){
    const sc = {};
    zones.forEach(z => { sc[z.status] = (sc[z.status]||0)+1; });
    const lines = ['📊 專案總覽：', 'Zone 狀態：' + Object.entries(sc).map(([k,v])=>`${k} ${v}`).join('、')];
    progress.forEach(p => lines.push(`· ${p.label}：${p.pct}%`));
    return lines.join('\n');
  }

  return '我可以回答專案問題，例如：\n· 「哪些 zone 通過了？」\n· 「delivery 到哪了？」\n· 「美工進度？」\n· 「下一個 deadline？」\n· 「[zone 名] 的狀態？」\n\n（我是專案資料助理，只能回答網站上有紀錄的資訊～）';
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
    emailError.classList.remove('show');
    modalWho.textContent = currentUser ? `Signed in as ${currentUser.name}` : 'Guest';
    stepEmail.style.display = 'none';
    stepPost.style.display = 'block';
    showAsk();
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
    showPost();
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

  // ---- Ask tab (project Q&A assistant) ----
  const tabPost = document.getElementById('tab-post');
  const tabAsk = document.getElementById('tab-ask');
  const postForm = document.getElementById('post-form');
  const askForm = document.getElementById('ask-form');
  const askInput = document.getElementById('ask-input');
  const askSend = document.getElementById('ask-send');
  const askHistory = document.getElementById('ask-history');

  function showPost(){
    if(!currentUser){
      stepEmail.style.display = 'block';
      stepPost.style.display = 'none';
      emailInput.focus();
      return;
    }
    tabPost.classList.add('primary');
    tabAsk.classList.remove('primary');
    postForm.style.display = '';
    askForm.style.display = 'none';
  }
  function showAsk(){
    tabAsk.classList.add('primary');
    tabPost.classList.remove('primary');
    postForm.style.display = 'none';
    askForm.style.display = '';
    setTimeout(() => askInput.focus(), 0);
  }
  tabPost.addEventListener('click', showPost);
  tabAsk.addEventListener('click', showAsk);

  function appendAsk(who, text){
    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    const color = who === '你' ? '#8ab4ff' : '#7ee2a8';
    div.innerHTML = `<div style="color:${color};font-weight:600;margin-bottom:2px;">${who}</div><div style="white-space:pre-wrap;">${escapeHtml(text)}</div>`;
    askHistory.appendChild(div);
    askHistory.scrollTop = askHistory.scrollHeight;
  }
  function sendAsk(){
    const q = askInput.value.trim();
    if(!q) return;
    appendAsk('你', q);
    askInput.value = '';
    appendAsk('Caleb', answerProjectQuestion(q));
  }
  askSend.addEventListener('click', sendAsk);
  askInput.addEventListener('keydown', e => { if(e.key === 'Enter') sendAsk(); });
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
  const exportBtn = document.getElementById('zone-modal-export-btn');

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
  function isOverview(){ return !currentUnit && !currentTier(); }
  function checklistCustomItems(zs){
    // Overview's own custom items (editable)
    const own = (zs.custom || []).map((c, i) => ({ text: c.text, checked: !!c.checked, src: 'overview', srcIndex: i }));
    if(!isOverview() || !zone.units){ return own; }
    // Roll up custom items added in booth tags (read-only, dedup + count)
    const ownTexts = new Set(own.map(x => x.text));
    const counts = new Map();
    zone.units.forEach(u => {
      const us = loadZoneState(`${zone.name} :: ${u.id}`);
      (us.custom || []).forEach(c => {
        if(ownTexts.has(c.text)) return;
        counts.set(c.text, (counts.get(c.text) || 0) + 1);
      });
    });
    const rollup = [...counts.entries()].map(([text, n]) => ({
      text: n > 1 ? `${n}× ${text}` : text,
      checked: false,
      src: 'rollup',
      srcIndex: -1
    }));
    return own.concat(rollup);
  }

  function loadAllState(){
    return CHECKLIST_CACHE;
  }
  function saveAllState(state){
    CHECKLIST_CACHE = state;
    try{ localStorage.setItem('cocreate2026_checklist', JSON.stringify(state)); }catch(e){}
    clearTimeout(CHECKLIST_SYNC_TIMER);
    CHECKLIST_SYNC_TIMER = setTimeout(() => checklistSyncToFirestore(state), 500);
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
    const customItems = checklistCustomItems(zs).map((c, i) => ({ text: c.text, i, checked: !!c.checked, type: 'custom', src: c.src }));
    const all = baseItems.concat(customItems);

    if(all.length === 0){
      checklistEl.innerHTML = '<div class="zone-modal-empty-req">No itemized requirements yet — add one below.</div>';
      return;
    }
    checklistEl.innerHTML = all.map(it => {
      if(it.src === 'rollup'){
        return `
          <div class="zone-checklist-item readonly" data-type="${it.type}" data-i="${it.i}" data-src="rollup">
            <span class="label">↳ ${escapeHtml(it.text)}</span>
          </div>`;
      }
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

  function exportChecklistPDF(){
    if(!zone) return;
    const zs = loadZoneState(checklistKey());
    const baseItems = (checklistBase() || [])
      .map((text, i) => ({ text: zs.edits[i] !== undefined ? zs.edits[i] : text, checked: !!zs.checked[i], i }))
      .filter(it => !zs.removed.includes(it.i));
    const customItems = checklistCustomItems(zs).map(c => ({ text: c.text, checked: !!c.checked }));
    const all = baseItems.concat(customItems);
    const viewLabel = currentUnit ? currentUnit.label : (currentTier() ? currentTier().name : 'Category overview');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const rows = all.length ? all.map(it =>
      `<li class="${it.checked ? 'done' : ''}"><span class="box">${it.checked ? '☑' : '☐'}</span>${escapeHtml(it.text)}</li>`
    ).join('') : '<li class="empty">No itemized requirements.</li>';
    const photos = currentPhotos();
    const cur = photos[photoIndex];
    let renderBlock = '';
    if(cur){
      const isRender = cur.type === 'render';
      const label = isRender ? 'Client render' : 'AMG shop drawing';
      renderBlock = `<div class="render"><img src="${imgEl.src}" alt="${escapeHtml(label)}"><div class="cap">${escapeHtml(label)} — ${escapeHtml(zone.name)}</div></div>`;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(zone.name)} — Checklist</title>
<style>
  @page { size: portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 28px 32px; color: #1a1a1a; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #777; font-size: 12px; margin-bottom: 18px; }
  .render { margin-bottom: 22px; }
  .render img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
  .render .cap { font-size: 11px; color: #777; margin-top: 5px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { display: flex; gap: 10px; align-items: baseline; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #ececec; }
  li .box { width: 16px; text-align: center; flex: none; }
  li.done { color: #999; text-decoration: line-through; }
  li.empty { color: #999; }
</style></head><body>
<h1>${escapeHtml(zone.name)}</h1>
<div class="sub">${escapeHtml(viewLabel)} · Checklist · ${dateStr}</div>
${renderBlock}
<ul>${rows}</ul>
</body></html>`;
    const w = window.open('', '_blank');
    if(!w){ alert('Popup blocked — please allow popups to export.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch(e){} }, 600);
  }

  checklistEl.addEventListener('click', (e) => {
    const item = e.target.closest('.zone-checklist-item');
    if(!item || !zone) return;
    if(item.dataset.src === 'rollup') return; // read-only roll-up from booth tags
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
  exportBtn.addEventListener('click', exportChecklistPDF);
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

function buildSearchIndex() {
  const index = [];
  const zoneMap = {
    A: 'Supplier Block A', B: 'Supplier Block B', C: 'Supplier Block C',
    D: 'Supplier Block D', E: 'Supplier Block E',
    F: 'Supplier Non-A200 — Block F', G: 'Supplier Non-A200 — Block G',
  };
  Object.entries(SUPPLIER_EN).forEach(([code, name]) => {
    const prefix = code.split('-')[0].toUpperCase();
    const zone = zoneMap[prefix] || '';
    index.push({ label: `${code} ${name}`, type: 'Booth', zone, searchText: `${code} ${name}`.toLowerCase() });
  });
  (graphicsList || []).forEach(g => {
    (g.items || []).forEach(it => {
      index.push({ label: it.item, type: 'Graphic', zone: g.zone, searchText: it.item.toLowerCase() });
    });
  });
  (DELIVERIES || []).forEach(d => {
    const searchText = `${d.no} ${d.client} ${d.item} ${d.tracking}`.toLowerCase();
    index.push({ label: `${d.tracking} — ${d.client} ${d.item}`, type: 'Delivery', zone: '#delivery', searchText });
  });
  return index;
}

function setupSearch() {
  const input = document.getElementById('global-search');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.classList.remove('open'); return; }
    const results = buildSearchIndex().filter(r => r.searchText.includes(q)).slice(0, 12);
    dropdown.innerHTML = results.length
      ? results.map(r => `<div class="search-item" data-zone="${escapeHtml(r.zone)}" data-type="${r.type}"><span>${escapeHtml(r.label)}</span><span class="si-type">${r.type}</span></div>`).join('')
      : '<div class="search-empty">No results for "' + escapeHtml(input.value) + '"</div>';
    dropdown.classList.add('open');
  });
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.search-item');
    if (!item) return;
    const zone = item.getAttribute('data-zone');
    const type = item.getAttribute('data-type');
    dropdown.classList.remove('open');
    input.value = '';
    if (type === 'Delivery') {
      location.hash = '#delivery';
      setTimeout(() => {
        const card = document.querySelector('#delivery-list details');
        if (card) { card.open = true; card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }, 120);
      return;
    }
    location.hash = '#graphics';
    setTimeout(() => {
      document.querySelectorAll('.graphic-card').forEach(card => {
        const t = card.querySelector('.card-title');
        if (t && t.textContent.includes(zone)) {
          card.open = true;
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }, 120);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) dropdown.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dropdown.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSiteData();
  initFirebase();
  loadChecklistFromFirestore(() => {
    renderAll();
    renderSidebarUser();
    setupNav();
    setupModal();
    setupZoneModal();
    setupZoneDrag();
    setupSearch();
  });
});
