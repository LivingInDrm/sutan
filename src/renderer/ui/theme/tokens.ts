export const colors = {
  leather: { DEFAULT: '#1a0f0a', light: '#2a1810' },
  parchment: { DEFAULT: '#d4c5a9', light: '#e8dcc8' },
  gold: { DEFAULT: '#c9a84c', bright: '#f0d060', dim: '#8a6d2b' },
  crimson: { DEFAULT: '#8b1a1a', dark: '#6b0f0f' },
  brass: '#b8860b',
  ink: { DEFAULT: '#1a1a2e', light: '#252540' },
} as const;

export const shadows = {
  goldSm: '0 0 8px rgba(201,168,76,0.2)',
  gold: '0 0 20px rgba(201,168,76,0.3)',
  goldLg: '0 0 40px rgba(201,168,76,0.4)',
} as const;
