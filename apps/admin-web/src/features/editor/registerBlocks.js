import { init as initParagraph } from '@wordpress/block-library/build-module/paragraph/index.mjs';
import { init as initImage } from '@wordpress/block-library/build-module/image/index.mjs';
import { init as initEmbed } from '@wordpress/block-library/build-module/embed/index.mjs';

const REGISTERED_KEY = '__edgepress_foundational_blocks_registered__';

export function registerFoundationalBlocks() {
  if (globalThis[REGISTERED_KEY]) return;
  globalThis[REGISTERED_KEY] = true;
  try {
    initParagraph();
    initImage();
    initEmbed();
  } catch (error) {
    // Allow retry on next call if registration failed part-way.
    globalThis[REGISTERED_KEY] = false;
    throw error;
  }
}
