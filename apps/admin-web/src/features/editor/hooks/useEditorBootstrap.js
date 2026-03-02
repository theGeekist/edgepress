import { useEffect, useRef } from 'react';
import { registerFoundationalBlocks } from '../registerBlocks.js';
import { registerBootstrapPreload } from '../services/registerBootstrapPreload.js';

let coreBootstrapDone = false;

export function configureEditorBootstrap({ postType, postId, title, content } = {}) {
  if (!coreBootstrapDone) {
    registerFoundationalBlocks();
    coreBootstrapDone = true;
  }

  return registerBootstrapPreload({ postType, postId, title, content });
}

export function useEditorBootstrap({ postType, postId, title, content } = {}) {
  const bootstrapSnapshotRef = useRef(null);
  const identity = `${String(postType || 'post')}:${String(postId || 'editor-local')}`;
  if (bootstrapSnapshotRef.current?.identity !== identity) {
    bootstrapSnapshotRef.current = {
      identity,
      title,
      content
    };
  }

  useEffect(() => {
    const snapshot = bootstrapSnapshotRef.current || {};
    configureEditorBootstrap({
      postType,
      postId,
      title: snapshot.title,
      content: snapshot.content
    });
  }, [postType, postId]);
}
