import { useEffect, useMemo, useRef, useState } from 'react';
import { registerCoreBlocks } from '@wordpress/block-library';
import apiFetch from '@wordpress/api-fetch';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { createAdminShell } from '../editor-shell.js';
import { configureApiFetch } from '../gutenberg-integration.js';
import { useThemeMode } from './theme.js';
import { ActionButton } from '../components/ui/ActionButton.jsx';
import { ThemedTextInput } from '../components/ui/ThemedTextInput.jsx';
import { useAuthState } from '../features/auth/useAuthState.js';
import { useDocumentsState } from '../features/documents/useDocumentsState.js';
import { useEditorState } from '../features/editor/useEditorState.js';
import { EditorCanvas } from '../features/editor/EditorCanvas.jsx';

registerCoreBlocks();

export function App() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const shell = useMemo(() => createAdminShell({ baseUrl: apiBase || '' }), [apiBase]);
  const configuredApiFetchRef = useRef(null);
  const { palette, mode, setMode } = useThemeMode();

  const auth = useAuthState(shell);
  const docs = useDocumentsState(shell);
  const editor = useEditorState(shell);

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const configKey = apiBase || '(same-origin)';
    if (configuredApiFetchRef.current === configKey) {
      return;
    }
    configuredApiFetchRef.current = configKey;

    configureApiFetch(apiFetch, {
      getAccessToken: () => shell.session.accessToken,
      refresh: () => shell.refreshSession(),
      apiRoot: apiBase || undefined
    });
  }, [apiBase, shell]);

  async function refreshAndSelectFirst() {
    const items = await docs.refresh();
    if (!docs.selectedId && items[0]) {
      editor.openDocument(items[0], docs.setSelectedId, docs.setTitle);
    }
  }

  async function onLogin() {
    setError('');
    setStatus('Signing in...');
    try {
      const account = await auth.login();
      await refreshAndSelectFirst();
      setStatus(`Signed in as ${account.username}`);
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  }

  async function onCreate() {
    setError('');
    setStatus('Creating draft...');
    try {
      const created = await docs.createDraft();
      editor.openDocument(created, docs.setSelectedId, docs.setTitle);
      setStatus('Draft created');
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  }

  async function onSave() {
    if (!docs.selectedId) return;
    setError('');
    setStatus('Saving...');
    try {
      const updated = await editor.saveDocument(docs.selectedId, docs.title);
      await docs.refresh();
      if (updated) {
        editor.openDocument(updated, docs.setSelectedId, docs.setTitle);
      }
      setStatus('Saved');
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  }

  async function onLogout() {
    await auth.logout();
    docs.setSelectedId(null);
    docs.setTitle('');
    editor.setBlocks([]);
    setStatus('Signed out');
    setError('');
  }

  if (!auth.user) {
    return (
      <View style={[styles.page, { backgroundColor: palette.page }]}>
        <View style={[styles.loginCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.h1, { color: palette.text }]}>GCMS Admin</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>Sign in to use the canonical SDK-backed editor shell.</Text>
          <View style={styles.loginRow}>
            <ThemedTextInput
              palette={palette}
              value={auth.username}
              onChangeText={auth.setUsername}
              placeholder="username"
            />
            <ThemedTextInput
              palette={palette}
              value={auth.password}
              onChangeText={auth.setPassword}
              placeholder="password"
              secureTextEntry
            />
            <ActionButton label="Sign In" onPress={onLogin} palette={palette} />
          </View>
          {status ? <Text style={[styles.status, { color: palette.textMuted }]}>{status}</Text> : null}
          {error ? <Text style={[styles.error, { color: palette.error }]}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: palette.page }]}>
      <View style={[styles.topbar, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.topbarText, { color: palette.text }]}>GCMS Admin: {auth.user.username}</Text>
        <View style={styles.topbarActions}>
          <ActionButton label="New Draft" onPress={onCreate} palette={palette} />
          <ActionButton label="Save" onPress={onSave} disabled={!docs.selectedId} palette={palette} />
          <ActionButton label={`Theme: ${mode}`} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} palette={palette} />
          <ActionButton label="Log Out" onPress={onLogout} palette={palette} />
        </View>
      </View>

      <View style={[styles.workspace, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <View style={[styles.sidebar, { borderRightColor: palette.borderSoft }]}> 
          <Text style={[styles.h2, { color: palette.text }]}>Documents</Text>
          <ScrollView>
            {docs.docs.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <ActionButton
                  label={doc.title || 'Untitled'}
                  onPress={() => editor.openDocument(doc, docs.setSelectedId, docs.setTitle)}
                  active={doc.id === docs.selectedId}
                  palette={palette}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.editorPane}>
          <ThemedTextInput
            palette={palette}
            value={docs.title}
            onChangeText={docs.setTitle}
            placeholder="Document title"
            editable={Boolean(docs.selectedId)}
          />
          <View style={[styles.canvasWrap, { borderColor: palette.border }]}> 
            <EditorCanvas blocks={editor.blocks} setBlocks={editor.setBlocks} />
          </View>
          {status ? <Text style={[styles.status, { color: palette.textMuted }]}>{status}</Text> : null}
          {error ? <Text style={[styles.error, { color: palette.error }]}>{error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    minHeight: '100vh',
    padding: 16,
    fontFamily: 'IBM Plex Sans, Helvetica Neue, Arial, sans-serif'
  },
  loginCard: {
    maxWidth: 760,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignSelf: 'center'
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  hint: {
    marginBottom: 12
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12
  },
  topbarText: {
    fontSize: 17,
    fontWeight: '600'
  },
  topbarActions: {
    flexDirection: 'row',
    gap: 8
  },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center'
  },
  workspace: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 700
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingRight: 12
  },
  docRow: {
    marginBottom: 8
  },
  editorPane: {
    flex: 1,
    gap: 8
  },
  canvasWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 560
  },
  status: {
    fontSize: 13
  },
  error: {
    fontSize: 13
  }
});
