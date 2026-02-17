import { Pressable, Text, View, Image } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';
import { ActionButton } from '@components/ui/ActionButton.jsx';

function MediaOption({ item, isActive, onSelect, palette }) {
  return (
    <Pressable
      onPress={() => onSelect(item.id)}
      style={{
        borderWidth: 1,
        borderColor: isActive ? palette.accent : palette.border,
        borderRadius: 6,
        padding: 8,
        backgroundColor: isActive ? `${palette.accent}1f` : palette.surface,
        gap: 6,
        minWidth: 170
      }}
    >
      {item.url ? (
        <Image
          source={{ uri: item.url }}
          resizeMode="cover"
          style={{ width: '100%', height: 78, borderRadius: 4, backgroundColor: palette.surfaceMuted }}
        />
      ) : null}
      <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
        {item.filename || item.id}
      </Text>
      <Text style={{ color: palette.textMuted, fontSize: 11 }} numberOfLines={1}>
        {item.id}
      </Text>
    </Pressable>
  );
}

MediaOption.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    url: PropTypes.string,
    filename: PropTypes.string
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

export function MediaPicker({ palette, value, items, disabled, onChange, onRefresh }) {
  const mediaItems = Array.isArray(items) ? items : [];
  const selected = mediaItems.find((item) => item.id === value) || null;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          {selected ? `Selected: ${selected.id}` : 'No featured image selected'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton
            label="Refresh"
            onPress={onRefresh}
            disabled={disabled}
            palette={palette}
          />
          <ActionButton
            label="Clear"
            onPress={() => onChange('')}
            disabled={disabled || !value}
            palette={palette}
          />
        </View>
      </View>

      {mediaItems.length === 0 ? (
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          Upload media in the Media section, then return here to select it.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {mediaItems.slice(0, 8).map((item) => (
            <MediaOption
              key={item.id}
              item={item}
              isActive={item.id === value}
              onSelect={onChange}
              palette={palette}
            />
          ))}
        </View>
      )}
    </View>
  );
}

MediaPicker.propTypes = {
  palette: PropTypes.shape(palettePropTypes).isRequired,
  value: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    url: PropTypes.string,
    filename: PropTypes.string
  })),
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func
};
