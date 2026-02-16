import { assertPreviewNotExpired } from '@geekist/edgepress/domain';
import { normalizeBlocksInput } from '@geekist/edgepress/domain/blocks.js';
import { serialize } from '@wordpress/blocks';
import { parseTtlSeconds, signPreviewToken, verifyPreviewTokenSignature } from '@geekist/edgepress/api-core/runtime-utils.js';

function collectMediaIds(blocks, featuredImageId) {
  const ids = new Set();
  const walk = (items) => {
    if (!Array.isArray(items)) return;
    for (const block of items) {
      if (!block || typeof block !== 'object') continue;
      const attrs = block.attributes && typeof block.attributes === 'object' ? block.attributes : {};
      const mediaId = String(attrs.mediaId || attrs.id || '').trim();
      if (mediaId) ids.add(mediaId);
      walk(block.innerBlocks);
    }
  };
  walk(blocks);
  const featured = String(featuredImageId || '').trim();
  if (featured) ids.add(featured);
  return ids;
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseThemeVarsFromRequest(request) {
  const params = new URL(request.url).searchParams;
  const raw = String(params.get('themeVars') || '');
  if (!raw) return {};
  if (raw.length > 16000) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      const cssVar = String(key || '').trim();
      const cssValue = String(value || '').trim();
      if (!cssVar.startsWith('--ep-') || !cssValue) continue;
      out[cssVar] = cssValue;
    }
    return out;
  } catch {
    return {};
  }
}

function toCssVarBlock(themeVars) {
  const entries = Object.entries(themeVars || {});
  if (entries.length === 0) return '';
  return entries
    .filter(([, value]) => {
      const v = String(value || '');
      return !v.includes('<') && !v.includes('>') && !v.toLowerCase().includes('</');
    })
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

function buildPreviewHtml(doc, themeVars, serializedBlocks, featuredImageMarkup) {
  const cssVarBlock = toCssVarBlock(themeVars);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(doc.title || 'Preview')}</title>
    <style>
      :root {
        ${cssVarBlock}
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: var(--ep-surface-page, #f0f0f1);
        color: var(--ep-color-text, #1d2327);
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      .ep-preview-wrap {
        max-width: 860px;
        margin: 24px auto;
        padding: 24px;
        background: var(--ep-surface-surface, #fff);
        border: 1px solid var(--ep-color-border, #dcdcde);
      }
      h1 { margin-top: 0; margin-bottom: 1rem; }
      a { color: var(--ep-color-accent, #2271b1); }
    </style>
  </head>
  <body>
    <main class="ep-preview-wrap">
      <article>${featuredImageMarkup}<h1>${escapeHtml(doc.title)}</h1>${serializedBlocks}</article>
    </main>
  </body>
</html>`;
}

export function createPreviewFeature({ runtime, store, previewStore, resolveImageBlocks }) {
  async function createPreview({ request, documentId, userId }) {
    const doc = await store.getDocument(documentId);
    if (!doc) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };

    const themeVars = parseThemeVarsFromRequest(request);
    const requestedIds = collectMediaIds(doc.blocks, doc.featuredImageId);
    const mediaById = new Map();
    if (requestedIds.size > 0 && typeof store.getMedia === 'function') {
      await Promise.all(
        Array.from(requestedIds).map(async (mediaId) => {
          const media = await store.getMedia(mediaId);
          if (media) mediaById.set(media.id, media);
        })
      );
    }

    let serializedBlocks;
    if (Array.isArray(doc.blocks) && doc.blocks.length > 0) {
      const canonicalBlocks = normalizeBlocksInput(doc.blocks);
      const resolvedBlocks = resolveImageBlocks(canonicalBlocks, mediaById);
      serializedBlocks = serialize(resolvedBlocks);
    } else {
      serializedBlocks = doc.content || doc.legacyHtml || '';
    }

    const featuredImageId = String(doc.featuredImageId || '').trim();
    const featuredImage = featuredImageId && mediaById.has(featuredImageId) ? mediaById.get(featuredImageId) : null;
    const featuredImageMarkup = featuredImage?.url
      ? `<figure><img src="${escapeHtml(featuredImage.url)}" alt="${escapeHtml(featuredImage.alt || '')}" /></figure>`
      : '';

    const previewTtlSeconds = parseTtlSeconds(runtime.env('PREVIEW_TTL_SECONDS'), {
      fallback: 15 * 60,
      min: 30,
      max: 24 * 60 * 60
    });
    const previewToken = `prv_${runtime.uuid()}`;
    const signature = await signPreviewToken(runtime, previewToken);
    const expiresAt = new Date(runtime.now().getTime() + previewTtlSeconds * 1000).toISOString();
    const releaseLikeRef = `preview_${runtime.uuid()}`;

    await previewStore.createPreview({
      previewToken,
      documentId: doc.id,
      releaseLikeRef,
      expiresAt,
      createdBy: userId,
      html: buildPreviewHtml(doc, themeVars, serializedBlocks, featuredImageMarkup)
    });

    return {
      previewUrl: `/preview/${previewToken}?sig=${encodeURIComponent(signature)}`,
      expiresAt,
      releaseLikeRef
    };
  }

  async function renderPreview({ request, token }) {
    const preview = await previewStore.getPreview(token);
    if (!preview) return { error: { code: 'PREVIEW_NOT_FOUND', message: 'Preview not found', status: 404 } };

    const signature = new URL(request.url).searchParams.get('sig');
    const validSignature = await verifyPreviewTokenSignature(runtime, token, signature);
    if (!validSignature) {
      return { error: { code: 'PREVIEW_TOKEN_INVALID', message: 'Preview token signature is invalid', status: 401 } };
    }

    try {
      assertPreviewNotExpired(preview, runtime.now().toISOString());
    } catch (e) {
      return { error: { code: 'PREVIEW_EXPIRED', message: e.message, status: 410 } };
    }

    return {
      html: preview.html,
      headers: {
        'content-type': 'text/html',
        'content-security-policy': "default-src 'none'; script-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
      }
    };
  }

  return {
    createPreview,
    renderPreview
  };
}
