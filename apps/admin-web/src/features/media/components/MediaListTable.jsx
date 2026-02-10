import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { DataTable } from '@components/ui/DataTable.jsx';
import { DropdownButton } from '@components/ui/DropdownButton.jsx';
import { FilterBar } from '@components/ui/FilterBar.jsx';
import { FilterTabs } from '@components/ui/FilterTabs.jsx';
import { SectionTopBar } from '@components/ui/SectionTopBar.jsx';
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

export function MediaListTable({ palette, media, onEditMedia, onUploadFiles, onDeleteMedia, onBulkDeleteMedia }) {
  const fileInputRef = useRef(null);
  const [selectedBulkAction, setSelectedBulkAction] = useState('none');

  function triggerUploadPicker() {
    if (fileInputRef.current && typeof fileInputRef.current.click === 'function') {
      fileInputRef.current.click();
    }
  }

  async function onFilesSelected(event) {
    const files = Array.from(event?.target?.files || []);
    if (files.length === 0) return;
    await onUploadFiles(files);
    if (event?.target) event.target.value = '';
  }

  const columns = [
    {
      key: 'select',
      label: '',
      width: 40,
      render: (item) => (
        <CheckboxCell
          palette={palette}
          checked={media.selectedRowIds.includes(item.id)}
          onPress={() => media.toggleRowSelection(item.id)}
        />
      )
    },
    {
      key: 'filename',
      label: 'File',
      width: '40%',
      render: (item) => (
        <View>
          <Pressable onPress={() => onEditMedia(item)}>
            <Text style={{ color: palette.accent, fontWeight: '600' }}>{item.filename || item.id}</Text>
          </Pressable>
          <View style={layoutStyles.tableRowActions}>
            <Pressable onPress={() => onEditMedia(item)}><Text style={{ fontSize: 12, color: palette.accent }}>Edit</Text></Pressable>
            <Text style={{ fontSize: 12, color: palette.border }}>|</Text>
            <Pressable onPress={() => onDeleteMedia(item)}><Text style={{ fontSize: 12, color: palette.error }}>Delete</Text></Pressable>
          </View>
        </View>
      )
    },
    {
      key: 'mimeType',
      label: 'MIME type',
      width: '25%',
      render: (item) => <Text style={{ color: palette.text }}>{item.mimeType || 'n/a'}</Text>
    },
    {
      key: 'size',
      label: 'Size',
      width: '15%',
      render: (item) => <Text style={{ color: palette.textMuted }}>{formatSize(item.size)}</Text>
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      width: '15%',
      render: (item) => <Text style={{ color: palette.textMuted }}>{formatDate(item.updatedAt)}</Text>
    }
  ];

  const pagination = {
    currentPage: media.pagination.page || 1,
    totalPages: media.pagination.totalPages || 1,
    totalItems: media.pagination.totalItems || media.items.length,
    canPrev: (media.pagination.page || 1) > 1,
    canNext: (media.pagination.page || 1) < (media.pagination.totalPages || 1),
    onPrev: () => media.setPage((media.pagination.page || 1) - 1),
    onNext: () => media.setPage((media.pagination.page || 1) + 1)
  };

  return (
    <View style={layoutStyles.contentListWrap}>
      <SectionTopBar
        palette={palette}
        title="Media"
        left={(
          <ActionButton
            label={media.isUploading ? 'Uploading...' : '+ New'}
            onPress={triggerUploadPicker}
            disabled={media.isUploading}
            palette={palette}
          />
        )}
        right={(
          <ThemedTextInput
            palette={palette}
            value={media.search}
            onChangeText={media.setSearch}
            placeholder="Search media..."
            style={{ width: 240 }}
          />
        )}
      />

      {typeof document !== 'undefined' ? (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFilesSelected}
          style={{ display: 'none' }}
        />
      ) : null}

      <FilterBar>
        <FilterTabs
          palette={palette}
          currentFilter={media.mimeTypeFilter}
          onFilterChange={media.setMimeTypeFilter}
          collapseOnMobile
          mobileLabel="Type"
          filters={[
            { label: 'All', value: 'all' },
            { label: 'JPEG', value: 'image/jpeg' },
            { label: 'PNG', value: 'image/png' },
            { label: 'PDF', value: 'application/pdf' }
          ]}
        />
      </FilterBar>

      <View style={[layoutStyles.card, layoutStyles.contentControlBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted, zIndex: 10, marginBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
        <View style={layoutStyles.contentControlGroup}>
          <DropdownButton
            label="Bulk Actions"
            palette={palette}
            items={[{ label: 'Delete permanently', onPress: () => setSelectedBulkAction('delete') }]}
          />
          <ActionButton
            label="Apply"
            onPress={handleApplyBulkAction}
            disabled={media.selectedRowIds.length === 0 || selectedBulkAction === 'none'}
            palette={palette}
          />
        </View>
      </View>

      <DataTable
        columns={columns}
        data={media.items}
        keyExtractor={(item) => item.id}
        palette={palette}
        sort={null}
        pagination={pagination}
        renderEmpty={() => (
          <Text style={{ color: palette.textMuted }}>
            {media.isLoading ? 'Loading media...' : 'No media found.'}
          </Text>
        )}
      />
    </View>
  );
}

function CheckboxCell({ palette, checked, onPress }) {
  return (
    <Pressable style={layoutStyles.checkboxWrap} onPress={onPress}>
      <View
        style={[
          layoutStyles.checkboxBox,
          {
            borderColor: checked ? palette.accent : palette.border,
            backgroundColor: checked ? palette.accent : 'transparent'
          }
        ]}
      >
        <Text style={{ color: checked ? palette.onAccent : 'transparent', fontWeight: '700' }}>✓</Text>
      </View>
    </Pressable>
  );
}
  async function handleApplyBulkAction() {
    if (media.selectedRowIds.length === 0) return;
    if (selectedBulkAction === 'delete') {
      await onBulkDeleteMedia();
      setSelectedBulkAction('none');
    }
  }
