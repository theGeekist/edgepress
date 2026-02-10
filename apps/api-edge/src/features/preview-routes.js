import { assertPreviewNotExpired } from '../../../../packages/domain/src/index.js';
import { requireCapability } from '../auth.js';
import { error, json } from '../http.js';
import { parseTtlSeconds, signPreviewToken, verifyPreviewTokenSignature } from '../runtime-utils.js';

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
  // Guard against oversized query payloads.
  if (raw.length > 16_000) return {};
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

function buildPreviewHtml(doc, themeVars) {
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
      <article><h1>${escapeHtml(doc.title)}</h1>${doc.content || ''}</article>
    </main>
  </body>
</html>`;
}

export function createPreviewRoutes({ runtime, store, previewStore, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/preview/:documentId', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:read' });
        const doc = await store.getDocument(params.documentId);
        if (!doc) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        const themeVars = parseThemeVarsFromRequest(request);

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
          createdBy: user.id,
          html: buildPreviewHtml(doc, themeVars)
        });

        return json({
          previewUrl: `/preview/${previewToken}?sig=${encodeURIComponent(signature)}`,
          expiresAt,
          releaseLikeRef
        });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/preview/:token', async (request, params) => {
      const preview = await previewStore.getPreview(params.token);
      if (!preview) {
        return error('PREVIEW_NOT_FOUND', 'Preview not found', 404);
      }
      const signature = new URL(request.url).searchParams.get('sig');
      const validSignature = await verifyPreviewTokenSignature(runtime, params.token, signature);
      if (!validSignature) {
        return error('PREVIEW_TOKEN_INVALID', 'Preview token signature is invalid', 401);
      }
      try {
        assertPreviewNotExpired(preview, runtime.now().toISOString());
      } catch (e) {
        return error('PREVIEW_EXPIRED', e.message, 410);
      }
      return new Response(preview.html, {
        status: 200,
        headers: {
          'content-type': 'text/html',
          'content-security-policy': "default-src 'none'; script-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        }
      });
    })
  ];
}
