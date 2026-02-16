/* c8 ignore file */
const D1_SQL = {
  insertHistory: 'INSERT INTO release_history (event_json, created_at) VALUES (?, ?)',
  insertHistoryIfLastWriteChanged:
    'INSERT INTO release_history (event_json, created_at) SELECT ?, ? WHERE changes() > 0',
  selectManifestId: 'SELECT release_id FROM release_manifests WHERE release_id = ?',
  selectManifestById: 'SELECT manifest_json FROM release_manifests WHERE release_id = ?',
  selectAllManifests:
    'SELECT manifest_json FROM release_manifests ORDER BY manifest_created_at ASC, created_at ASC, release_id ASC',
  insertManifest: 'INSERT INTO release_manifests (release_id, manifest_json, manifest_created_at, created_at) VALUES (?, ?, ?, ?)',
  selectActiveRelease: 'SELECT active_release_id FROM release_state WHERE id = 1',
  upsertActiveRelease:
    'INSERT INTO release_state (id, active_release_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET active_release_id = excluded.active_release_id',
  upsertActiveReleaseIfNone:
    'INSERT INTO release_state (id, active_release_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET active_release_id = excluded.active_release_id WHERE release_state.active_release_id IS NULL',
  selectHistory: 'SELECT event_json FROM release_history ORDER BY id ASC',
  selectUserById: 'SELECT user_json FROM app_users WHERE id = ?',
  selectUserByUsername: 'SELECT user_json FROM app_users WHERE username = ?',
  upsertUser:
    'INSERT INTO app_users (id, username, user_json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, user_json = excluded.user_json',
  upsertRefreshToken:
    'INSERT INTO app_refresh_tokens (token, user_id) VALUES (?, ?) ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id',
  selectRefreshTokenUser: 'SELECT user_id FROM app_refresh_tokens WHERE token = ?',
  deleteRefreshToken: 'DELETE FROM app_refresh_tokens WHERE token = ?',
  selectDocuments: 'SELECT document_json FROM app_documents ORDER BY updated_at ASC',
  selectDocumentById: 'SELECT document_json FROM app_documents WHERE id = ?',
  upsertDocument:
    'INSERT INTO app_documents (id, document_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET document_json = excluded.document_json, updated_at = excluded.updated_at',
  selectRevisionsByDocument: 'SELECT revision_json FROM app_revisions WHERE document_id = ? ORDER BY created_at ASC',
  selectRevisionById: 'SELECT revision_json FROM app_revisions WHERE id = ?',
  upsertRevision:
    'INSERT INTO app_revisions (id, document_id, revision_json, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET document_id = excluded.document_id, revision_json = excluded.revision_json, created_at = excluded.created_at',
  selectMedia: 'SELECT media_json FROM app_media ORDER BY updated_at DESC',
  selectMediaById: 'SELECT media_json FROM app_media WHERE id = ?',
  deleteMediaById: 'DELETE FROM app_media WHERE id = ?',
  upsertMedia:
    'INSERT INTO app_media (id, media_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET media_json = excluded.media_json, updated_at = excluded.updated_at',
  selectPublishJobById: 'SELECT publish_job_json FROM app_publish_jobs WHERE id = ?',
  upsertPublishJob:
    'INSERT INTO app_publish_jobs (id, publish_job_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET publish_job_json = excluded.publish_job_json, updated_at = excluded.updated_at',
  upsertFormSubmission:
    'INSERT INTO app_form_submissions (id, form_id, submission_json, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET form_id = excluded.form_id, submission_json = excluded.submission_json, created_at = excluded.created_at',
  selectPreviewByToken: 'SELECT preview_json FROM app_previews WHERE preview_token = ?',
  upsertPreview:
    'INSERT INTO app_previews (preview_token, preview_json, expires_at) VALUES (?, ?, ?) ON CONFLICT(preview_token) DO UPDATE SET preview_json = excluded.preview_json, expires_at = excluded.expires_at'
};

export function createFakeKV() {
  const map = new Map();
  return {
    __keys: [],
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      map.set(key, value);
      if (!this.__keys.includes(key)) this.__keys.push(key);
    },
    async delete(key) {
      map.delete(key);
      this.__keys = this.__keys.filter((entry) => entry !== key);
    }
  };
}

export function createFakeR2() {
  const map = new Map();
  return {
    async put(key, value, options = {}) {
      map.set(key, { value, options });
    },
    async get(key) {
      const stored = map.get(key);
      if (!stored) return null;
      return {
        async text() {
          return String(stored.value);
        },
        httpMetadata: {
          contentType: stored.options?.httpMetadata?.contentType
        }
      };
    }
  };
}

export function createFakeD1() {
  const manifests = new Map();
  const state = { activeReleaseId: null };
  const history = [];
  const usersById = new Map();
  const userIdByUsername = new Map();
  const refreshTokens = new Map();
  const documents = new Map();
  const revisions = new Map();
  const media = new Map();
  const publishJobs = new Map();
  const forms = new Map();
  const previews = new Map();
  const control = {
    failHistoryInsert: false,
    failManifestInsert: false,
    execCalls: [],
    batchCalls: 0
  };
  let lastWriteChanges = 0;

  function restoreSnapshot(snapshot) {
    manifests.clear();
    for (const [key, value] of snapshot.manifests.entries()) {
      manifests.set(key, value);
    }
    state.activeReleaseId = snapshot.activeReleaseId;
    history.length = 0;
    history.push(...snapshot.history);
  }

  function takeSnapshot() {
    return {
      manifests: new Map(manifests),
      activeReleaseId: state.activeReleaseId,
      history: history.map((entry) => ({ ...entry }))
    };
  }

  const is = (sql, expected) => sql.trim() === expected.trim();
  function createBound(sql, args) {
    return {
      async run() {
        if (is(sql, D1_SQL.insertManifest)) {
          if (control.failManifestInsert) {
            throw new Error('manifest insert failed');
          }
          const [releaseId, manifestJson, manifestCreatedAt, createdAt] = args;
          if (manifests.has(releaseId)) {
            const error = new Error('UNIQUE constraint failed: release_manifests.release_id');
            error.code = 'SQLITE_CONSTRAINT';
            throw error;
          }
          manifests.set(releaseId, { releaseId, manifestJson, manifestCreatedAt, createdAt });
          lastWriteChanges = 1;
          return { success: true, meta: { changes: 1 } };
        }
        if (is(sql, D1_SQL.insertHistory)) {
          if (control.failHistoryInsert) {
            throw new Error('history insert failed');
          }
          const [eventJson, createdAt] = args;
          history.push({ id: history.length + 1, eventJson, createdAt });
          lastWriteChanges = 1;
          return { success: true, meta: { changes: 1 } };
        }
        if (is(sql, D1_SQL.insertHistoryIfLastWriteChanged)) {
          if (control.failHistoryInsert) {
            throw new Error('history insert failed');
          }
          if (lastWriteChanges > 0) {
            const [eventJson, createdAt] = args;
            history.push({ id: history.length + 1, eventJson, createdAt });
            lastWriteChanges = 1;
            return { success: true, meta: { changes: 1 } };
          }
          lastWriteChanges = 0;
          return { success: true, meta: { changes: 0 } };
        }
        if (is(sql, D1_SQL.upsertActiveRelease)) {
          const [activeReleaseId] = args;
          state.activeReleaseId = activeReleaseId;
          lastWriteChanges = 1;
          return { success: true, meta: { changes: 1 } };
        }
        if (is(sql, D1_SQL.upsertActiveReleaseIfNone)) {
          const [activeReleaseId] = args;
          if (state.activeReleaseId == null) {
            state.activeReleaseId = activeReleaseId;
            lastWriteChanges = 1;
            return { success: true, meta: { changes: 1 } };
          }
          lastWriteChanges = 0;
          return { success: true, meta: { changes: 0 } };
        }
        if (is(sql, D1_SQL.upsertUser)) {
          const [id, username, userJson] = args;
          usersById.set(id, userJson);
          userIdByUsername.set(username, id);
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertRefreshToken)) {
          const [token, userId] = args;
          refreshTokens.set(token, userId);
          return { success: true };
        }
        if (is(sql, D1_SQL.deleteRefreshToken)) {
          const [token] = args;
          refreshTokens.delete(token);
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertDocument)) {
          const [id, documentJson, updatedAt] = args;
          documents.set(id, { id, documentJson, updatedAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertRevision)) {
          const [id, documentId, revisionJson, createdAt] = args;
          revisions.set(id, { id, documentId, revisionJson, createdAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertMedia)) {
          const [id, mediaJson, updatedAt] = args;
          media.set(id, { id, mediaJson, updatedAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.deleteMediaById)) {
          const [id] = args;
          media.delete(id);
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertPublishJob)) {
          const [id, publishJobJson, updatedAt] = args;
          publishJobs.set(id, { id, publishJobJson, updatedAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertFormSubmission)) {
          const [id, formId, submissionJson, createdAt] = args;
          forms.set(id, { id, formId, submissionJson, createdAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertPreview)) {
          const [previewToken, previewJson, expiresAt] = args;
          previews.set(previewToken, { previewToken, previewJson, expiresAt });
          return { success: true };
        }
        lastWriteChanges = 1;
        return { success: true, meta: { changes: 1 } };
      },
      async first() {
        if (is(sql, D1_SQL.selectManifestId)) {
          const [releaseId] = args;
          const row = manifests.get(releaseId);
          return row ? { release_id: row.releaseId } : null;
        }
        if (is(sql, D1_SQL.selectManifestById)) {
          const [releaseId] = args;
          const row = manifests.get(releaseId);
          return row ? { manifest_json: row.manifestJson } : null;
        }
        if (is(sql, D1_SQL.selectActiveRelease)) {
          return state.activeReleaseId ? { active_release_id: state.activeReleaseId } : null;
        }
        if (is(sql, D1_SQL.selectUserById)) {
          const [id] = args;
          const userJson = usersById.get(id);
          return userJson ? { user_json: userJson } : null;
        }
        if (is(sql, D1_SQL.selectUserByUsername)) {
          const [username] = args;
          const userId = userIdByUsername.get(username);
          const userJson = userId ? usersById.get(userId) : null;
          return userJson ? { user_json: userJson } : null;
        }
        if (is(sql, D1_SQL.selectRefreshTokenUser)) {
          const [token] = args;
          const userId = refreshTokens.get(token);
          return userId ? { user_id: userId } : null;
        }
        if (is(sql, D1_SQL.selectDocumentById)) {
          const [id] = args;
          const doc = documents.get(id);
          return doc ? { document_json: doc.documentJson } : null;
        }
        if (is(sql, D1_SQL.selectRevisionById)) {
          const [id] = args;
          const rev = revisions.get(id);
          return rev ? { revision_json: rev.revisionJson } : null;
        }
        if (is(sql, D1_SQL.selectMediaById)) {
          const [id] = args;
          const entry = media.get(id);
          return entry ? { media_json: entry.mediaJson } : null;
        }
        if (is(sql, D1_SQL.selectPublishJobById)) {
          const [id] = args;
          const entry = publishJobs.get(id);
          return entry ? { publish_job_json: entry.publishJobJson } : null;
        }
        if (is(sql, D1_SQL.selectPreviewByToken)) {
          const [token] = args;
          const entry = previews.get(token);
          return entry ? { preview_json: entry.previewJson } : null;
        }
        return null;
      },
      async all() {
        if (is(sql, D1_SQL.selectAllManifests)) {
          return {
            results: Array.from(manifests.values())
              .sort((a, b) => {
                const aManifest = String(a.manifestCreatedAt);
                const bManifest = String(b.manifestCreatedAt);
                if (aManifest !== bManifest) return aManifest.localeCompare(bManifest);
                const aCreated = String(a.createdAt);
                const bCreated = String(b.createdAt);
                if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
                return String(a.releaseId).localeCompare(String(b.releaseId));
              })
              .map((entry) => ({ manifest_json: entry.manifestJson }))
          };
        }
        if (is(sql, D1_SQL.selectHistory)) {
          return {
            results: history
              .slice()
              .sort((a, b) => a.id - b.id)
              .map((entry) => ({ event_json: entry.eventJson }))
          };
        }
        if (is(sql, D1_SQL.selectDocuments)) {
          return {
            results: Array.from(documents.values())
              .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)))
              .map((entry) => ({ document_json: entry.documentJson }))
          };
        }
        if (is(sql, D1_SQL.selectRevisionsByDocument)) {
          const [documentId] = args;
          return {
            results: Array.from(revisions.values())
              .filter((entry) => entry.documentId === documentId)
              .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
              .map((entry) => ({ revision_json: entry.revisionJson }))
          };
        }
        if (is(sql, D1_SQL.selectMedia)) {
          return {
            results: Array.from(media.values())
              .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
              .map((entry) => ({ media_json: entry.mediaJson }))
          };
        }
        return { results: [] };
      }
    };
  }

  return {
    __control: control,
    async exec(sql) {
      control.execCalls.push(sql);
    },
    prepare(sql) {
      return {
        ...createBound(sql, []),
        bind(...args) {
          return createBound(sql, args);
        }
      };
    },
    async batch(statements) {
      control.batchCalls += 1;
      const snapshot = takeSnapshot();
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        return results;
      } catch (error) {
        restoreSnapshot(snapshot);
        throw error;
      }
    }
  };
}
