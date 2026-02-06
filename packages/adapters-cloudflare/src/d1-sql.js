export const D1_SQL = {
  createReleaseManifests:
    'CREATE TABLE IF NOT EXISTS release_manifests (release_id TEXT PRIMARY KEY, manifest_json TEXT NOT NULL, manifest_created_at TEXT NOT NULL, created_at TEXT NOT NULL)',
  createReleaseState:
    'CREATE TABLE IF NOT EXISTS release_state (id INTEGER PRIMARY KEY CHECK(id = 1), active_release_id TEXT)',
  createReleaseHistory:
    'CREATE TABLE IF NOT EXISTS release_history (id INTEGER PRIMARY KEY AUTOINCREMENT, event_json TEXT NOT NULL, created_at TEXT NOT NULL)',
  insertHistory: 'INSERT INTO release_history (event_json, created_at) VALUES (?, ?)',
  selectManifestId: 'SELECT release_id FROM release_manifests WHERE release_id = ?',
  selectManifestById: 'SELECT manifest_json FROM release_manifests WHERE release_id = ?',
  selectAllManifests:
    'SELECT manifest_json FROM release_manifests ORDER BY manifest_created_at ASC, created_at ASC, release_id ASC',
  insertManifest: 'INSERT INTO release_manifests (release_id, manifest_json, manifest_created_at, created_at) VALUES (?, ?, ?, ?)',
  selectActiveRelease: 'SELECT active_release_id FROM release_state WHERE id = 1',
  upsertActiveRelease:
    'INSERT INTO release_state (id, active_release_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET active_release_id = excluded.active_release_id',
  selectHistory: 'SELECT event_json FROM release_history ORDER BY id ASC',
  createAppUsers:
    'CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, user_json TEXT NOT NULL)',
  createAppRefreshTokens:
    'CREATE TABLE IF NOT EXISTS app_refresh_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL)',
  createAppDocuments:
    'CREATE TABLE IF NOT EXISTS app_documents (id TEXT PRIMARY KEY, document_json TEXT NOT NULL, updated_at TEXT NOT NULL)',
  createAppRevisions:
    'CREATE TABLE IF NOT EXISTS app_revisions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, revision_json TEXT NOT NULL, created_at TEXT NOT NULL)',
  createAppMedia:
    'CREATE TABLE IF NOT EXISTS app_media (id TEXT PRIMARY KEY, media_json TEXT NOT NULL, updated_at TEXT NOT NULL)',
  createAppPublishJobs:
    'CREATE TABLE IF NOT EXISTS app_publish_jobs (id TEXT PRIMARY KEY, publish_job_json TEXT NOT NULL, updated_at TEXT NOT NULL)',
  createAppFormSubmissions:
    'CREATE TABLE IF NOT EXISTS app_form_submissions (id TEXT PRIMARY KEY, form_id TEXT NOT NULL, submission_json TEXT NOT NULL, created_at TEXT NOT NULL)',
  createAppPreviews:
    'CREATE TABLE IF NOT EXISTS app_previews (preview_token TEXT PRIMARY KEY, preview_json TEXT NOT NULL, expires_at TEXT NOT NULL)',
  createAppNavigationMenus:
    'CREATE TABLE IF NOT EXISTS app_navigation_menus (key TEXT PRIMARY KEY, menu_json TEXT NOT NULL, updated_at TEXT NOT NULL)',
  createIdxRevisionsDocument: 'CREATE INDEX IF NOT EXISTS idx_app_revisions_document ON app_revisions(document_id, created_at)',
  createIdxFormsFormId: 'CREATE INDEX IF NOT EXISTS idx_app_forms_form_id ON app_form_submissions(form_id, created_at)',
  createIdxPreviewsExpiresAt: 'CREATE INDEX IF NOT EXISTS idx_app_previews_expires_at ON app_previews(expires_at)',
  createIdxNavigationMenusUpdatedAt: 'CREATE INDEX IF NOT EXISTS idx_app_navigation_menus_updated_at ON app_navigation_menus(updated_at)',
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
  deleteDocumentById: 'DELETE FROM app_documents WHERE id = ?',
  upsertDocument:
    'INSERT INTO app_documents (id, document_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET document_json = excluded.document_json, updated_at = excluded.updated_at',
  selectRevisionsByDocument: 'SELECT revision_json FROM app_revisions WHERE document_id = ? ORDER BY created_at ASC',
  deleteRevisionsByDocument: 'DELETE FROM app_revisions WHERE document_id = ?',
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
    'INSERT INTO app_previews (preview_token, preview_json, expires_at) VALUES (?, ?, ?) ON CONFLICT(preview_token) DO UPDATE SET preview_json = excluded.preview_json, expires_at = excluded.expires_at',
  selectNavigationMenus: 'SELECT menu_json FROM app_navigation_menus ORDER BY updated_at ASC',
  selectNavigationMenuByKey: 'SELECT menu_json FROM app_navigation_menus WHERE key = ?',
  upsertNavigationMenu:
    'INSERT INTO app_navigation_menus (key, menu_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET menu_json = excluded.menu_json, updated_at = excluded.updated_at'
};
