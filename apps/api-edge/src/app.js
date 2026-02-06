import { assertPlatformPorts } from '../../../packages/ports/src/index.js';
import { createRelease } from '../../../packages/publish/src/publisher.js';
import { assertPreviewNotExpired, normalizePublishProvenanceInput } from '../../../packages/domain/src/index.js';
import { createAccessToken, requireCapability, verifyAccessToken } from './auth.js';
import { error, getBearerToken, getCorsHeaders, json, matchPath, readJson, withCors } from './http.js';

function route(method, path, handler) {
  return { method, path, handler };
}

function authzErrorResponse(e) {
  if (typeof e?.status === 'number' && typeof e?.code === 'string') {
    return error(e.code, e.message, e.status);
  }
  return error('FORBIDDEN', e?.message || 'Forbidden', 403);
}

function normalizePublishProvenance(body) {
  try {
    return normalizePublishProvenanceInput(body);
  } catch (e) {
    if (typeof e?.message === 'string' && e.message.startsWith('sourceRevisionSet')) {
      return { error: error('PUBLISH_INVALID_SOURCE_SET', e.message, 400) };
    }
    return { error: error('PUBLISH_INVALID_SOURCE_SET', 'Invalid publish provenance payload', 400) };
  }
}

async function authUserFromRequest(runtime, store, request) {
  const token = getBearerToken(request);
  return verifyAccessToken(runtime, token, store);
}

export function createApiHandler(platform) {
  assertPlatformPorts(platform);
  const { runtime, store, blobStore, cacheStore, releaseStore, previewStore } = platform;

  const routes = [
    route('POST', '/v1/auth/token', async (request) => {
      const body = await readJson(request);
      const user = await store.getUserByUsername(body.username);
      if (!user || user.password !== body.password) {
        return error('AUTH_INVALID', 'Invalid credentials', 401);
      }

      const accessToken = await createAccessToken(runtime, user);
      const refreshToken = `r_${runtime.uuid()}`;
      await store.saveRefreshToken(refreshToken, user.id);

      return json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          capabilities: user.capabilities
        }
      });
    }),

    route('POST', '/v1/auth/refresh', async (request) => {
      const body = await readJson(request);
      const userId = await store.getRefreshTokenUser(body.refreshToken);
      if (!userId) return error('AUTH_INVALID_REFRESH', 'Refresh token invalid', 401);
      const user = await store.getUserById(userId);
      if (!user) return error('AUTH_USER_NOT_FOUND', 'User not found', 401);

      const accessToken = await createAccessToken(runtime, user);
      const nextRefreshToken = `r_${runtime.uuid()}`;
      await store.revokeRefreshToken(body.refreshToken);
      await store.saveRefreshToken(nextRefreshToken, user.id);

      return json({ accessToken, refreshToken: nextRefreshToken });
    }),

    route('POST', '/v1/auth/logout', async (request) => {
      const body = await readJson(request);
      if (body.refreshToken) await store.revokeRefreshToken(body.refreshToken);
      return json({ ok: true });
    }),

    route('GET', '/v1/documents', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await store.listDocuments();
        return json({ items });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/documents', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const id = `doc_${runtime.uuid()}`;
        const document = await store.createDocument({
          id,
          title: body.title || 'Untitled',
          content: body.content || '',
          createdBy: user.id,
          status: body.status || 'draft'
        });
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: id,
          title: document.title,
          content: document.content,
          sourceRevisionId: null,
          authorId: user.id
        });
        return json({ document, revision }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('PATCH', '/v1/documents/:id', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const existing = await store.getDocument(params.id);
        if (!existing) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);

        const document = await store.updateDocument(params.id, {
          title: body.title ?? existing.title,
          content: body.content ?? existing.content,
          status: body.status ?? existing.status
        });
        const revisions = await store.listRevisions(params.id);
        const latest = revisions.at(-1) || null;
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          sourceRevisionId: latest?.id || null,
          authorId: user.id
        });

        return json({ document, revision });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await store.listRevisions(params.id);
        return json({ items });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const document = await store.getDocument(params.id);
        if (!document) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        const revisions = await store.listRevisions(params.id);
        const latest = revisions.at(-1) || null;
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          sourceRevisionId: latest?.id || null,
          authorId: user.id
        });
        return json({ revision }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'media:write' });
        const mediaId = `med_${runtime.uuid()}`;
        const uploadToken = `up_${runtime.uuid()}`;
        const session = await store.createMediaSession({
          id: mediaId,
          createdBy: user.id,
          uploadToken
        });
        return json({
          mediaId: session.id,
          uploadUrl: session.uploadUrl,
          uploadToken: session.uploadToken,
          requiredHeaders: session.requiredHeaders
        }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media/:id/finalize', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const body = await readJson(request);
        const existing = await store.getMedia(params.id);
        if (!existing) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        if (existing.uploadToken !== body.uploadToken) {
          return error('MEDIA_UPLOAD_TOKEN_INVALID', 'Upload token invalid', 401);
        }

        const path = `media/${params.id}/${body.filename || 'asset.bin'}`;
        await blobStore.putBlob(path, 'placeholder-bytes', { contentType: body.mimeType || 'application/octet-stream' });
        const signedUrl = await blobStore.signedReadUrl(path, 3600);
        const media = await store.finalizeMedia(params.id, {
          filename: body.filename || 'asset.bin',
          mimeType: body.mimeType || 'application/octet-stream',
          size: body.size || 0,
          url: signedUrl
        });
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const media = await store.getMedia(params.id);
        if (!media) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/publish', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'publish:write' });
        const body = await readJson(request);
        const provenance = normalizePublishProvenance(body);
        if (provenance.error) return provenance.error;
        const jobId = `job_${runtime.uuid()}`;
        let job = await store.createPublishJob({
          id: jobId,
          requestedBy: user.id,
          sourceRevisionId: provenance.sourceRevisionId,
          sourceRevisionSet: provenance.sourceRevisionSet
        });

        try {
          const manifest = await createRelease({
            runtime,
            store,
            releaseStore,
            sourceRevisionId: provenance.sourceRevisionId,
            sourceRevisionSet: provenance.sourceRevisionSet,
            publishedBy: user.id
          });
          if (!(await releaseStore.getActiveRelease())) {
            await releaseStore.activateRelease(manifest.releaseId);
          }
          job = await store.updatePublishJob(jobId, {
            status: 'completed',
            releaseId: manifest.releaseId
          });
        } catch (publishError) {
          job = await store.updatePublishJob(jobId, {
            status: 'failed',
            error: publishError.message
          });
        }

        return json({ job }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/publish/:jobId', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const job = await store.getPublishJob(params.jobId);
        if (!job) return error('PUBLISH_JOB_NOT_FOUND', 'Publish job not found', 404);
        return json({ job });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/releases/:id/activate', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'publish:write' });
        const activeRelease = await releaseStore.activateRelease(params.id);
        return json({ activeRelease });
      } catch (e) {
        const status = e.message === 'Unknown releaseId' ? 404 : 403;
        return error('RELEASE_ACTIVATE_FAILED', e.message, status);
      }
    }),

    route('GET', '/v1/releases', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await releaseStore.listReleases();
        const activeRelease = await releaseStore.getActiveRelease();
        return json({ items, activeRelease });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/preview/:documentId', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:read' });
        const doc = await store.getDocument(params.documentId);
        if (!doc) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);

        const DEFAULT_TTL = 15 * 60;
        const MIN_TTL = 30;
        const MAX_TTL = 24 * 60 * 60;
        const rawTtl = runtime.env('PREVIEW_TTL_SECONDS');
        const parsedTtl = Number(rawTtl);
        const previewTtlSeconds =
          Number.isFinite(parsedTtl) && parsedTtl >= MIN_TTL ? Math.min(parsedTtl, MAX_TTL) : DEFAULT_TTL;
        const previewToken = `prv_${runtime.uuid()}`;
        const expiresAt = new Date(runtime.now().getTime() + previewTtlSeconds * 1000).toISOString();
        const releaseLikeRef = `preview_${runtime.uuid()}`;

        await previewStore.createPreview({
          previewToken,
          documentId: doc.id,
          releaseLikeRef,
          expiresAt,
          createdBy: user.id,
          html: `<html><body><article><h1>${doc.title}</h1>${doc.content}</article></body></html>`
        });

        return json({
          previewUrl: `/preview/${previewToken}`,
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
      try {
        assertPreviewNotExpired(preview, runtime.now().toISOString());
      } catch (e) {
        return error('PREVIEW_EXPIRED', e.message, 410);
      }
      return new Response(preview.html, { status: 200, headers: { 'content-type': 'text/html' } });
    }),

    route('POST', '/v1/forms/:formId/submit', async (request, params) => {
      const ctx = runtime.requestContext(request);
      if (runtime.rateLimit) {
        const limit = await runtime.rateLimit(`form:${params.formId}:${ctx.ipHash}`, { max: 5, windowMs: 60000 });
        if (!limit.allowed) {
          return error('RATE_LIMITED', 'Too many submissions', 429);
        }
      }
      const body = await readJson(request);
      const submission = await store.createFormSubmission({
        id: `sub_${runtime.uuid()}`,
        formId: params.formId,
        payload: body.payload || {},
        requestContext: ctx
      });
      return json({ submissionId: submission.id }, 202);
    }),

    route('GET', '/v1/private/:route', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'private:read' });
        const routeId = decodeURIComponent(params.route);
        const user = await authUserFromRequest(runtime, store, request);
        const activeRelease = await releaseStore.getActiveRelease();
        if (!activeRelease) return error('RELEASE_NOT_ACTIVE', 'No active release', 404);

        const cacheKey = `private:${activeRelease}:${routeId}:${user.id}`;
        const cached = await cacheStore.get(cacheKey);
        if (cached) {
          return json({ route: routeId, html: cached, releaseId: activeRelease, cache: 'hit' });
        }

        const manifest = await releaseStore.getManifest(activeRelease);
        const artifact = manifest?.artifacts?.find((x) => x.route === routeId);
        if (!artifact) return error('ROUTE_NOT_FOUND', 'Private route not found', 404);

        const blob = await blobStore.getBlob(artifact.path);
        if (!blob) return error('ARTIFACT_NOT_FOUND', 'Artifact blob missing', 404);

        const html = blob.bytes;
        await cacheStore.set(cacheKey, html, 120);
        return json({ route: routeId, html, releaseId: activeRelease, cache: 'miss' });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];

  return async function handleRequest(request) {
    const corsOrigin = runtime.env('DEV_CORS_ORIGIN') || '*';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(corsOrigin) });
    }

    try {
      const url = new URL(request.url);

      for (const def of routes) {
        if (request.method !== def.method) continue;
        const params = matchPath(def.path, url.pathname);
        if (!params) continue;
        return withCors(await def.handler(request, params), corsOrigin);
      }

      return withCors(error('NOT_FOUND', 'Route not found', 404), corsOrigin);
    } catch (e) {
      runtime.log('error', 'unhandled_exception', { message: e.message });
      return withCors(error('INTERNAL_ERROR', 'Internal server error', 500), corsOrigin);
    }
  };
}
