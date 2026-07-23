// CoCreate 2026 — Project Hub
// Static, client-side. Report/Ask uses a local access list + localStorage — no real backend.
// All project content lives in DATA and is editable in-browser via Edit Mode (persisted to localStorage).

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const SHOW_START = new Date('2026-09-09');

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

const ZONE_ICONS = { 'Registration': '🏛', 'Core Display': '🔤', 'Keynote Hall': '🎤', 'AMA / Influencer Hub': '📷', 'Match Meeting': '🤝', 'Breakout Session ×2': '🎙', 'Buyer Story': '📖', 'Unboxing Live': '📦', 'Next-Gen Sourcing + AI': '🤖', 'Podcast': '🎧', 'Chongqing Pavilion': '🏮', 'LA City Pavilion': '🌉', 'National Pavilion ×4': '🌐', 'Sourcing Hub': '🔎', 'Sponsor Booths ×19': '🏷', 'Supplier Booths (A200)': '🛒', 'Supplier Booths (Non-A200/GGS)': '🛍', 'Muse Booth': '🎨', 'UED Booth': '💻', 'Creator Market': '🧵' };

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
function makeTieredUnits(prefix, tiers){
  const units = [];
  tiers.forEach(tier => {
    for(let i = 1; i <= tier.count; i++){
      units.push({
        id: `${prefix}-${tier.key}-${i}`,
        label: tier.count > 1 ? `${tier.name} ${i} (${tier.sqm})` : `${tier.name} (${tier.sqm})`,
        status: 'TBD',
        req: [...tier.req],
      });
    }
  });
  return units;
}

// Tier definitions, pulled from the design brief renderings — one tier = one gallery photo,
// so the zone modal can show the matching checklist as you flip through Category overview photos.
const SPONSOR_TIERS = [
  { key: 'community', name: 'Community', sqm: '6m²', count: 12, req: [
    'Pop-up display ×1 (3000×2500mm)',
    '2× Long-arm spotlight (LED, top of back wall)',
    'Counter w/ storage ×1 (1000×500×1000mm, wooden joinery, matte white Formica, lockable)',
    'Electric socket ×1',
    'Furniture + fabric display (by Youngs)',
  ] },
  { key: 'associate', name: 'Associate', sqm: '9m²', count: 3, req: [
    'Pop-up display ×1 (3500×2500mm)',
    '4× Long-arm spotlight',
    '42" monitor + stand ×1 set',
    'Counter w/ storage ×1 (1000×500×1000mm)',
    'High table + bar stools ×1 set (4 chairs)',
    'Electric socket ×1',
    'Furniture + fabric display (by Youngs)',
  ] },
  { key: 'executive', name: 'Executive', sqm: '15m²', count: 3, req: [
    'L-shaped pop-up display ×2 units (5000×2500mm + 3000×2500mm)',
    '6× Long-arm spotlight',
    '42" monitor + stand ×1 set',
    'Counter w/ storage ×1 (1000×500×1000mm)',
    'High table + bar stools ×2 sets',
    'Electric socket ×1',
    'Furniture + fabric display (by Youngs)',
  ] },
  { key: 'premier', name: 'Premier', sqm: '20m²', count: 1, req: [
    'L-shaped wall structure ×1 (5000×2500mm + 4000×2500mm)',
    '2× full-height wall graphic, front only (5000×2500mm + 4000×2500mm)',
    '7× Long-arm spotlight',
    '42" monitor, wall-mount ×1 set',
    'Counter w/ storage ×1 (1800×500×1000mm)',
    'Round meeting table + chairs ×2 sets',
    'Electric socket ×1',
    'Furniture (by Youngs)',
  ] },
];

const A200_TIERS = [
  { key: 'standard', name: 'Standard', sqm: '8m²', count: 48, req: ['Wooden backdrop (4×2.5mH)', '42" TV', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'] },
  { key: 'premium', name: 'Premium', sqm: '14m²', count: 3, req: ['Wooden backdrop (4×2.5mH)', '42" TV', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'] },
];

const NONA200_TIERS = [
  { key: 'starter', name: 'Starter', sqm: '6m²', count: 11, req: ['快幕秀 quick-pop backdrop (3×2.5mH)', '42" TV', 'Fabric display + shelving (by Youngs)'] },
  { key: 'standard', name: 'Standard', sqm: '8m²', count: 8, req: ['快幕秀 quick-pop backdrop (4×2.5mH)', '42" TV', 'Fabric display + shelving (by Youngs)'] },
  { key: 'premium', name: 'Premium', sqm: '14m²', count: 3, req: ['快幕秀 quick-pop backdrop (4×2.5mH)', '42" TV', 'Fabric display + shelving (by Youngs)'] },
];

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
  { label: 'AMG quote issued → Nickie review', owner: 'Calvin', start: '2026-07-21', end: '2026-07-25', color: 'blue', note: 'Imminent' },
  { label: 'Quote approved · 75% deposit', owner: 'Youngs', start: '2026-07-28', end: '2026-08-07', color: 'amber', note: 'Needed before fabrication ramps up' },
  { label: 'Fabrication + graphics', owner: 'AMG shop', start: '2026-08-01', end: '2026-09-05', color: 'blue', note: 'Compressed to ~5 weeks (was ~8)' },
  { label: 'HARD: Scaled floor diagrams → LACC', owner: 'AMG', point: '2026-08-08', color: 'red', note: '30-day rule' },
  { label: 'Fire permit → LAFD', owner: 'AMG', point: '2026-08-19', color: 'amber', note: '21-day rule' },
  { label: 'Next-Gen Sourcing + AI zone design', owner: 'Design team', start: '2026-07-20', end: '2026-08-25', color: 'amber', note: 'Design not yet received — separate blocking track' },
  { label: 'Freight La Puente → LACC', owner: 'AMG', start: '2026-09-01', end: '2026-09-07', color: 'blue', note: '' },
  { label: 'Installation', owner: 'AMG crew', start: '2026-09-07', end: '2026-09-08', color: 'green', note: '' },
  { label: 'CoCreate 2026 — SHOW', owner: 'Milestone', start: '2026-09-09', end: '2026-09-10', color: 'orange', note: '' },
  { label: 'Dismantle', owner: 'AMG crew', start: '2026-09-11', end: '2026-09-11', color: 'green', note: '' },
  { label: 'Commission settlement', owner: 'Nickie / Wayne', start: '2026-09-15', end: '2026-10-15', color: 'grey', note: 'Post-show' },
],

PHASES: [
  { phase: 'Confirm dates + scope brief', dates: 'Jun–Jul 19, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: 'Show dates Sep 9–10 confirmed' },
  { phase: 'Design brief received (V1)', dates: 'Jul 10, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: 'Initial proposal' },
  { phase: 'Full scope confirmed (V1 complete)', dates: 'Jul 19, 2026', duration: '—', status: 'done', statusLabel: 'Done', notes: '20 zones, 100+ booths, 70+ TVs — Next-Gen zone still TBD' },
  { phase: 'Venue license (Youngs → LACC)', dates: 'TBD', duration: '—', status: 'unconfirmed', statusLabel: 'Unconfirmed', notes: 'Youngs owned — still blocking as of Jul 20' },
  { phase: 'Union labor documentation', dates: 'Was due Jun 8', duration: '—', status: 'hard', statusLabel: 'Breached', notes: '90-day rule missed — venue license/GSC application weren\'t ready in time. Needs LACC escalation.' },
  { phase: 'GSC Application submitted', dates: 'TBD', duration: '—', status: 'notstarted', statusLabel: 'Not started', notes: 'Blocked by venue license; union labor deadline already missed' },
  { phase: 'AMG engineering + production drawings (full scope)', dates: 'Jul 20 → Aug 10', duration: '~3 weeks', status: 'progress', statusLabel: 'In progress', notes: 'Compressed — full scope only confirmed Jul 19, ~10 weeks later than originally planned' },
  { phase: 'AMG quote issued + approved', dates: 'Jul 21 → Aug 7', duration: '~2.5 weeks', status: 'progress', statusLabel: 'Imminent', notes: 'Quote drafting now that full scope is in hand; fast client turnaround needed' },
  { phase: 'Fabrication + production', dates: 'Aug 1 → Sep 5', duration: '~5 weeks', status: 'notstarted', statusLabel: 'Not started', notes: 'Compressed from original ~8-week estimate' },
  { phase: 'Scaled floor diagrams → LACC', dates: 'By Aug 8', duration: '—', status: 'hard', statusLabel: 'Hard deadline', notes: '30 days prior to move-in — now overlaps fabrication start' },
  { phase: 'Fire permit → LAFD', dates: 'By Aug 19', duration: '—', status: 'watch', statusLabel: 'Watch', notes: '21 days prior' },
  { phase: 'Next-Gen Sourcing + AI zone', dates: 'TBD', duration: '—', status: 'unconfirmed', statusLabel: 'Blocking', notes: 'Design brief still not received — blocks final engineering + quote for this zone' },
  { phase: 'Freight dispatch to LACC', dates: 'Sep 1–7', duration: '~1 week', status: 'notstarted', statusLabel: 'Not started', notes: 'La Puente → LACC' },
  { phase: 'Installation (I&D)', dates: 'Sep 7–8', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: 'Union labor' },
  { phase: 'Show days', dates: 'Sep 9–10', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: '' },
  { phase: 'Dismantle', dates: 'Sep 11', duration: '1 day', status: 'notstarted', statusLabel: 'Not started', notes: '' },
  { phase: 'Commission settlement', dates: 'Post-show', duration: '~2–4 weeks', status: 'notstarted', statusLabel: 'Not started', notes: 'Nickie → Wayne → AMG invoice' },
],

OPEN_ITEMS: [
  { owner: 'Youngs', urgent: true, text: 'LACC venue license status. GSC application cannot be submitted until LACC licenses the event. Current status unknown.' },
  { owner: 'Calvin', urgent: false, text: 'AMG COI coverage levels for LACC. Must confirm policy covers: $1M CGL / $2M aggregate / $2M umbrella / $1M workers comp / $1M auto. Additional insured: AEG Management LACC LLC, City of LA, ASM Global Parent Inc.' },
  { owner: 'Calvin', urgent: false, text: 'Willwork LACC authorization. Is Willwork on the LACC Authorized GSC list? If not, identify alternative union I&D partner.' },
  { owner: 'Ariana', urgent: false, text: 'Identify LACC-authorized rigger. One contractor only per event. Needed on GSC application. CoCreate 2026 has hanging banners (Chongqing square + LA City circle — both double-sided).' },
  { owner: 'Calvin / Ariana', urgent: false, text: 'Identify LACC-authorized electrical contractor. Must be one of: Edlen Electrical, GES Electrical, or Freeman Electrical.' },
  { owner: 'Calvin', urgent: false, text: 'TV quantity strategy. 70+ units of 42" TV across supplier booths alone. Confirm rental vs. purchase decision before quote is issued.' },
  { owner: 'Design team', urgent: true, text: 'Next-Gen Sourcing + AI zone. Marked "To be updated" in V1 design brief. Cannot complete engineering drawings or quote until this zone is finalized.' },
  { owner: 'Calvin', urgent: false, text: 'Quote issuance. Full scope received Jul 19. Quote to be issued to Nickie for review before presenting to Youngs/Marshal.' },
],

DONE_ITEMS: [
  { owner: 'Nickie · Done', text: 'Confirm show dates + scope with Marshal' },
  { owner: 'Marshal · Done', text: 'Design brief V1 received (Jul 10)' },
],

RISKS: {
  high: [
    { title: 'Union labor documentation deadline already breached', body: 'The 90-day rule required union labor documentation at LACC by June 8. That date has passed — venue license and GSC application were not ready in time. This needs immediate escalation with LACC to determine whether an exception or expedited path exists; it cannot be fixed by rescheduling.' },
    { title: 'Production schedule compressed from ~8 weeks to ~5', body: 'Full design scope wasn\'t confirmed until Jul 19 — about 10 weeks later than originally planned. Engineering, quote approval, and fabrication now have to happen back-to-back-to-back between now and the Sep 7 install, with no slack for revisions or delays.' },
    { title: 'GSC Application approval timeline unknown', body: 'AMG must formally apply for GSC status at LACC. Approval subject to LACC review — timeline unknown. Must submit as soon as Youngs secures venue license, which is still unconfirmed as of Jul 20.' },
    { title: 'Hanging banners require LACC-authorized rigger', body: 'Chongqing Pavilion (square, double-sided) and LA City Pavilion (circle, double-sided) both require ceiling-hung banners. Rigging is outside AMG\'s GSC scope — must engage separate LACC-authorized rigger. Only ONE rigger contractor allowed per event. Must be named on GSC application.' },
    { title: 'Next-Gen zone not yet designed', body: 'This zone is a major exhibition area. Engineering, procurement, and fabrication cannot begin until design is received. Every week of delay compresses the already-tight production schedule further.' },
  ],
  medium: [
    { title: 'Scale — 70+ supplier/sponsor booths', body: 'This is a fundamentally different scope from CoCreate 2025 ($475k, single-zone build). CoCreate 2026 includes 100+ individual booth builds across multiple pavilions, requiring significant I&D labor and crew coordination. Crew blackout Sep 9–11 (show + dismantle) is already fixed.' },
    { title: 'HVAC cost during install/dismantle', body: 'LACC charges $325/hr per hall section during install (Sep 7–8) and dismantle (Sep 11). Must be in Youngs\' budget — not in any quote yet.' },
    { title: 'Breakout Session stage height', body: 'Two Breakout Session stages with wooden platform. If height exceeds 30 inches, LACC requires wet-stamped engineering plans + City of LA Building Safety inspection. Confirm dimensions with design team.' },
    { title: 'Covered structures (fire code)', body: 'Any enclosed/covered zone exceeding 750 sqft requires Automatic Fire Sprinkler System (AFSS). Review all zone designs with canopy/ceiling elements against this limit.' },
  ],
},

ZONES: [
  { name: 'Registration', status: 'In Review', img: 'registration', gallery: ['registration-2'], scope: 'Std Panel + Fabric (9,896×2,409mm), column vinyl wraps. Furniture by Youngs', flag: 'Lobby area — LACC approval needed for placement',
    req: ['Std Panel structure (9,896×2,409mm)', 'Fabric graphic', 'Column vinyl wraps', 'Furniture (by Youngs)'] },
  { name: 'Core Display', status: 'In Review', img: 'core-display', gallery: ['core-display-2'], scope: 'Freestanding 3D wooden letters "COCREATE" + base — character props brought by Youngs', flag: 'Large wooden structure — confirm weight/dimensions',
    req: ['Wooden structure (freestanding base)', '3D wooden letters "COCREATE"', 'Character props (by Youngs)'] },
  { name: 'Keynote Hall', status: 'TBD', scope: 'TBD — no design received', flag: '3,840m² / 1,200pax. Largest space.', blocking: true, req: [] },
  { name: 'AMA / Influencer Hub', status: 'In Review', img: 'ama-hub', gallery: ['ama-hub-3'], scope: 'Custom Panel PVC/Formica (white), circular wooden stage, white carpet, LED screen ~3×1.65m, vinyl letters. Furniture: Youngs · AVL: Johnathan', flag: 'Stage height — check LACC 30" rule',
    req: ['Wooden structure (circular stage)', 'Custom Panel PVC/Formica (white)', 'White carpet', 'LED screen (~3×1.65m)', 'Vinyl letters', 'Backdrop + stage build (AMG)', 'Furniture (by Youngs)', 'AVL (Johnathan)'] },
  { name: 'Match Meeting', status: 'TBD', scope: 'TBD', flag: 'Furniture Youngs', req: ['Furniture (by Youngs)'] },
  { name: 'Breakout Session ×2', status: 'In Review', img: 'breakout-session', gallery: ['breakout-session-2', 'breakout-session-3'], scope: 'Wooden stage + white carpet, LED, Custom Panel Formica (white) + PVC. "AI" session: Display Box; "Supply Chain" session: Display Cone. Furniture: Youngs · AVL: Johnathan', flag: 'Stage height — check LACC 30" rule',
    req: ['Wooden structure (stage, ×2)', 'White carpet', 'LED screen', 'Custom Panel Formica (white)', 'Custom Panel PVC', 'Display Box (AI session)', 'Display Cone (Supply Chain session)', 'Furniture (by Youngs)', 'AVL (Johnathan)'] },
  { name: 'Buyer Story', status: 'In Review', img: 'buyer-story', gallery: ['buyer-story-2', 'buyer-story-3', 'buyer-story-4', 'buyer-story-5'], scope: 'Slot-together panel system — honeycomb paperboard (preferred), heavy-duty corrugated, or OSB (alternative). 2 layout options, each with TV', flag: 'New material system — confirm AMG capability',
    req: ['Slot-together panel system', 'Honeycomb paperboard (preferred material)', 'Heavy-duty corrugated (alt. material)', 'OSB panels (alt. material)', 'TV (both layout options)'] },
  { name: 'Unboxing Live', status: 'In Review', img: 'unboxing-live', gallery: ['unboxing-live-2', 'unboxing-live-3'], scope: 'Vinyl Flooring (circular, branded) + 42" TV only', flag: 'Simple scope — Option 1 confirmed',
    req: ['Vinyl flooring (circular, branded)', '42" TV'] },
  { name: 'Next-Gen Sourcing + AI', status: 'TBD', scope: 'Design not received', flag: '⚠ Blocking engineering', blocking: true, req: [] },
  { name: 'Podcast', status: 'In Review', img: 'podcast', gallery: ['podcast-2', 'podcast-3'], scope: 'Vinyl on glass room walls (setup only) — glass room + furniture by Youngs', flag: 'Glass room by Youngs',
    req: ['Vinyl on glass room walls (setup only)', 'Glass room (by Youngs)', 'Furniture (by Youngs)'] },
  { name: 'Chongqing Pavilion', status: 'In Review', img: 'chongqing-pavilion-3', gallery: ['chongqing-pavilion-2', 'chongqing-pavilion-3', 'chongqing-pavilion-4', 'chongqing-pavilion-5'], scope: '196m² (14×14m). Central island: 10 merchant booths (9m² each) + 85" TV; perimeter booths: 42" TV, wooden backdrop 2.97×2.413mH. Hanging Banner Square (double-sided, rigger needed), light strip', flag: '196m² / ⚠ Hanging banner = rigger required',
    req: ['Wooden structure (central island backdrop, 3×2.5mH)', 'Wooden backdrop (perimeter booths, 2.97×2.413mH)', '85" TV (island reception)', '42" TV ×10 (merchant booths)', 'Hanging Banner Square, double-sided (rigger required)', 'Light strip', 'Wooden display stand', 'Black + Orange carpet'] },
  { name: 'LA City Pavilion', status: 'In Review', img: 'lacity-pavilion-4', gallery: ['lacity-pavilion-3', 'lacity-pavilion-4', 'lacity-pavilion-5', 'lacity-pavilion-6'], scope: '224m² (15×16m). Premium-tier booths (10×15ft / 10×10ft / 8×8ft), wood backdrop, Std Panel + Fabric + lights, grey carpet. Hanging Banner Circle (double-sided, rigger needed), wooden signage', flag: '224m² / ⚠ Hanging banner = rigger required',
    req: ['Wooden structure (backdrop, various sizes)', 'Std Panel structure', 'Fabric graphic', 'Lights', 'Std Counter', 'Grey carpet', 'Vinyl flooring', 'Hanging Banner Circle, double-sided (rigger required)', 'Wooden signage'] },
  { name: 'National Pavilion ×4', status: 'In Review', img: 'national-pavilion', gallery: ['national-pavilion-2'], scope: '100m² (10×10m) per hall × 4 halls, 10 merchants × 4m² each. Wooden signage, grey carpet, lights', flag: '4 halls × 100m² = 400m² total',
    req: ['Wooden signage', 'Grey carpet', 'Lights'] },
  { name: 'Sourcing Hub', status: 'In Review', img: 'sourcing-hub', gallery: ['sourcing-hub-3', 'sourcing-hub-4', 'sourcing-hub-5', 'sourcing-hub-6', 'sourcing-hub-7'], scope: '64m² (8×8m) overall — wooden structure w/ light strip, vinyl flooring. 4 named centers (9m² each): Guangzhou beauty, Shantou toys, Zhengzhou auto parts, Yongkang home & garden — wooden display stands, PVC header by AMG, fabric by Youngs', flag: '4 sourcing centers (9m² each) inside 64m² space',
    req: ['Wooden structure (w/ light strip)', 'Vinyl flooring (no carpet)', 'Wooden display stands ×4 (one per center)', 'PVC header (by AMG)', 'Fabric display ×4 centers (by Youngs)'] },
  { name: 'Sponsor Booths ×19', status: 'In Review', img: 'sponsor-booths', gallery: ['sponsor-booths-2', 'sponsor-booths-3', 'sponsor-booths-4', 'sponsor-booths-5'], scope: '4 tiers, escalating spec: Community 6m² (pop-up + counter), Associate 9m² (+42" monitor, high table), Executive 15m² (+2nd pop-up unit), Premier 20m² (L-shaped wall structure, full-height graphics, wall-mount monitor). Spotlights scale 2→7 pcs by tier', flag: '4 tiers: 6 / 9 / 15 / 20 sqm',
    req: ['Pop-up display units (by tier)', 'L-shaped wall structure (Premier tier)', 'Full-height wall graphics (Premier tier)', 'Long-arm spotlights (2→7 pcs by tier)', '42" monitor + stand (Associate/Executive/Premier)', 'Counter w/ storage — wooden joinery, matte white Formica', 'High table + bar stools (Associate/Executive)', 'Round meeting table + chairs (Premier)', 'Electric socket', 'Furniture + fabric display (by Youngs)'],
    tiers: SPONSOR_TIERS,
    units: makeTieredUnits('sponsor', SPONSOR_TIERS) },
  { name: 'Supplier Booths (A200)', status: 'In Review', img: 'supplier-a200', gallery: ['supplier-a200-2', 'supplier-a200-3'], scope: 'Standard 8m² + Premium 14m² — wooden backdrop 4×2.5mH, 42" TV, Std Counter, grey carpet. Furniture by Youngs, others by AMG', flag: '48× 8sqm + 3× 14sqm = 51 units ⚠ Large quantity',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'],
    tiers: A200_TIERS,
    units: makeTieredUnits('supplier-a200', A200_TIERS) },
  { name: 'Supplier Booths (Non-A200/GGS)', status: 'In Review', img: 'supplier-nona200', gallery: ['supplier-nona200-2', 'supplier-nona200-3', 'supplier-nona200-4'], scope: '3 tiers — Starter 6m² (快幕秀 backdrop 3×2.5mH, ×11), Standard 8m² (backdrop 4×2.5mH, ×8), Premium 14m² (backdrop 4×2.5mH, ×3), all with 42" TV. Fabric display + shelving by Youngs', flag: '22 units total',
    req: ['快幕秀 quick-pop backdrop (3×2.5mH / 4×2.5mH by tier)', '42" TV', 'Fabric display + shelving (by Youngs)'],
    tiers: NONA200_TIERS,
    units: makeTieredUnits('supplier-nona200', NONA200_TIERS) },
  { name: 'Muse Booth', status: 'In Review', img: 'muse-booth', gallery: ['muse-booth-2', 'muse-booth-3', 'muse-booth-4', 'muse-booth-5', 'muse-booth-6', 'muse-booth-7'], scope: 'Custom Panel + Graphic, Std Panel + Fabric, wooden frame w/ support base, Ultraform acrylic letters (some hanging), wooden box display, grey carpet. Clothes rack, changing room + acrylic box display by Youngs', flag: 'Hanging cloth setup (Youngs provides)',
    req: ['Wooden structure (frame w/ support base)', 'Custom Panel', 'Graphic', 'Std Panel structure', 'Fabric graphic', 'Ultraform acrylic letters (some hanging)', 'Wooden box display', 'Grey carpet', 'Clothes rack + changing room (by Youngs)', 'Acrylic box display (by Youngs)', 'Hanging cloth setup (by Youngs)'] },
  { name: 'UED Booth', status: 'In Review', img: 'ued-booth', gallery: ['ued-booth-2', 'ued-booth-3'], scope: 'Large U-shape custom wooden counter, Std Panel + Fabric. A4 standee, all machines/laptops/stanchions by Youngs', flag: 'Machines/laptops/stanchions by Youngs',
    req: ['Wooden structure (large U-shape custom counter)', 'Std Panel structure', 'Fabric graphic', 'A4 standee (by Youngs)', 'Machines/laptops/stanchions (by Youngs)'] },
  { name: 'Creator Market', status: 'In Review', img: 'creator-market', gallery: gallery('creator-market', 5), scope: 'Wooden frame backdrop (2,413mmH), multiple display columns (Museland Creation / Brand Builder / Shop Builder), large curved vinyl floor, central interactive display', flag: 'Circular floor layout 11,000mm diameter',
    req: ['Wooden structure (frame backdrop, 2,413mmH)', 'Multiple display columns', 'Large curved vinyl floor', 'Central interactive display'] },
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
  { label: 'Quote / 成控', pct: 10, color: 'var(--green)' },
  { label: 'Production', pct: 0, color: 'var(--accent)' },
],

HARD_DEADLINES: [
  { title: 'Union Labor Docs → LACC', sub: '90-day rule · breached, escalate with LACC', date: '2026-06-08' },
  { title: 'Scaled Floor Diagrams → LACC', sub: '30-day rule · Fire Marshal approval', date: '2026-08-08' },
  { title: 'Fire Permit Requests', sub: '21-day rule · LAFD', date: '2026-08-19' },
],

SEED_UPDATES: [
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
let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));

function loadSiteData(){
  try{
    const saved = JSON.parse(localStorage.getItem(CONTENT_KEY));
    if(saved) DATA = saved;
  } catch(e){ /* ignore malformed saved data, keep defaults */ }
}
function saveSiteData(){
  localStorage.setItem(CONTENT_KEY, JSON.stringify(DATA));
}
function resetSiteData(){
  if(!confirm('Reset all content back to the original defaults? This cannot be undone.')) return;
  localStorage.removeItem(CONTENT_KEY);
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
    { date: 'Sep 11', color: 'var(--purple)', title: 'Dismantle', sub: 'Post-show: commission settlement', last: true },
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
    ? `<img src="assets/zones/${z.img}.jpg" alt="${escapeHtml(z.name)} rendering" loading="lazy">`
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

const ZONE_STATUS_OPTIONS = ['TBD', 'In Review', 'Approved'];

function renderZonesFull(){
  document.getElementById('zone-grid').innerHTML = DATA.ZONES.map((z, i) => `
    <div class="zone-card" data-zone-index="${i}">
      <div class="zone-thumb">${zoneThumbHtml(z)}</div>
      <div class="zone-name"${editAttrs('ZONES', i, 'name')}>${escapeHtml(z.name)}</div>
      ${EDIT_MODE
        ? `<select onclick="event.stopPropagation()" onchange="event.stopPropagation();saveFieldAndRender('ZONES',${i},'status',this)">${ZONE_STATUS_OPTIONS.map(s => `<option value="${s}" ${s === z.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`
        : `<div class="zone-status" style="color:${z.status === 'TBD' ? 'var(--red)' : 'var(--yellow)'}">${escapeHtml(z.status)}</div>`}
      <div class="zone-scope"${editAttrs('ZONES', i, 'scope')}>${escapeHtml(z.scope)}</div>
      <div class="zone-flag ${z.blocking ? 'blocking' : ''}"${editAttrs('ZONES', i, 'flag')}>${escapeHtml(z.flag)}</div>
      ${EDIT_MODE ? `<button class="edit-remove-btn" onclick="event.stopPropagation();removeRow('ZONES',${i})" title="Remove zone">&times; Remove zone</button>` : ''}
    </div>
  `).join('');
  document.getElementById('zones-add-row').innerHTML = addBtn('Zone', `addRow('ZONES',{name:'New Zone',status:'TBD',scope:'TBD',flag:'',req:[]})`);
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
  const prevBtn = document.getElementById('zone-modal-prev');
  const nextBtn = document.getElementById('zone-modal-next');
  const thumbsEl = document.getElementById('zone-modal-thumbs');
  const checklistEl = document.getElementById('zone-modal-checklist');
  const flagEl = document.getElementById('zone-modal-flag');

  let zone = null;
  let photoIndex = 0;

  const newItemInput = document.getElementById('zone-modal-new-item');
  const addItemBtn = document.getElementById('zone-modal-add-btn');
  const unitsEl = document.getElementById('zone-modal-units');
  const checklistLabelEl = document.getElementById('zone-modal-checklist-label');

  let currentUnit = null; // a reference into zone.units[i], or null = viewing the shared/category checklist

  // In Category overview, each gallery photo can represent a distinct tier (Community, Associate, ...).
  // When that's the case, the checklist below the photo should match whichever tier is on screen.
  function currentTier(){
    if(currentUnit) return null;
    if(!zone.tiers || zone.tiers.length !== (zone.gallery || []).length) return null;
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
      ${zone.units.map((u, i) => `
        <span class="unit-chip ${currentUnit === u ? 'active' : ''}" data-unit="${i}">
          <span class="unit-dot" style="background:${statusColor(u.status)}"></span>${escapeHtml(u.label)}
        </span>
      `).join('')}
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
    const photos = (currentUnit && currentUnit.gallery) || zone.gallery || [];
    const contextLabel = currentUnit ? currentUnit.label : zone.name;
    let existingEmpty = viewer.querySelector('.empty');
    if(existingEmpty) existingEmpty.remove();

    if(photos.length === 0){
      imgEl.style.display = 'none';
      counterEl.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = currentUnit
        ? 'No photo for this booth yet — showing the category default above, or add one in Edit Page.'
        : 'No renderings yet — design not received for this zone.';
      viewer.appendChild(empty);
    } else {
      imgEl.style.display = '';
      imgEl.src = `assets/zones/${photos[photoIndex]}.jpg`;
      imgEl.alt = `${contextLabel} rendering ${photoIndex + 1}`;
      const multi = photos.length > 1;
      counterEl.style.display = multi ? '' : 'none';
      prevBtn.style.display = multi ? '' : 'none';
      nextBtn.style.display = multi ? '' : 'none';
      counterEl.textContent = `${photoIndex + 1} / ${photos.length}`;
    }

    thumbsEl.style.display = photos.length > 1 ? 'flex' : 'none';
    thumbsEl.innerHTML = photos.map((slug, i) => `
      <img src="assets/zones/${slug}.jpg" class="${i === photoIndex ? 'active' : ''}" data-i="${i}" alt="thumbnail ${i + 1}">
    `).join('');
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
    const photos = (currentUnit && currentUnit.gallery) || zone.gallery || [];
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

document.addEventListener('DOMContentLoaded', () => {
  loadSiteData();
  renderAll();
  renderSidebarUser();
  setupNav();
  setupModal();
  setupZoneModal();
});
