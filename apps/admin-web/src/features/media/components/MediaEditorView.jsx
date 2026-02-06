import { Image, Pressable, Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { layoutStyles } from '@components/styles.js';

function formatSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return 'n/a';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
}

function isImageMimeType(value) {
  return String(value || '').toLowerCase().startsWith('image/');
}

export function MediaEditorView({
  palette,
  media,
  item,
  currentIndex,
  totalItems,
  onBackToList,
  onSelectPrev,
  onSelectNext,
  onSaveSelected
}) {
  const saveHint = media.isSaving ? 'Saving...' : 'Saved';
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < totalItems - 1;
  const isImage = isImageMimeType(item.mimeType);

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 20 }}>
      <View style={layoutStyles.contentEditorPane}>
        <View style={layoutStyles.filterRow}>
          <ActionHint
            palette={palette}
            label="Back to media list"
            iconOnly
            iconLabel="←"
            onPress={onBackToList}
          />
          <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>|</Text>
          <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>{saveHint}</Text>
        </View>

        <View style={[layoutStyles.card, { borderColor: palette.border, backgroundColor: palette.surface, padding: 16, gap: 12 }]}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{item.filename || item.id}</Text>

          <View style={[layoutStyles.card, { borderColor: palette.borderSoft, backgroundColor: palette.surfaceMuted, padding: 12, minHeight: 320, justifyContent: 'center', alignItems: 'center' }]}>
            {isImage && item.url ? (
              <Image
                source={{ uri: item.url }}
                resizeMode="contain"
                style={{ width: '100%', height: 360, maxHeight: 420 }}
              />
            ) : (
              <Text style={{ color: palette.textMuted, fontSize: 14 }}>
                Preview unavailable for this file type
              </Text>
            )}
          </View>

          <Text style={{ color: palette.textMuted, fontSize: 13 }}>MIME type: {item.mimeType || 'n/a'}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>File size: {formatSize(item.size)}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>Updated: {formatDate(item.updatedAt)}</Text>
          {item.width && item.height ? (
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              Dimensions: {item.width} × {item.height}
            </Text>
          ) : null}
          {item.url ? (
            <ActionHint
              palette={palette}
              label="Open original file"
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                }
              }}
            />
          ) : null}
        </View>
      </View>

      <View style={[layoutStyles.publishRail, { borderLeftColor: palette.border, width: 320, minWidth: 320 }]}>
        <MetaBox title="Image Details" palette={palette}>
          <View style={{ gap: 10 }}>
            <ThemedTextInput
              palette={palette}
              value={media.alt}
              onChangeText={media.setAlt}
              placeholder="Alt text"
            />
            <ThemedTextInput
              palette={palette}
              value={media.caption}
              onChangeText={media.setCaption}
              placeholder="Caption"
            />
            <ThemedTextInput
              palette={palette}
              value={media.description}
              onChangeText={media.setDescription}
              placeholder="Description"
              multiline
              style={{ minHeight: 80 }}
            />
            <ActionButton
              label={media.isSaving ? 'Saving...' : 'Save Metadata'}
              tone="primary"
              onPress={onSaveSelected}
              disabled={media.isSaving}
              palette={palette}
            />
          </View>
        </MetaBox>

        <MetaBox title="Navigation" palette={palette}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionButton
              label="Previous"
              onPress={onSelectPrev}
              disabled={!canPrev}
              palette={palette}
            />
            <ActionButton
              label="Next"
              onPress={onSelectNext}
              disabled={!canNext}
              palette={palette}
            />
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Item {currentIndex + 1} of {totalItems}
          </Text>
        </MetaBox>
      </View>
    </View>
  );
}

function ActionHint({ palette, label, onPress, iconOnly = false, iconLabel = '' }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress}>
      <Text style={{ color: palette.accent, textDecorationLine: iconOnly ? 'none' : 'underline', fontSize: iconOnly ? 20 : 14 }}>
        {iconOnly ? iconLabel : label}
      </Text>
    </Pressable>
  );
}
