export function assertReleaseManifestImmutable(existingManifest) {
  if (existingManifest) {
    throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
  }
}

export function assertHasCapability(user, capability) {
  if (!user || !Array.isArray(user.capabilities) || !user.capabilities.includes(capability)) {
    throw new Error(`Missing capability: ${capability}`);
  }
}

export function assertPreviewNotExpired(preview, now) {
  if (!preview) {
    throw new Error('Preview session not found');
  }
  if (new Date(preview.expiresAt).getTime() <= new Date(now).getTime()) {
    throw new Error('Preview session expired');
  }
}
