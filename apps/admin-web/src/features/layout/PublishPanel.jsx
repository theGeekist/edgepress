import { Text, View } from 'react-native';

import { ActionButton } from '../../components/ui/ActionButton.jsx';
import { MetaBox } from '../../components/ui/MetaBox.jsx';
import { layoutStyles } from './styles.js';

function shortReleaseId(releaseId) {
  if (!releaseId) {
    return 'None';
  }
  return releaseId.length > 12 ? `${releaseId.slice(0, 12)}...` : releaseId;
}

export function PublishPanel({ palette, hasSelection, loop, previewLink, actions }) {
  const isLive = Boolean(loop.activeRelease);

  function openPreview() {
    if (!previewLink?.url || typeof window === 'undefined') {
      return;
    }
    window.open(previewLink.url, '_blank', 'noopener,noreferrer');
  }

  const footer = (
    <View style={layoutStyles.publishActions}>
      <ActionButton label="Publish" onPress={actions.onPublish} disabled={!hasSelection} tone="primary" palette={palette} />
      {previewLink?.url ? <ActionButton label="View Page" onPress={openPreview} palette={palette} /> : null}
    </View>
  );

  return (
    <MetaBox title="Publishing" palette={palette} footer={footer}>
      <Text style={[style.metaText, { color: palette.textMuted }]}>Status: <Text style={{ fontWeight: '600', color: palette.text }}>{isLive ? 'Published' : 'Draft'}</Text></Text>
      <Text style={[style.metaText, { color: palette.textMuted }]}>Visibility: <Text style={{ fontWeight: '600', color: palette.text }}>Public</Text></Text>

      <View style={style.actionRow}>
        <ActionButton label="Save Draft" onPress={actions.onSave} disabled={!hasSelection} palette={palette} />
        <ActionButton label="Preview" onPress={actions.onPreview} disabled={!hasSelection} palette={palette} />
      </View>
    </MetaBox>
  );
}

const style = {
  metaText: {
    fontSize: 13,
    marginBottom: 4
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  }
};
