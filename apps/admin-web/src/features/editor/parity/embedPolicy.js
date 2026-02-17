export const EMBED_POLICY_SCHEMA_VERSION = 1;

const PROVIDER_HOST_PATTERNS = [
  { slug: 'youtube', hostPattern: /(^|\.)youtube\.com$/i },
  { slug: 'youtube', hostPattern: /(^|\.)youtu\.be$/i },
  { slug: 'vimeo', hostPattern: /(^|\.)vimeo\.com$/i },
  { slug: 'twitter', hostPattern: /(^|\.)twitter\.com$/i },
  { slug: 'twitter', hostPattern: /(^|\.)x\.com$/i },
  { slug: 'wordpress', hostPattern: /(^|\.)wordpress\.com$/i },
  { slug: 'soundcloud', hostPattern: /(^|\.)soundcloud\.com$/i },
  { slug: 'spotify', hostPattern: /(^|\.)spotify\.com$/i },
  { slug: 'tiktok', hostPattern: /(^|\.)tiktok\.com$/i }
];

function normalizeProviderSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function detectProviderFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.trim().toLowerCase();
    for (const provider of PROVIDER_HOST_PATTERNS) {
      if (provider.hostPattern.test(hostname)) {
        return provider.slug;
      }
    }
  } catch {
    return '';
  }
  return '';
}

function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return { url: '', valid: false, code: 'EMBED_URL_MISSING', message: 'Embed URL is required.' };
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        url: '',
        valid: false,
        code: 'EMBED_URL_INVALID_PROTOCOL',
        message: 'Embed URL must use http or https.'
      };
    }
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    return { url: parsed.toString(), valid: true, code: '', message: '' };
  } catch {
    return { url: '', valid: false, code: 'EMBED_URL_INVALID', message: 'Embed URL is not a valid URL.' };
  }
}

export function evaluateEmbedPolicy({ url, providerNameSlug }) {
  const normalizedProvider = normalizeProviderSlug(providerNameSlug);
  const normalizedUrl = normalizeUrl(url);
  const issues = [];

  if (!normalizedUrl.valid) {
    issues.push({
      status: 'partial',
      code: normalizedUrl.code,
      message: normalizedUrl.message
    });
    return {
      url: '',
      providerNameSlug: normalizedProvider,
      allowed: false,
      issues,
      policyVersion: EMBED_POLICY_SCHEMA_VERSION
    };
  }

  const detectedProvider = detectProviderFromUrl(normalizedUrl.url);
  const provider = normalizeProviderSlug(normalizedProvider || detectedProvider);
  if (!provider) {
    issues.push({
      status: 'partial',
      code: 'EMBED_PROVIDER_UNSUPPORTED',
      message: 'Embed provider is not supported by policy.'
    });
    return {
      url: '',
      providerNameSlug: '',
      allowed: false,
      issues,
      policyVersion: EMBED_POLICY_SCHEMA_VERSION
    };
  }

  return {
    url: normalizedUrl.url,
    providerNameSlug: provider,
    allowed: true,
    issues,
    policyVersion: EMBED_POLICY_SCHEMA_VERSION
  };
}
