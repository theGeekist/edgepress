import { paragraphImportTransform, paragraphRenderers } from '../mappings/coreParagraph.js';
import { imageImportTransform, imageRenderers } from '../mappings/coreImage.js';
import { layoutImportTransform, layoutRenderers } from '../mappings/coreLayout.js';
import { contentImportTransform, contentRenderers } from '../mappings/coreContent.js';

export const corePackManifest = {
  name: 'ep-core',
  version: '1.0.0',
  supportedWpBlockNames: [
    'core/paragraph',
    'core/image',
    'core/group',
    'core/columns',
    'core/column',
    'core/row',
    'core/spacer',
    'core/heading',
    'core/quote',
    'core/separator',
    'core/embed'
  ],
  supportedSchemaVersions: [1]
};

export const corePackImportTransforms = [
  paragraphImportTransform,
  imageImportTransform,
  layoutImportTransform,
  contentImportTransform
];
export const corePackRenderers = [
  ...paragraphRenderers,
  ...imageRenderers,
  ...layoutRenderers,
  ...contentRenderers
];
