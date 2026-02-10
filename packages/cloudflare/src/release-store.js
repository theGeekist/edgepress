export function createReleaseStore({
  d1,
  kv,
  runtime,
  blobStore,
  baseReleaseStore,
  kvGetJson,
  kvPutJson,
  parseJsonSafe,
  D1_SQL
}) {
  const releasePrefix = 'release:';
  const releasePointerKey = `${releasePrefix}active`;
  const releaseHistoryKey = `${releasePrefix}history`;

  function manifestKey(releaseId) {
    return `${releasePrefix}manifest:${releaseId}`;
  }

  async function kvKeys() {
    if (typeof kv?.list === 'function') {
      const collected = [];
      let cursor;
      do {
        const page = await kv.list({
          prefix: `${releasePrefix}manifest:`,
          cursor
        });
        for (const item of page.keys || []) {
          collected.push(item.name);
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return collected;
    }
    if (kv?.__keys && Array.isArray(kv.__keys)) {
      return kv.__keys.slice();
    }
    return [];
  }

  async function kvListManifests() {
    if (!kv?.get) return null;
    const releases = [];
    for (const key of await kvKeys()) {
      if (!key.startsWith(`${releasePrefix}manifest:`)) continue;
      const manifest = await kvGetJson(key);
      if (manifest) releases.push(manifest);
    }
    return releases;
  }

  let d1SchemaReady = false;
  const releaseState = {
    manifests: new Map(),
    history: [],
    activeRelease: null
  };

  async function ensureD1ReleaseSchema() {
    if (!d1 || d1SchemaReady) return;
    await d1.exec(D1_SQL.createReleaseManifests);
    await d1.exec(D1_SQL.createReleaseState);
    await d1.exec(D1_SQL.createReleaseHistory);
    try {
      await d1.exec('ALTER TABLE release_manifests ADD COLUMN manifest_created_at TEXT');
    } catch {
      // Existing deployments may already have this column.
    }
    try {
      await d1.exec(
        "UPDATE release_manifests SET manifest_created_at = COALESCE(json_extract(manifest_json, '$.createdAt'), created_at) WHERE manifest_created_at IS NULL"
      );
    } catch {
      // Ignore backfill errors for empty/legacy tables in reference adapter mode.
    }
    d1SchemaReady = true;
  }

  async function runD1Atomic(statements, eventLabel) {
    if (!d1) return;
    if (typeof d1.batch === 'function') {
      await d1.batch(statements);
      return;
    }
    runtime.log('warn', 'd1_non_atomic_fallback', { event: eventLabel });
    for (const statement of statements) {
      await statement.run();
    }
  }

  async function appendReleaseHistory(event) {
    if (d1) {
      await ensureD1ReleaseSchema();
      await d1
        .prepare(D1_SQL.insertHistory)
        .bind(JSON.stringify(event), event.at || runtime.now().toISOString())
        .run();
      return;
    }
    if (kv?.get && kv?.put) {
      const history = (await kvGetJson(releaseHistoryKey)) || [];
      history.push(event);
      await kvPutJson(releaseHistoryKey, history);
      return;
    }
    releaseState.history.push(event);
  }

  async function hasManifest(releaseId) {
    if (d1) {
      await ensureD1ReleaseSchema();
      const row = await d1.prepare(D1_SQL.selectManifestId).bind(releaseId).first();
      return Boolean(row?.release_id);
    }
    if (kv?.get) {
      return Boolean(await kv.get(manifestKey(releaseId)));
    }
    return releaseState.manifests.has(releaseId);
  }

  async function getActiveReleaseInternal() {
    if (d1) {
      await ensureD1ReleaseSchema();
      const row = await d1.prepare(D1_SQL.selectActiveRelease).first();
      return row?.active_release_id || null;
    }
    if (kv?.get) {
      return (await kv.get(releasePointerKey)) || null;
    }
    return releaseState.activeRelease;
  }

  if (!d1 && !kv?.get && !kv?.put) {
    return baseReleaseStore;
  }

  return {
    async writeArtifact(releaseId, route, bytes, contentType = 'text/html') {
      const path = `${releaseId}/${route}.html`;
      await blobStore.putBlob(path, bytes, { contentType });
      await appendReleaseHistory({
        type: 'artifact_written',
        releaseId,
        route,
        path,
        at: runtime.now().toISOString()
      });
      return { releaseId, route, path, contentType };
    },
    async writeManifest(releaseId, manifest) {
      if (d1) {
        await ensureD1ReleaseSchema();
        const manifestWrittenAt = runtime.now().toISOString();
        const manifestCreatedAt = manifest?.createdAt || manifestWrittenAt;
        const event = {
          type: 'manifest_written',
          releaseId,
          at: manifestWrittenAt
        };
        try {
          const insertManifest = d1
            .prepare(D1_SQL.insertManifest)
            .bind(releaseId, JSON.stringify(manifest), manifestCreatedAt, manifestWrittenAt);
          const insertHistory = d1
            .prepare(D1_SQL.insertHistory)
            .bind(JSON.stringify(event), manifestWrittenAt);
          await runD1Atomic([insertManifest, insertHistory], 'write_manifest');
        } catch (error) {
          if (await hasManifest(releaseId)) {
            throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
          }
          throw error;
        }
      } else if (await hasManifest(releaseId)) {
        throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
      } else if (kv?.put) {
        await kvPutJson(manifestKey(releaseId), manifest);
      } else {
        releaseState.manifests.set(releaseId, manifest);
      }
      if (!d1) {
        await appendReleaseHistory({
          type: 'manifest_written',
          releaseId,
          at: runtime.now().toISOString()
        });
      }
    },
    async getManifest(releaseId) {
      if (d1) {
        await ensureD1ReleaseSchema();
        const row = await d1.prepare(D1_SQL.selectManifestById).bind(releaseId).first();
        return parseJsonSafe(row?.manifest_json);
      }
      if (kv?.get) {
        return kvGetJson(manifestKey(releaseId));
      }
      return releaseState.manifests.get(releaseId) || null;
    },
    async listReleases() {
      if (d1) {
        await ensureD1ReleaseSchema();
        const rows = await d1.prepare(D1_SQL.selectAllManifests).all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.manifest_json)).filter(Boolean);
      }
      const manifests = await kvListManifests();
      if (manifests) return manifests;
      return Array.from(releaseState.manifests.values());
    },
    async activateRelease(releaseId) {
      if (!(await hasManifest(releaseId))) {
        throw new Error('Unknown releaseId');
      }
      const previousReleaseId = await getActiveReleaseInternal();
      if (previousReleaseId === releaseId) {
        return previousReleaseId;
      }
      if (d1) {
        await ensureD1ReleaseSchema();
        const activatedAt = runtime.now().toISOString();
        const event = {
          type: 'activated',
          releaseId,
          previousReleaseId,
          at: activatedAt
        };
        const upsertState = d1.prepare(D1_SQL.upsertActiveRelease).bind(releaseId);
        const insertHistory = d1
          .prepare(D1_SQL.insertHistory)
          .bind(JSON.stringify(event), activatedAt);
        await runD1Atomic([upsertState, insertHistory], 'activate_release');
      } else if (kv?.put) {
        await kv.put(releasePointerKey, releaseId);
      } else {
        releaseState.activeRelease = releaseId;
      }
      if (!d1) {
        await appendReleaseHistory({
          type: 'activated',
          releaseId,
          previousReleaseId,
          at: runtime.now().toISOString()
        });
      }
      return releaseId;
    },
    async getActiveRelease() {
      return getActiveReleaseInternal();
    },
    async getReleaseHistory() {
      if (d1) {
        await ensureD1ReleaseSchema();
        const rows = await d1.prepare(D1_SQL.selectHistory).all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.event_json)).filter(Boolean);
      }
      if (kv?.get) {
        return (await kvGetJson(releaseHistoryKey)) || [];
      }
      return releaseState.history.slice();
    }
  };
}
