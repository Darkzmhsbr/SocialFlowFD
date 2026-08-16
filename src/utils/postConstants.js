// Single source of truth for post-related labels, limits and validation
// rules on the frontend. Any component that needs to say "carousel accepts
// 2 to 10 media" or "caption max 2200 chars" reads from here.

export const POST_TYPE_LABELS = {
  FEED_IMAGE: 'Foto no feed',
  FEED_VIDEO: 'Vídeo no feed',
  FEED_CAROUSEL: 'Carrossel',
  REEL: 'Reels',
  STORY: 'Story',
};

export const POST_STATUS_LABELS = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  QUEUED: 'Na fila',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicado',
  FAILED: 'Falhou',
  ARCHIVED: 'Arquivado',
};

// Rules mirrored from the backend (scheduledPostService.js). Kept here so
// the composer can disable / warn without a round-trip to the server.
export const POST_TYPE_RULES = {
  FEED_IMAGE:    { min: 1, max: 1,  allowed: ['IMAGE'] },
  FEED_VIDEO:    { min: 1, max: 1,  allowed: ['VIDEO'] },
  FEED_CAROUSEL: { min: 2, max: 10, allowed: ['IMAGE', 'VIDEO'] },
  REEL:          { min: 1, max: 1,  allowed: ['VIDEO'] },
  STORY:         { min: 1, max: 1,  allowed: ['IMAGE', 'VIDEO'] },
};

// Instagram caveats surfaced in the UI when a type is chosen.
export const POST_TYPE_HINTS = {
  FEED_IMAGE: 'JPG ou PNG. Proporção entre 4:5 e 1.91:1.',
  FEED_VIDEO: 'MP4 ou MOV, até 100MB. Vertical ou quadrado ficam melhores.',
  FEED_CAROUSEL: 'De 2 a 10 mídias. Todas na mesma proporção rendem melhor.',
  REEL: 'MP4 ou MOV vertical (9:16), até 100MB.',
  STORY: 'Foto ou vídeo vertical (9:16). Vídeos até 60 segundos.',
};

// Instagram-enforced caption ceiling. UI shows a live counter based on this.
export const CAPTION_MAX_LENGTH = 2200;

// Tabs shown on the /posts listing page, in display order.
export const STATUS_TABS = [
  { key: 'ALL',       label: 'Todos',     filter: null },
  { key: 'DRAFT',     label: 'Rascunhos', filter: 'DRAFT' },
  { key: 'SCHEDULED', label: 'Agendados', filter: 'SCHEDULED' },
  { key: 'QUEUED',    label: 'Na fila',   filter: 'QUEUED' },
  { key: 'PUBLISHED', label: 'Publicados', filter: 'PUBLISHED' },
  { key: 'FAILED',    label: 'Falhou',    filter: 'FAILED' },
  { key: 'ARCHIVED',  label: 'Arquivados', filter: 'ARCHIVED' },
];