import { init as initParagraph } from '@wordpress/block-library/build-module/paragraph/index.mjs';
import { init as initImage } from '@wordpress/block-library/build-module/image/index.mjs';
import { init as initEmbed } from '@wordpress/block-library/build-module/embed/index.mjs';
import { init as initHeading } from '@wordpress/block-library/build-module/heading/index.mjs';
import { init as initQuote } from '@wordpress/block-library/build-module/quote/index.mjs';
import { init as initSeparator } from '@wordpress/block-library/build-module/separator/index.mjs';
import { init as initSpacer } from '@wordpress/block-library/build-module/spacer/index.mjs';
import { init as initGroup } from '@wordpress/block-library/build-module/group/index.mjs';
import { init as initColumns } from '@wordpress/block-library/build-module/columns/index.mjs';
import { init as initColumn } from '@wordpress/block-library/build-module/column/index.mjs';
import { getBlockVariations, registerBlockVariation, unregisterBlockVariation } from '@wordpress/blocks';

const REGISTERED_KEY = '__edgepress_foundational_blocks_registered__';
const EMBED_VARIATION_NAMESPACE = 'ep/embed';
const ALLOWED_EMBED_VARIATIONS = new Set([
  `${EMBED_VARIATION_NAMESPACE}-x`,
  `${EMBED_VARIATION_NAMESPACE}-youtube`,
  `${EMBED_VARIATION_NAMESPACE}-wordpress`
]);

function pruneBlockVariations(blockName, allowlist = new Set()) {
  const variations = getBlockVariations(blockName) || [];
  for (const variation of variations) {
    const name = String(variation?.name || '');
    if (!name) continue;
    if (allowlist.has(name)) continue;
    unregisterBlockVariation(blockName, name);
  }
}

function registerEmbedVariations() {
  registerBlockVariation('core/embed', {
    name: `${EMBED_VARIATION_NAMESPACE}-youtube`,
    title: 'YouTube Embed',
    description: 'Embed a YouTube video.',
    icon: 'video-alt3',
    attributes: {
      providerNameSlug: 'youtube',
      type: 'video'
    },
    keywords: ['youtube', 'video', 'embed'],
    scope: ['inserter', 'transform']
  });

  registerBlockVariation('core/embed', {
    name: `${EMBED_VARIATION_NAMESPACE}-wordpress`,
    title: 'WordPress Embed',
    description: 'Embed a WordPress post or page.',
    icon: 'wordpress',
    attributes: {
      providerNameSlug: 'wordpress',
      type: 'rich'
    },
    keywords: ['wordpress', 'site', 'embed'],
    scope: ['inserter', 'transform']
  });

  registerBlockVariation('core/embed', {
    name: `${EMBED_VARIATION_NAMESPACE}-x`,
    title: 'X Embed',
    description: 'Embed a post from X (Twitter).',
    icon: 'twitter',
    attributes: {
      providerNameSlug: 'twitter',
      type: 'rich'
    },
    keywords: ['x', 'twitter', 'embed'],
    scope: ['inserter', 'transform']
  });
}

export function registerFoundationalBlocks() {
  if (globalThis[REGISTERED_KEY]) return;
  globalThis[REGISTERED_KEY] = true;
  try {
    initParagraph();
    initImage();
    initEmbed();
    initHeading();
    initQuote();
    initSeparator();
    initSpacer();
    initGroup();
    initColumns();
    initColumn();
    // Keep Group as a single entry (hide Row/Stack/Grid presets in inserter).
    pruneBlockVariations('core/group', new Set());
    // Keep only our curated embed variations.
    pruneBlockVariations('core/embed', new Set());
    registerEmbedVariations();
    pruneBlockVariations('core/embed', ALLOWED_EMBED_VARIATIONS);
  } catch (error) {
    // Allow retry on next call if registration failed part-way.
    globalThis[REGISTERED_KEY] = false;
    throw error;
  }
}
