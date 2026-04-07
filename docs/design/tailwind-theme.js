/**
 * Sutan · 水墨北凉 Design System
 * Tailwind CSS Theme Extension
 *
 * Usage:
 *   import sutanTheme from './docs/design/tailwind-theme.js'
 *
 *   // In tailwind.config.js (Tailwind v3):
 *   module.exports = { theme: { extend: sutanTheme } }
 *
 *   // In @theme block (Tailwind v4 / index.css):
 *   // Convert the color values to CSS custom properties as shown at the bottom.
 *
 * Note: This project uses Tailwind v4 (@theme directive in CSS).
 * The CSS variable approach is preferred. See tailwind-v4-additions.css below.
 */

// ─────────────────────────────────────────────────────────────────────────────
// RAW PALETTE — Base color scale (not for direct use in components)
// ─────────────────────────────────────────────────────────────────────────────

const rawPalette = {
  // Ink / 墨 — deep background, shadow
  ink: {
    950: '#0a0a12',
    900: '#1a1a2e',  // existing --color-ink
    800: '#252540',  // existing --color-ink-light
    700: '#363655',
  },

  // Leather / 皮革 — warm dark backgrounds
  leather: {
    950: '#0e0806',
    900: '#1a0f0a',  // existing --color-leather
    800: '#2a1810',  // existing --color-leather-light
    700: '#3d2418',
    600: '#5a3520',
  },

  // Parchment / 宣纸 — light surface, text
  parchment: {
    50:  '#f5f0e8',
    100: '#ede5d4',
    200: '#e8dcc8',  // existing --color-parchment-light
    300: '#d4c5a9',  // existing --color-parchment
    400: '#c4b594',
    500: '#b0a07e',
  },

  // Gold / 金 — primary accent
  gold: {
    100: '#f0d060',  // existing --color-gold-bright
    200: '#e8c44c',
    300: '#c9a84c',  // existing --color-gold
    400: '#b8860b',  // existing --color-brass
    500: '#8a6d2b',  // existing --color-gold-dim
    600: '#6a5020',
  },

  // Crimson / 朱砂 — danger, urgency
  crimson: {
    300: '#d44040',
    500: '#8b1a1a',  // existing --color-crimson
    700: '#6b0f0f',  // existing --color-crimson-dark
    900: '#3d0808',
  },

  // Bamboo / 竹青 — success, completed (replaces green-*)
  bamboo: {
    300: '#8ab06a',
    500: '#5a7a3a',
    700: '#3d5525',
    900: '#1e2d10',
  },

  // Cerulean / 青墨 — info, in-progress (replaces blue-*)
  cerulean: {
    300: '#5a8080',
    500: '#2d5555',
    700: '#1a3535',
    900: '#0d1f1f',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC COLORS — Use these in components
// ─────────────────────────────────────────────────────────────────────────────

const semanticColors = {
  // Backgrounds
  'bg-game':           rawPalette.leather[900],   // Main game background
  'bg-surface':        rawPalette.leather[800],   // Panel / card surface
  'bg-surface-raised': rawPalette.leather[700],   // Floating panel
  'bg-overlay':        rawPalette.parchment[300], // Paper modal overlay

  // Text (on dark backgrounds)
  'text-primary-val':     rawPalette.parchment[200], // Main body text
  'text-secondary-val':   rawPalette.parchment[400], // Secondary text
  // text-muted uses opacity modifier: text-parchment-500/50

  // Text (on light/parchment backgrounds)
  'text-paper-val':       rawPalette.leather[900],   // Main on parchment
  // text-paper-secondary: leather-700 at 65% opacity

  // Interactive
  'color-primary-val':       rawPalette.gold[300],   // Primary CTA
  'color-primary-hover-val': rawPalette.gold[100],   // Hover state
  'color-primary-dim-val':   rawPalette.gold[500],   // Inactive

  // Status
  'color-danger-val':        rawPalette.crimson[500],
  'color-danger-bright-val': rawPalette.crimson[300],
  'color-success-val':       rawPalette.bamboo[500],
  'color-success-bright-val':rawPalette.bamboo[300],
  'color-info-val':          rawPalette.cerulean[500],
  'color-info-bright-val':   rawPalette.cerulean[300],
  'color-warning-val':       rawPalette.gold[400],
};

// ─────────────────────────────────────────────────────────────────────────────
// TAILWIND v3 THEME EXTENSION
// ─────────────────────────────────────────────────────────────────────────────

const sutanTheme = {
  colors: {
    // Keep existing tokens (already in CSS @theme)
    leather: rawPalette.leather,
    parchment: rawPalette.parchment,
    gold: rawPalette.gold,
    crimson: rawPalette.crimson,
    brass: rawPalette.gold[400],
    ink: rawPalette.ink,

    // New additions
    bamboo: rawPalette.bamboo,
    cerulean: rawPalette.cerulean,
  },

  fontFamily: {
    display: ['Ma Shan Zheng', 'STKaiti', 'KaiTi', 'serif'],
    body:    ['Source Han Serif CN', 'Noto Serif SC', 'SimSun', 'serif'],
    ui:      ['Source Han Sans CN', 'Noto Sans SC', 'PingFang SC', 'sans-serif'],
    mono:    ['Source Code Pro', 'Consolas', 'monospace'],
  },

  boxShadow: {
    // Ink shadows (dark UI)
    'ink-sm': '0 2px 8px rgba(0,0,0,0.3)',
    'ink':    '0 4px 16px rgba(0,0,0,0.4)',
    'ink-lg': '0 8px 32px rgba(0,0,0,0.5)',

    // Gold glow (emphasis / active)
    'gold-sm': '0 0 8px rgba(201,168,76,0.2)',
    'gold':    '0 0 20px rgba(201,168,76,0.3)',
    'gold-lg': '0 0 40px rgba(201,168,76,0.4)',

    // Rarity glows
    'rarity-gold':   '0 0 16px rgba(234,179,8,0.25), 0 0 32px rgba(234,179,8,0.10)',
    'rarity-silver': '0 0 14px rgba(156,163,175,0.20)',
    'rarity-copper': '0 0 12px rgba(180,83,9,0.18)',
    'rarity-stone':  '0 0 8px rgba(120,113,108,0.12)',

    // Danger glow
    'danger':        '0 0 16px rgba(139,26,26,0.3)',
    'danger-bright': '0 0 20px rgba(212,64,64,0.4)',
  },

  transitionDuration: {
    fast:   '150ms',
    normal: '250ms',
    slow:   '400ms',
    story:  '600ms',
  },

  transitionTimingFunction: {
    'spring':   'cubic-bezier(0.22, 1, 0.36, 1)',
    'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  borderRadius: {
    none: '0',
    sm:   '2px',
    DEFAULT: '4px',
    md:   '6px',
    lg:   '8px',
    // Avoid xl+ in production components
    xl:   '12px',
    full: '9999px',
  },

  // Semantic opacity shortcuts
  opacity: {
    // Standard Tailwind values retained
    '0':   '0',
    '5':   '0.05',
    '10':  '0.1',
    '15':  '0.15',
    '20':  '0.2',
    '25':  '0.25',
    '30':  '0.3',
    '40':  '0.4',
    '50':  '0.5',
    '60':  '0.6',
    '65':  '0.65',   // body text on parchment
    '70':  '0.7',
    '75':  '0.75',
    '80':  '0.8',
    '90':  '0.9',
    '95':  '0.95',
    '100': '1',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TAILWIND v4 CSS — Add these to src/renderer/styles/index.css @theme block
// ─────────────────────────────────────────────────────────────────────────────

export const tailwindV4Additions = `
/* ── New color additions (append to @theme block) ── */

/* Bamboo / 竹青 (replaces green-* for success states) */
--color-bamboo-300: #8ab06a;
--color-bamboo-500: #5a7a3a;
--color-bamboo-700: #3d5525;
--color-bamboo-900: #1e2d10;

/* Cerulean / 青墨 (replaces blue-* for info states) */
--color-cerulean-300: #5a8080;
--color-cerulean-500: #2d5555;
--color-cerulean-700: #1a3535;

/* Extended leather scale */
--color-leather-700: #3d2418;
--color-leather-600: #5a3520;

/* Extended parchment scale */
--color-parchment-50:  #f5f0e8;
--color-parchment-100: #ede5d4;
--color-parchment-400: #c4b594;
--color-parchment-500: #b0a07e;

/* Extended gold scale */
--color-gold-200: #e8c44c;
--color-gold-600: #6a5020;

/* Extended crimson scale */
--color-crimson-300: #d44040;
--color-crimson-900: #3d0808;

/* Extended ink scale */
--color-ink-950: #0a0a12;
--color-ink-700: #363655;

/* ── Additional shadows ── */
--shadow-ink-sm: 0 2px 8px rgba(0,0,0,0.3);
--shadow-ink:    0 4px 16px rgba(0,0,0,0.4);
--shadow-ink-lg: 0 8px 32px rgba(0,0,0,0.5);
--shadow-rarity-gold:   0 0 16px rgba(234,179,8,0.25), 0 0 32px rgba(234,179,8,0.10);
--shadow-rarity-silver: 0 0 14px rgba(156,163,175,0.20);
--shadow-rarity-copper: 0 0 12px rgba(180,83,9,0.18);
--shadow-rarity-stone:  0 0 8px rgba(120,113,108,0.12);
--shadow-danger:        0 0 16px rgba(139,26,26,0.3);
--shadow-danger-bright: 0 0 20px rgba(212,64,64,0.4);

/* ── Font families ── */
--font-body:    'Source Han Serif CN', 'Noto Serif SC', 'SimSun', serif;
--font-ui:      'Source Han Sans CN', 'Noto Sans SC', 'PingFang SC', sans-serif;
--font-mono:    'Source Code Pro', 'Consolas', monospace;
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT STYLE PRESETS — Copy-paste ready Tailwind class strings
// ─────────────────────────────────────────────────────────────────────────────

export const componentPresets = {
  // ── Status badges (replaces hardcoded inline conditionals) ──
  statusBadge: {
    available:   'border border-gold-dim/40 text-gold bg-gold/10',
    participated:'border border-cerulean-500/30 text-cerulean-300 bg-cerulean/10',
    completed:   'border border-bamboo-700/30 text-bamboo-300 bg-bamboo/10',
    locked:      'border border-leather-700/30 text-parchment/30 bg-leather/20',
    danger:      'border border-crimson/30 text-crimson bg-crimson/10',
  },

  // ── Status text colors (replaces text-blue-300, text-green-300 etc.) ──
  statusText: {
    available:    'text-gold',
    participated: 'text-cerulean-300',
    completed:    'text-bamboo-300',
    locked:       'text-parchment/30',
  },

  // ── Status backgrounds (replaces bg-blue-900/10, bg-green-950/30 etc.) ──
  statusBg: {
    available:    'bg-gold/5 hover:bg-gold/15',
    participated: 'bg-cerulean-900/10',
    completed:    'bg-bamboo-900/20',
    locked:       'bg-leather-950/20',
  },

  // ── Panels ──
  panel: {
    dark:      'bg-ink/90 backdrop-blur-sm border border-gold-dim/30 rounded-lg',
    parchment: 'bg-parchment-texture border border-parchment-400/40 rounded-lg',
    glass:     'bg-leather/60 backdrop-blur-md border border-gold-dim/20 rounded-lg',
    raised:    'bg-leather-700/80 backdrop-blur-sm border border-gold-dim/30 rounded-lg',
  },

  // ── Card borders by rarity ──
  rarityBorder: {
    gold:   'border-gold-300/50',
    silver: 'border-parchment-400/40',
    copper: 'border-gold-500/40',
    stone:  'border-leather-600/30',
  },

  // ── HUD resource values ──
  hud: {
    day:        'text-gold font-[family-name:var(--font-display)]',
    danger:     'text-crimson font-[family-name:var(--font-display)] animate-pulse',
    gold:       'text-gold',
    reputation: 'text-cerulean-300',  // replaces text-blue-200
    label:      'text-gold-dim/60 text-xs tracking-widest',
  },

  // ── Typography shortcuts ──
  text: {
    // On dark (leather/ink) background
    heading:    'font-[family-name:var(--font-display)] text-gold',
    subheading: 'font-[family-name:var(--font-display)] text-parchment',
    body:       'text-parchment/80 leading-relaxed',
    muted:      'text-parchment/50',
    label:      'text-parchment/40 text-xs tracking-widest uppercase',

    // On light (parchment) background
    paperHeading: 'font-[family-name:var(--font-display)] text-leather',
    paperBody:    'text-leather/65 leading-relaxed',
    paperMuted:   'text-leather/40',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RARITY SYSTEM — Unified rarity definitions (replaces RARITY_STYLES, COMPACT_RARITY, RARITY_ACCENT)
// ─────────────────────────────────────────────────────────────────────────────

export const rarityConfig = {
  gold: {
    border:     'border-gold-300/50',
    bg:         'bg-gold-600/10',
    shadow:     'var(--shadow-rarity-gold)',
    accentFrom: 'from-gold-300',
    accentTo:   'to-gold-400',
    badge:      'bg-gradient-to-b from-gold-300 to-gold-400 text-leather-900',
    badgeDark:  'bg-gradient-to-r from-gold-400 to-gold-500 text-parchment-50',
    label:      '金',
  },
  silver: {
    border:     'border-parchment-400/40',
    bg:         'bg-parchment-500/10',
    shadow:     'var(--shadow-rarity-silver)',
    accentFrom: 'from-parchment-300',
    accentTo:   'to-parchment-400',
    badge:      'bg-gradient-to-b from-parchment-300 to-parchment-400 text-leather-900',
    badgeDark:  'bg-gradient-to-r from-parchment-400 to-parchment-500 text-ink-900',
    label:      '银',
  },
  copper: {
    border:     'border-gold-500/40',
    bg:         'bg-gold-600/10',
    shadow:     'var(--shadow-rarity-copper)',
    accentFrom: 'from-gold-400',
    accentTo:   'to-gold-500',
    badge:      'bg-gradient-to-b from-gold-400 to-gold-500 text-parchment-50',
    badgeDark:  'bg-gradient-to-r from-gold-500 to-gold-600 text-parchment-200',
    label:      '铜',
  },
  stone: {
    border:     'border-leather-600/30',
    bg:         'bg-leather-800/20',
    shadow:     'var(--shadow-rarity-stone)',
    accentFrom: 'from-leather-600',
    accentTo:   'to-leather-700',
    badge:      'bg-gradient-to-b from-leather-600 to-leather-700 text-parchment-200',
    badgeDark:  'bg-gradient-to-r from-leather-600 to-leather-700 text-parchment-300',
    label:      '石',
  },
};

export default sutanTheme;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * QUICK REFERENCE: Common Migration Patterns
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * STATUS COLORS:
 *   text-blue-400   → text-cerulean-300  (info / in-progress)
 *   text-blue-200   → text-cerulean-300  (reputation)
 *   text-blue-300   → text-cerulean-300
 *   text-green-300  → text-bamboo-300    (completed)
 *   text-green-600  → text-bamboo-500
 *   bg-blue-900/10  → bg-cerulean-900/10
 *   bg-green-950/30 → bg-bamboo-900/20
 *   border-blue-700/30  → border-cerulean-500/30
 *   border-green-800/30 → border-bamboo-700/30
 *
 * FONTS:
 *   style={{ fontFamily: 'serif' }}
 *   → className="font-[family-name:var(--font-display)]"
 *
 *   style={{ fontFamily: 'Georgia, serif' }}
 *   → className="font-[family-name:var(--font-display)]"
 *
 * BACKGROUNDS:
 *   bg-gray-950   → bg-leather-900  (or keep as game bg)
 *   bg-gray-900   → bg-ink-900
 *   bg-gray-800   → bg-ink-800
 *
 * BUTTONS (replace raw <button> with Button component):
 *   <button className="px-6 py-3 bg-gray-800/60 border border-amber-900/40 rounded-lg text-amber-100 ...">
 *   → <Button variant="primary" size="md">
 *
 *   <button className="px-5 py-1.5 bg-amber-900/50 border border-amber-600/40 ...">
 *   → <Button variant="primary" size="sm">
 *
 * SHADOWS (inline → token):
 *   style={{ boxShadow: '0 0 12px rgba(234,179,8,0.20), 0 2px 8px rgba(0,0,0,0.3)' }}
 *   → style={{ boxShadow: 'var(--shadow-rarity-gold), var(--shadow-ink-sm)' }}
 *
 * PANEL VARIANTS:
 *   bg-gray-900/60 border border-gray-800 → Panel variant="dark"
 *   bg-leather/60 backdrop-blur → Panel variant="glass"
 */
