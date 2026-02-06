import { BLOCKS_SCHEMA_VERSION, normalizeBlocksInput, normalizePublishProvenanceInput } from '../../../packages/domain/src/index.js';
import { error } from './http.js';

export function normalizePublishProvenance(body) {
  try {
    return normalizePublishProvenanceInput(body);
  } catch (e) {
    if (typeof e?.message === 'string' && e.message.startsWith('sourceRevisionSet')) {
      return { error: error('PUBLISH_INVALID_SOURCE_SET', e.message, 400) };
    }
    return { error: error('PUBLISH_INVALID_SOURCE_SET', 'Invalid publish provenance payload', 400) };
  }
}

export function normalizeBlocksForWrite(rawBlocks, fallbackBlocks = []) {
  try {
    const blocks = normalizeBlocksInput(rawBlocks === undefined ? fallbackBlocks : rawBlocks);
    return {
      blocks,
      blocksSchemaVersion: BLOCKS_SCHEMA_VERSION
    };
  } catch (e) {
    return {
      error: error(
        'BLOCKS_INVALID',
        e?.message || 'Invalid blocks payload',
        400
      )
    };
  }
}
