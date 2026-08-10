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

const ZONE_ICONS = { 'Registration': '🏛', 'Core Display': '🔤', 'Keynote Hall': '🎤', 'AMA / Influencer Hub': '📷', 'Match Meeting': '🤝', 'Breakout Session ×2': '🎙', 'Buyer Story': '📖', 'Unboxing Live': '📦', 'Next-Gen Sourcing + AI': '🤖', 'Podcast': '🎧', 'Chongqing Pavilion': '🏮', 'LA City Pavilion': '🌉', 'National Pavilion ×4': '🌐', 'Sourcing Hub': '🔎', 'Sponsor Booths ×12': '🏷', 'Supplier A200 — Block A': '🅰️', 'Supplier A200 — Block B': '🅱️', 'Supplier A200 — Block C': '©️', 'Supplier A200 — Block D': '🅳', 'Supplier A200 — Block E': '🅴', 'Supplier Non-A200 — Block F': '🅵', 'Muse Booth': '🎨', 'UED Booth': '💻', 'Creator Market': '🧵' };

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
        renders: renderFn ? renderFn(seq) : undefined,
      });
    }
  });
  return units;
}

// Tier definitions, pulled from the design brief renderings — one tier = one gallery photo,
// so the zone modal can show the matching checklist as you flip through Category overview photos.
const SPONSOR_TIERS = [
  { key: 'community', name: 'Community', sqm: '6m²', count: 7, req: [
    'Pop-up display ×1 (3000×2500mm)',
    '2× Long-arm spotlight (LED, top of back wall)',
    'Counter w/ storage ×1 (1000×500×1000mm, wooden joinery, matte white Formica, lockable)',
    'Electric socket ×1',
    'Furniture + fabric display (by Youngs)',
  ] },
  { key: 'associate', name: 'Associate', sqm: '9m²', count: 2, req: [
    'Pop-up display ×1 (3500×2500mm)',
    '4× Long-arm spotlight',
    '42" TV + stand ×1 set',
    'Counter w/ storage ×1 (1000×500×1000mm)',
    'High table + bar stools ×1 set (4 chairs)',
    'Electric socket ×1',
    'Furniture + fabric display (by Youngs)',
  ] },
  { key: 'executive', name: 'Executive', sqm: '15m²', count: 2, req: [
    'L-shaped pop-up display ×2 units (5000×2500mm + 3000×2500mm)',
    '6× Long-arm spotlight',
    '42" TV + stand ×1 set',
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

const ZONE_A_TIER = [{ key:'booth', name:'Booth', sqm:'8m²', count:9, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] }];
const ZONE_B_TIER = [{ key:'booth', name:'Booth', sqm:'8m²', count:7, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] }];
const ZONE_C_TIER = [
  { key:'m8', name:'Booth', sqm:'8m²', count:11, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'m14', name:'Booth', sqm:'14m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','4× LED arm light','— YOUNGS —','Furniture'] },
  { key:'m18', name:'Booth', sqm:'8+18m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','4× LED arm light','— YOUNGS —','Furniture'] },
];
const ZONE_D_TIER = [
  { key:'m8', name:'Booth', sqm:'8m²', count:8, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
  { key:'m14', name:'Booth', sqm:'14m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','4× LED arm light','— YOUNGS —','Furniture'] },
  { key:'m82', name:'Booth', sqm:'8+2m²', count:1, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] },
];
const ZONE_E_TIER = [{ key:'booth', name:'Booth', sqm:'8m²', count:8, req: ['Wooden backdrop (4×2.5mH)','42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Furniture'] }];
const ZONE_F_TIER = [
  { key:'sm', name:'Booth', sqm:'6m²', count:11, req: ['42" TV + stand','Std Counter','Grey carpet','2× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
  { key:'md', name:'Booth', sqm:'8m²', count:8, req: ['42" TV + stand','Std Counter','Grey carpet','4× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
  { key:'lg', name:'Booth', sqm:'14m²', count:2, req: ['42" TV + stand','Std Counter','Grey carpet','4× LED arm light','— YOUNGS —','Pop Up','Displays and shelvings'] },
];

// Booth ID labels with individual sqm from floor plan
const BOOTH_LABELS = {
  a: ['A-01 (8m²)','A-02 (8m²)','A-03 (8m²)','A-04 (8m²)','A-05 (8m²)','A-06 (8m²)','A-07 (8m²)','A-08 (8m²)','A-09 (8m²)'],
  b: ['B-01 (8m²)','B-02 (8m²)','B-03 (8m²)','B-04 (8m²)','B-05 (8+8m²)','B-06 (8+4m²)','B-07 (8m²)'],
  c: ['C-01 (8m²)','C-02 (8m²)','C-03 (8m²)','C-04 (8m²)','C-05 (8m²)','C-06 (8m²)','C-07 (8m²)','C-08 (8m²)','C-09 (14m²)','C-10 (8m²)','C-11 (8m²)','C-12 (8m²)','C-13 (8+18m²)'],
  d: ['D-01 (14m²)','D-02 (8m²)','D-03 (8m²)','D-04 (8m²)','D-05 (8m²)','D-06 (8m²)','D-07 (8m²)','D-08 (8m²)','D-09 (8m²)','D-10 (8+2m²)'],
  e: ['E-01 (8m²)','E-02 (8m²)','E-03 (8m²)','E-04 (8m²)','E-05 (8m²)','E-06 (8m²)','E-07 (8m²)','E-08 (8m²)'],
  f: ['F-01 (8m²)','F-02 (8m²)','F-03 (6m²)','F-04 (6m²)','F-05 (6m²)','F-06 (6m²)','F-07 (6m²)','F-08 (6m²)','F-09 (6m²)','F-10 (6m²)','F-11 (8m²)','F-12 (8m²)','F-13 (14m²)','F-14 (8m²)','F-15 (8m²)','F-16 (4m²)','F-17 (4m²)','F-18 (4m²)','F-19 (8m²)','F-20 (8m²)','F-21 (14m²)'],
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
  { phase: 'Next-Gen Sourcing + AI zone', dates: 'TBD', duration: '—', status: 'unconfirmed', statusLabel: 'Blocking', notes: 'Design brief still not received — blocks final engineering + quote for this zone' },
  { phase: 'Freight dispatch to LACC', dates: 'Sep 4–6', duration: '3 days', status: 'notstarted', statusLabel: 'Not started', notes: 'La Puente → LACC' },
  { phase: 'Installation (I&D)', dates: 'Sep 7–8', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: 'Union labor' },
  { phase: 'Show days', dates: 'Sep 9–10', duration: '2 days', status: 'notstarted', statusLabel: 'Not started', notes: '' },
  { phase: 'Dismantle', dates: 'Sep 11', duration: '1 day', status: 'notstarted', statusLabel: 'Not started', notes: '' },
],

OPEN_ITEMS: [
  { owner: 'Youngs', urgent: true, text: 'LACC venue license status. GSC application cannot be submitted until LACC licenses the event. Current status unknown.' },
  { owner: 'Calvin', urgent: false, text: 'AMG COI coverage levels for LACC. Must confirm policy covers: $1M CGL / $2M aggregate / $2M umbrella / $1M workers comp / $1M auto. Additional insured: AEG Management LACC LLC, City of LA, ASM Global Parent Inc.' },
  { owner: 'Calvin', urgent: false, text: 'Willwork LACC authorization. Is Willwork on the LACC Authorized GSC list? If not, identify alternative union I&D partner.' },
  { owner: 'Ariana', urgent: false, text: 'Identify LACC-authorized rigger. One contractor only per event. Needed on GSC application. CoCreate 2026 has hanging banners (Chongqing square + LA City circle — both double-sided).' },
  { owner: 'Calvin / Ariana', urgent: false, text: 'Identify LACC-authorized electrical contractor. Must be one of: Edlen Electrical, GES Electrical, or Freeman Electrical.' },
  { owner: 'Calvin', urgent: false, text: 'TV quantity strategy. 70+ units of 42" TV + stand across supplier booths alone. Confirm rental vs. purchase decision before quote is issued.' },
  { owner: 'Design team', urgent: true, text: 'Next-Gen Sourcing + AI zone. Marked "To be updated" in V1 design brief. Cannot complete engineering drawings or quote until this zone is finalized.' },
  { owner: 'Youngs', urgent: true, text: 'Standard counter quantity. AMG currently has only ~30 std counters in stock. Youngs must confirm the total number needed by next week so any shortfall can be sourced in time.' },
  { owner: 'Calvin', urgent: false, text: 'Quote — remaining zones. First quote sent Aug 1 for zones with designs received. Still need to quote Keynote, Match Meeting, and Next-Gen once their designs land + any Youngs add-ons (pop-ups, extra counters).' },
  { owner: 'Calvin', urgent: false, text: 'UED Booth reuse — confirmed. Booth ships to San Francisco after CoCreate for reuse at a follow-up event — Plug and Play, Sunnyvale CA, Sep 13 2026, 2:30–6pm PT, same-day load-in/teardown. Need a separate quote for the shipping + reuse.' },
],

DONE_ITEMS: [
  { owner: 'Nickie · Done', text: 'Confirm show dates + scope with Marshal' },
  { owner: 'Marshal · Done', text: 'Design brief V1 received (Jul 10)' },
],

RISKS: {
  high: [
    { title: 'Union labor documentation deadline already breached', body: 'The 90-day rule required union labor documentation at LACC by June 8. That date has passed — venue license and GSC application were not ready in time. This needs immediate escalation with LACC to determine whether an exception or expedited path exists; it cannot be fixed by rescheduling.' },
    { title: 'Production schedule compressed from ~8 weeks to ~5', body: 'Full design scope wasn\'t confirmed until Jul 19 — about 10 weeks later than originally planned. Engineering, quote approval, and fabrication now have to happen back-to-back-to-back between now and the Sep 7 install, with no slack for revisions or delays.' },
    { title: 'GSC Application — now filing', body: 'Venue license received Aug 7. AMG now applying for GSC status at LACC. Jose is handling the application; 楊思 tracking LACC deadlines. Approval timeline still TBD, but submission unblocked.' },
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
  { name: 'Registration', owner: 'Ari', status: 'Quoted', img: 'registration-v2-2', renders: ['registration-v2-2'], drawings: ['registration-dwg-1'], scope: 'AMG provide registration backdrop, front and back graphic.column graphics', flag: 'Lobby area',
    req: ['2× Std Door Panel — White Formica (990×2413×100)', '23× Std Trainel — Raw Wood (990×2413×100)', '12× Std LED arm light', '1× BO fabric — back wall front (REG-BK-WALL-FRT, 9896×2409, 4/0)', '1× BO fabric — back wall back (REG-BK-WALL-BK, 9896×2409, 4/0)', '1× Curved PVC column cover w/ Velcro (COLUMN-COVER, 4/0)', 'RX-101 fabric channel — 164 ft', 'From client (Youngs): 6× 8ft table cloth, 7× stanchion sign support, 28× stanchions'] },
  { name: 'Keynote Hall', owner: 'Ari', status: 'Quoted', img: 'keynote-dark', renders: ['keynote-dark', 'keynote-plan'], scope: 'AMG only provide stage carpet (6.1m × 21m ≈ 1,379 sq ft).', flag: '⚠ AMG scope: stage carpet only · 6.1m × 21m', blocking: true, req: ['Stage carpet (AMG scope)', 'All other items — by Youngs / Client'] },
  { name: 'AMA / Influencer Hub', owner: 'Ari', status: 'Quoted', img: 'ama-hub-render-1', renders: ['ama-hub-render-1'], scope: 'YOUNGS X JOHNATHAN — Banner ×6, Stage, Furniture by Youngs', flag: 'YOUNGS X JOHNATHAN', req: [] },

  { name: 'Match Meeting', owner: 'Ari', status: 'Quoted', img: 'match-meeting-render-1', renders: ['match-meeting-render-1', 'match-meeting-render-2'], scope: 'YOUNGS X JOHNATHAN — Furniture by Youngs', flag: 'AMG provide TV', req: ['3× 65" TV with stand'] },
  { name: 'Breakout Session ×2', owner: 'Ari', status: 'Quoted', img: 'breakout-v2-2', renders: ['breakout-v2-2'], drawings: ['breakout-dwg-1', 'breakout-dwg-2'], scope: 'AMG shop drawings A.10 (Session 1) + A.11 (Session 2), VB V0. Std panels + trainels, 4× custom LED wall frames, custom shape panel (S1 custom paint / S2 blue paint), curved + straight edge-lit LED stages, plywood stage skin, 3500×2000 LED wall (28 panels) each. Client: 2× arm chair + coffee table each. Graphics: BS-LOGO vinyl + BS-BK-WALL PVC · AVL: Johnathan', flag: 'Stage height — check LACC 30" rule',
    req: ['Std panels + trainels — White Formica (per A.10 / A.11)', '4× Custom LED Wall Frame #01–02 — White Formica', '1× Wooden Panel #03 — 1800×300, White Formica edge', 'Custom Shape Panel — S1 #04 custom paint / S2 #08 blue paint', 'Custom curve + straight stages #05–07 — White Formica edge, edge-lit LED strip', '1× Stage Skin — 5940×3000, 3/4" plywood (6 sheets) per session', '1× LED Wall — 3500×2000mm, 28 LED panels per session', 'Client (Youngs): 2× arm chair + 1× coffee table per session', '1× White carpet — approx 6381/5981×3500 per session', 'Graphics: BS-LOGO vinyl, BS-BK-WALL + BS-BK-WALL-TOP PVC', 'AVL (Johnathan)'] },
  { name: 'Core Display', owner: 'Iris', status: 'Quoted', img: 'core-display-v2-2', renders: ['core-display-v2-2'], drawings: ['core-display-dwg-1'], scope: 'AMG shop drawing A.8 (VB, V0). Custom: 1× Wooden Letters Display 7447×913×260mm (White), 2× Curved Base 1910×306×455mm (Orange), 2× Base 1910×306×455mm (Orange). Client: 3× Character Display (Youngs). Graphics: CD-INFO/LOGO/SIGN vinyls.', flag: '⚠ Quoted — 保麗龍 option \$3,000',
    req: ['1× Wooden Letters Display #01 — 7447×913×260mm, White Paint', '2× Wooden Curved Base #02 — 1910×306×455mm, Orange Paint', '2× Wooden Base #03 — 1910×306×455mm, Orange Paint', '3× Character Display (from Youngs)', '1× CD-INFO Vinyl — 1140×181mm, 4/0', '1× CD-LOGO Vinyl — 1114×133mm, 4/0', '1× CD-SIGN Vinyl — 215×215mm, 4/0'] },
  { name: 'Next-Gen Sourcing + AI', owner: 'Ari', status: 'TBD', img: 'nextgen-2', renders: ['nextgen-2'], scope: 'Youngs proposal received 8/10. Design under review.', flag: '⚠ Blocking engineering', blocking: true, req: [] },
  { name: 'Buyer Story', owner: 'Ari', status: 'Quoted', img: 'buyer-story-v2-2', renders: ['buyer-story-v2-2','buyer-story-v2-3','buyer-story-v2-4','buyer-story-v2-5'], scope: 'Youngs provide structure. AMG build + 1× 42" TV + stand.', flag: '⚠ Youngs structure · AMG build + TV',
    req: ['Structure (by Youngs)', 'AMG build', '1× 42" TV + stand'] },
  { name: 'Unboxing Live', owner: 'Ari', status: 'Quoted', img: 'unboxing-live-v3', renders: ['unboxing-live-v3'], drawings: ['unboxing-dwg-1'], scope: 'AMG shop drawing A.12 (Unboxing Live-R3, VB V0). Double-sided pop-up 20\'×7.5\' (replaces trainel+panel+counter). 3× custom display boxes #03–05 (White Formica), 55" TV w/ stand. Client: camera, strobe package, IBM table, table cloth, 2× ring-light tripod. Carpet 5584×5584 cut & stitch.', flag: '⚠ R3 — switched to Double-Sided Pop Up 20\'×7.5\' (was trainel + angle panel + counter in R2)',
    req: ['1× Double-Sided Pop Up — 20\'×7.5\'H', '3× Custom Display Box #03 — 300×600×300, White Formica', '1× Custom Display Box #04 — 300×650×300, White Formica', '1× Custom Display Box #05 — 300×450×300, White Formica', '1× 55" TV w/ Stand', 'Client: 1× Camera w/ Tripod, 1× Strobe Package w/ Tripod, 2× Tripod w/ Ring Light Phone Holder', 'Client: 1× IBM Table + 1× Table Cloth', '1× Carpet — 5584×5584, Cut & Stitch (finish pendent)'] },
  { name: 'Supplier A200 — Block A', owner: 'Jin & Chris', status: 'In Review', img: 'zone-a-map', renders: ['zone-a-map'], drawings: [], scope: 'A-01 ~ A-09. 9× 8sqm. Wooden backdrop (4×2.5mH) + 42" TV + stand + Std Counter + Grey carpet. A200 standard build.', flag: '9× 8sqm · 9 std counters',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV + stand', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'], tiers: ZONE_A_TIER, units: makeTieredUnits('zone-a', ZONE_A_TIER, i => BOOTH_LABELS.a[i-1], n => [`zone-a-render-${n*2}`, `zone-a-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block B', owner: 'Jin & Chris', status: 'In Review', img: 'zone-b-map', renders: ['zone-b-map'], drawings: [], scope: 'B-01 ~ B-08. 7× 8sqm. Wooden backdrop (4×2.5mH) + 42" TV + stand + Std Counter + Grey carpet. A200 standard build.', flag: '7× 8sqm · 7 std counters',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV + stand', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'], tiers: ZONE_B_TIER, units: makeTieredUnits('zone-b', ZONE_B_TIER, i => BOOTH_LABELS.b[i-1], n => [`zone-b-render-${n*2}`, `zone-b-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block C', owner: 'Jin & Chris', status: 'In Review', img: 'zone-c-map', renders: ['zone-c-map'], drawings: [], scope: 'C-01 ~ C-13. 13 booths. Wooden backdrop (4×2.5mH) + 42" TV + stand + Std Counter + Grey carpet. A200 standard build.', flag: '13 booths · 13 std counters',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV + stand', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'], tiers: ZONE_C_TIER, units: makeTieredUnits('zone-c', ZONE_C_TIER, i => BOOTH_LABELS.c[i-1], n => [`zone-c-render-${n*2}`, `zone-c-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block D', owner: 'Jin & Chris', status: 'In Review', img: 'zone-d-map', renders: ['zone-d-map'], drawings: [], scope: 'D-01 ~ D-10. 8/14/8+2sqm mixed. Wooden backdrop (4×2.5mH) + 42" TV + stand + Std Counter + Grey carpet. A200 standard build.', flag: '10 booths · 10 std counters',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV + stand', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'], tiers: ZONE_D_TIER, units: makeTieredUnits('zone-d', ZONE_D_TIER, i => BOOTH_LABELS.d[i-1], n => [`zone-d-render-${n*2}`, `zone-d-render-${n*2-1}`]) },
  { name: 'Supplier A200 — Block E', owner: 'Jin & Chris', status: 'In Review', img: 'zone-e-map', renders: ['zone-e-map'], drawings: [], scope: 'E-01 ~ E-08. 8× 8sqm. Wooden backdrop (4×2.5mH) + 42" TV + stand + Std Counter + Grey carpet. A200 standard build.', flag: '8× 8sqm · 8 std counters',
    req: ['Wooden backdrop (4×2.5mH)', '42" TV + stand', 'Std Counter', 'Grey carpet', 'Furniture (by Youngs)'], tiers: ZONE_E_TIER, units: makeTieredUnits('zone-e', ZONE_E_TIER, i => BOOTH_LABELS.e[i-1], n => [`zone-e-render-${n*2}`, `zone-e-render-${n*2-1}`]) },
  { name: 'Supplier Non-A200 — Block F', owner: 'Jin & Chris', status: 'In Review', img: 'zone-f-map', renders: ['zone-f-map'], drawings: [], scope: 'F-01 ~ F-21. 11×6m² + 8×8m² + 2×14m². YOUNGS Pop Up + 42" TV + stand + Std Counter + LED (2/4).', flag: '21 booths · 21 std counters · 11/8/2',
    req: ['42" TV + stand', 'Std Counter', 'Grey carpet', '2/4× LED arm light', '— YOUNGS —', 'Pop Up', 'Displays and shelvings'], tiers: ZONE_F_TIER, units: makeTieredUnits('zone-f', ZONE_F_TIER, i => BOOTH_LABELS.f[i-1], n => [`zone-f-render-${n*2}`, `zone-f-render-${n*2-1}`]) },
  { name: 'Sponsor Booths ×12', owner: 'Jin & Chris', status: 'In Review', img: 'sponsor-booths', renders: ['sponsor-booths-2', 'sponsor-booths-3', 'sponsor-booths-4', 'sponsor-booths-5'], drawings: ['sponsor-dwg-1', 'sponsor-dwg-2', 'sponsor-dwg-3', 'sponsor-dwg-4'], scope: 'AMG shop drawings A.2–A.5 (JP, RENT). 4 tiers: Community 6m²×7 (Std Counter + 2× LED), Associate 9m²×2 (+42" TV + stand + 4× LED), Executive 15m²×2 (+6× LED), Premier 20m²×1 (L-shaped wall + Custom Counter + 42" wall-mount).', flag: '7+2+2+1 = 12 booths',
    req: ['Pop-up display units (by tier)', 'L-shaped wall structure (Premier tier)', 'Full-height wall graphics (Premier tier)', 'Long-arm spotlights (2→7 pcs by tier)', '42" monitor + stand (Associate/Executive/Premier)', 'Counter w/ storage — wooden joinery, matte white Formica', 'High table + bar stools (Associate/Executive)', 'Round meeting table + chairs (Premier)', 'Electric socket', 'Furniture + fabric display (by Youngs)'],
    tiers: SPONSOR_TIERS,
    units: makeTieredUnits('sponsor', SPONSOR_TIERS) },
  { name: 'LA City Pavilion', owner: 'Iris', status: 'In Review', img: 'lacity-pavilion-4', renders: ['lacity-pavilion-3', 'lacity-pavilion-4', 'lacity-pavilion-5', 'lacity-pavilion-6'], drawings: ['lacity-dwg-1', 'lacity-dwg-2', 'lacity-dwg-3', 'lacity-dwg-4', 'lacity-dwg-5'], scope: 'AMG shop drawings A.2–A.6 (JP, RENT). 224m² (15×16m). Display Sign 1000×2000mm (WHT Formica + Orange Paint + LED). Hanging Sign 12\' dia double-sided @17\' (⚠ rigger). 8× 8sqm + 2× 10sqm + 2× 15sqm booths. Floor Vinyl 12\' dia.', flag: '224m² / ⚠ Hanging banner = rigger required',
    req: ['1× Display Sign — 1000W×2000H×300D, Formica White (949-58), Paint Orange, LED Strip Light', '1× Hanging Sign — 12\'-0" dia × 2\'-6" H, Double-Sided @17\' (⚠ rigger)', '1× Floor Vinyl Graphic — 12\'-0" dia', '8× 8sqm Booth: Std Counter 495×1000×495 (WHT) + 2× LED Arm Light + Vinyl Graphic 800×250', '2× 10sqm Booth: Std Counter 495×1000×495 (WHT) + 2× LED Arm Light + Vinyl Graphic 800×250', '2× 15sqm Booth: 4× Std No Skin Panel 990×2413 + 2× 495×2413 + Cover PVC WHT + Std Counter + 4× LED Arm Light + Fabric Graphic 4451×2409 + Vinyl Graphic 800×250', 'Grey carpet + vinyl flooring'] },
  { name: 'Chongqing Pavilion', owner: 'Iris', status: 'In Review', img: 'chongqing-v2-2', renders: ['chongqing-v2-2', 'chongqing-pavilion-2', 'chongqing-pavilion-3'], drawings: ['chongqing-dwg-1', 'chongqing-dwg-2', 'chongqing-dwg-3'], scope: 'AMG shop drawings A.2–A.4 (JP, RENT). 196m² (14×14m). Central: LED Lighting Structure 1200mm dia×3450mm H + 36× LED strips + 4× Display Stands (BLK Formica). Perimeter: 3× Std No Skin Panels 990×2413 + 42" TV + stand wall mount + Counter. 10× 9sqm booths. Hanging Sign 12\' dia double-sided (⚠ rigger). Floor Trim 260ft.', flag: '196m² / ⚠ Hanging banner = rigger required',
    req: ['1× LED Lighting Structure — 1200mm dia×3450mm H, 36× Round LED Strips, Mounting Hardware', '2× Wooden Base/Top — 1200mm dia×100mm H, Formica Black (909-58)', '4× Display Stand — 1000W×650H×700D, Formica Black, LED Strip at Bottom', '3× Std No Skin Panel — 990W×2413H×100D, No Finish', '1× Std No Skin Panel — 495W×2413H×100D, No Finish', '2× Graphic Bracket — 100W×250H×50D, Formica White', '1× Cover PVC Black — 4\'×8\', Panel Sides', '1× Std Counter — 495W×1000H×495D, Formica Black, Lockable Door+Shelf', '1× Hanging Sign — 12\' dia × 2.5\' H, Double-Sided (⚠ rigger)', '1× 42" TV + stand + Media Player (central, Floor Stand)', '10× 42" TV wall mount + Media Player (perimeter, 10 booths)', '1× Fabric Graphic — 2966×2409mm, RX-101 Channel 36ft', '1× PVC Graphic — 1600×250mm', '1× Vinyl Graphic — 800×250mm', '260ft Floor Trim 1"W or Floor Graphic', '10× 9sqm Booths, Black+Orange Carpet'] },
  { name: 'National Pavilion ×4', owner: 'Iris', status: 'In Review', img: 'national-v2-2', renders: ['national-v2-2'], drawings: ['national-dwg-1', 'national-dwg-2', 'national-dwg-3'], scope: '美國館 updated per Youngs proposal 8/10. 120m² (12×10m). Display Sign 1000×2000mm (WHT Formica + Orange). 20 merchants × 4m² each: Type A Three-Step Stair Display or Type B Display Stand (WHT+Wood+Acrylic).', flag: '美國館 120m² · 20 merchants × 4m²',
    req: ['1× Display Sign — 1000W×2000H×300D, Formica White (949-58), Paint Orange, LED Strip Light', 'Type A: 1× Three-Step Stair Display — 800W×900H×900D, Formica White', 'Type B: 1× Display Stand — 1424W×1700H×412D, Formica White + Wood Stain + Acrylic', '2× LED Arm Light per booth', '20× 4sqm Booths (Type A + B mix)', 'Grey carpet + lights'] },
  { name: 'Sourcing Hub', owner: 'Iris', status: 'In Review', img: 'sourcing-hub-v2-2', renders: ['sourcing-hub-v2-2', 'sourcing-hub-v2-3', 'sourcing-hub-v2-4', 'sourcing-hub-v2-5', 'sourcing-hub-v2-6', 'sourcing-hub-v2-7'], drawings: ['sourcing-hub-dwg-1', 'sourcing-hub-dwg-2', 'sourcing-hub-dwg-3', 'sourcing-hub-dwg-4', 'sourcing-hub-dwg-5', 'sourcing-hub-dwg-6'], scope: 'AMG shop drawings A.2–A.7 (JP, RENT). 64m² (8×8m). Display Sign 1000×2000mm. 42" TV + stand. 4 centers: A 汕頭 (Stair Display), B 永康 (Display Stand+Acrylic), C 鄭州 (5× Display Stands), D 廣州 (Curved Display Stand 2000×1300). PVC graphics + floor vinyl per booth.', flag: '4 sourcing centers (9m² each) inside 64m² space',
    req: ['1× Display Sign — 1000W×2000H×300D, Formica White, Paint Orange, LED Strip', '1× 42" TV + stand + Media Player, Floor Stand', 'Booth A 汕頭: Three-Step Stair Display 1200W×900H×900D (WHT) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth B 永康: Display Stand 1424W×1700H×412D (WHT+Wood+Acrylic) + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth C 鄭州: 5× Display Stands (1500×500 + 500×500 + 2× 500×800 + 500×1000) Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl', 'Booth D 廣州: Curved Display Stand 2000W×1300H×1000D Formica WHT + 2× Popup Bracket + PVC Graphic 2150×250 + Floor Vinyl'] },
  { name: 'Podcast', owner: 'Iris', status: 'In Review', img: 'podcast-v2-2', renders: ['podcast-v2-2'], drawings: ['podcast-dwg-1'], scope: 'AMG shop drawing A.13 (VB, V0). Glass room — std panels (White Formica) + glass framing #01–09 + wooden beams, 12× tempered glass panels (3/8"). Client: 8× angle table, 2× on-air lightbox, 12× chair (Youngs). Graphics: PD-SHAPE-1/2/3/4 + PD-LOGO + 78× PD-SMALL-LOGO vinyls', flag: '⚠ Drawing has AMG building glass framing + glass — was "glass room by Youngs", confirm',
    req: ['Std panels — White Formica (1× double-skin + 1× + 7× 990×2413)', 'Glass framing #01–09 + wooden beams #07/#08/#10 — White Formica', '2× Wooden L-Bracket #11 — 1084×1084', '12× Tempered glass — 3/8" (#01×4, #02×6, #03×2)', 'Client (Youngs): 8× angle table, 2× on-air lightbox, 12× chair', '2× Carpet — 4780×3553 + 3553×2613 (finish pendent)', 'Graphics: PD-SHAPE-1/2/3/4, PD-LOGO-2, 78× PD-SMALL-LOGO vinyls'] },
  { name: 'Creator Market (Muse)', owner: 'Iris', status: 'In Review', img: 'muse-scope-1', renders: [...gallery('muse-scope', 15)], drawings: [...gallery('muse-dwg', 6)], scope: 'AMG shop drawings A.1–A.6 (JP, RENT). Island: 4× Std Counter (BLK 909-58), 3D Letter 2850×550×200 (WHT), Display Case 4000×2410×500 (WHT + fishing lines), 6× Display Stands. Exhibitor: 11× 32sqm booths, 150× LED Arm Light, 30× Pipe & Drape (WHT), 126M Floor Vinyl/Tape. Registration: 3× LED Arm Light. Sponsor: 5× Std Counter (WHT 949-58) + 15× LED Arm Light.', flag: '150× LED Arm Light · 126M floor vinyl',
    req: ['Wooden structure (frame backdrop, 2,413mmH)', 'Multiple display columns (Museland Creation / Brand Builder / Shop Builder)', 'Large curved vinyl floor', 'Central interactive display', 'Custom Panel + Graphic', 'Std Panel + Fabric', 'Ultraform acrylic letters (some hanging)', 'Wooden box display', 'Grey carpet', 'Clothes rack + changing room (by Youngs)', 'Acrylic box display (by Youngs)', 'Hanging cloth setup (by Youngs)'] },
  { name: 'UED Booth', owner: 'Jin & Chris', status: 'In Review', img: 'ued-v2-2', renders: ['ued-v2-2'], drawings: ['ued-booth-dwg-1'], scope: 'AMG shop drawing A.2 (JP, RENT). 5× Std Panel 990×2413 + 2× Graphic Bracket + Cover PVC. 4× Std Counter 990×1000 + 3× 495×1000 (WHT Formica 949-58). 2× Display Stand 730×1420 (WHT/BLK). 55" TV + 12× Stanchion + 4× LED Arm Light. 82ft RX-101. 2× Fabric Graphics. Machines/laptops by Youngs.', flag: '55" TV + 12 stanchions · Machines/laptops by Youngs',
    req: ['5× Std Panel — 990W×2413H×100D, No Finish', '2× Graphic Bracket — 100W×250H×50D, Formica White', '1× Cover PVC White — 4\'×8\', Panel Edges', '4× Std Counter — 990W×1000H×495D, Formica White (949-58), Lockable Door+Shelf', '3× Std Counter — 495W×1000H×495D, Formica White, Lockable Door+Shelf', '2× Display Stand — 730W×1420H×300D, Formica White/Black', '1× 55" TV + Media Player, HDMI Cable, Floor Stand', '12× Stanchion', '4× LED Arm Light', '82ft RX-101 Aluminum Channels', '2× Fabric Graphics: 2846×2409 + 1956×2409', '1× PVC Graphic — 1600×250', '3× Vinyl Graphic — 450×100', '2× Vinyl Graphic — 600×150', 'Machines/laptops (by Youngs)'] },
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
  { title: 'Fire Permit Requests', sub: '21-day rule · LAFD', date: '2026-08-19' },
  { title: 'Youngs: Add-on pop-ups', sub: 'Any additional pop-up units final', date: '2026-08-26' },
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
const CONTENT_VERSION = 14;
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

const ZONE_STATUS_OPTIONS = ['TBD', 'In Review', 'Quoted', 'Approved', 'In Production', 'Complete'];

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
      window.open(`assets/zones/${currentPhotoSlug}.jpg`, '_blank');
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
      imgEl.src = `assets/zones/${p.slug}.jpg`;
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
      return `${divider}<img src="assets/zones/${p.slug}.jpg" class="thumb-${p.type} ${i === photoIndex ? 'active' : ''}" data-i="${i}" alt="thumbnail ${i + 1}">`;
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
  renderAll();
  renderSidebarUser();
  setupNav();
  setupModal();
  setupZoneModal();
  setupZoneDrag();
});
