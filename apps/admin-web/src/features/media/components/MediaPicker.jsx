import { Pressable, Text, View, Image } from 'react-native';
import { useState, useRef } from 'react';
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

export function MediaPicker({ palette, value, items, disabled, onChange, onRefresh, onUpload, isUploading, maxVisible = 8 }) {
  const mediaItems = Array.isArray(items) ? items : [];
  const selected = mediaItems.find((item) => item.id === value) || null;
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const filterImageFiles = (files) => {
    return Array.from(files || []).filter((file) => {
      const mime = String(file?.type || '').toLowerCase();
      return mime.startsWith('image/');
    });
  };

  const handleUpload = (files) => {
    const imageFiles = filterImageFiles(files);
    if (onUpload && imageFiles.length > 0) {
      onUpload(imageFiles);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files);
            e.target.value = '';
          }
        }}
        multiple
        accept="image/*"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          {selected ? `Selected: ${selected.id}` : 'No featured image selected'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton
            label={isUploading ? 'Uploading...' : 'Upload'}
            onPress={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            palette={palette}
          />
          <ActionButton
            label="Refresh"
            onPress={onRefresh}
            disabled={disabled || isUploading}
            palette={palette}
          />
          <ActionButton
            label="Clear"
            onPress={() => onChange('')}
            disabled={disabled || !value || isUploading}
            palette={palette}
          />
        </View>
      </View>

      <View
        onDragOver={(e) => {
          if (disabled || isUploading) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (disabled || isUploading) return;
          e.preventDefault();
          setIsDragging(false);
          const files = e.dataTransfer.files;
          if (files && files.length > 0) {
            handleUpload(files);
          }
        }}
        style={{
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: isDragging ? palette.accent : 'transparent',
          borderRadius: 6,
          padding: 4,
          backgroundColor: isDragging ? `${palette.accent}0a` : 'transparent',
          minHeight: 100,
          justifyContent: 'center'
        }}
      >
        {mediaItems.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 8, padding: 20 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12, textAlign: 'center' }}>
              {isUploading ? 'Uploading...' : 'No media found. Drop files here or click Upload.'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {mediaItems.slice(0, Math.max(1, maxVisible)).map((item) => (
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
  onRefresh: PropTypes.func,
  onUpload: PropTypes.func,
  isUploading: PropTypes.bool,
  maxVisible: PropTypes.number
};

export const mediaPickerPropTypes = MediaPicker.propTypes;
