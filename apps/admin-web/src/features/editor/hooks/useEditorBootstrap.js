import { useEffect } from 'react';
import { registerFoundationalBlocks } from '../registerBlocks.js';
import { registerBootstrapPreload } from '../services/registerBootstrapPreload.js';

let coreBootstrapDone = false;

export function configureEditorBootstrap({ postType, postId, title, content }) {
  if (!coreBootstrapDone) {
    registerFoundationalBlocks();
    coreBootstrapDone = true;
  }

  return registerBootstrapPreload({ postType, postId, title, content });
}

export function useEditorBootstrap({ postType, postId, title, content }) {
  useEffect(() => {
    configureEditorBootstrap({ postType, postId, title, content });
  }, [postType, postId, title, content]);
}
