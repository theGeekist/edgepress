import { useCallback } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useSessionActions({ auth, docs, editor, loop, setStatus, setError, setPreviewLink, setSaveState, setNavigationMenu, loadedNavigationMenuKeyRef }) {
  const onLogin = useCallback(async () => {
    setError('');
    setPreviewLink(null);
    setStatus('Signing in...');
    try {
      const account = await auth.login();
      setStatus(`Signed in as ${account.username}`);
      return account;
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
      throw nextError;
    }
  }, [auth, setError, setPreviewLink, setStatus]);

  const onLogout = useCallback(async () => {
    try {
      await auth.logout();
    } catch (nextError) {
      setError(asErrorMessage(nextError));
    }
    docs.setSelectedId(null);
    docs.setTitle('');
    editor.setBlocks([]);
    loop.reset();
    docs.clearSelectedRows();
    setStatus('Signed out');
    setError('');
    setPreviewLink(null);
    setSaveState('idle');
    setNavigationMenu(null);
    loadedNavigationMenuKeyRef.current = null;
  }, [auth, docs, editor, loop, setStatus, setError, setPreviewLink, setSaveState, setNavigationMenu, loadedNavigationMenuKeyRef]);

  return {
    onLogin,
    onLogout
  };
}
