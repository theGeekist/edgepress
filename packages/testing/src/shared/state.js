export function createInMemoryState() {
  return {
    users: new Map(),
    refreshTokens: new Map(),
    documents: new Map(),
    revisions: new Map(),
    revisionsByDoc: new Map(),
    media: new Map(),
    publishJobs: new Map(),
    releases: new Map(),
    releaseHistory: [],
    activeRelease: null,
    blobs: new Map(),
    cache: new Map(),
    previews: new Map(),
    forms: new Map(),
    navigationMenus: new Map(),
    contentTypes: new Map(),
    taxonomies: new Map(),
    terms: new Map(),
    rateLimitHits: new Map()
  };
}
