import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionButton } from '../../components/ui/ActionButton.jsx';
import { ThemedTextInput } from '../../components/ui/ThemedTextInput.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { DropdownButton } from '../../components/ui/DropdownButton.jsx';
import { FilterTabs } from '../../components/ui/FilterTabs.jsx';
import { layoutStyles } from './styles.js';

function labelCase(value) {
  return value === 'post' ? 'Post' : value === 'published' ? 'Published' : value === 'trash' ? 'Trash' : 'Draft';
}

function formatUpdated(value) {
  if (!value) {
    return 'n/a';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'n/a';
    }
    return date.toLocaleString();
  } catch {
    return 'n/a';
  }
}

export function ContentListTable({
  palette,
  docs,
  selectedRowIds,
  contentSearch,
  onSearch,
  contentTypeFilter,
  onTypeFilter,
  contentStatusFilter,
  onStatusFilter,
  onToggleAllVisible,
  onToggleRow,
  onBulkApply,
  onClearSelected,
  onEdit,
  onRowTrash,
  onRowDelete,
  onNewPage,
  onNewPost,
  sortBy,
  sortDir,
  onSort,
  paginationState,
  onPageChange
}) {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [bulkAction, setBulkAction] = useState('none');
  const allVisibleIds = docs.map((doc) => doc.id);
  const allVisibleSelected = docs.length > 0 && docs.every((doc) => selectedRowIds.includes(doc.id));

  function applyBulk() {
    if (bulkAction === 'none') {
      return;
    }
    onBulkApply(bulkAction);
  }

  // Define Columns
  const columns = [
    {
      key: 'select',
      width: 40,
      label: '',
      render: (doc) => {
        const selected = selectedRowIds.includes(doc.id);
        return (
          <CheckboxCell palette={palette} checked={selected} onPress={() => onToggleRow(doc.id)} />
        );
      }
    },
    {
      key: 'title',
      width: '45%',
      label: 'Title',
      sortable: true,
      render: (doc) => (
        <View>
          <Pressable onPress={() => onEdit(doc)}>
            <Text style={{ color: palette.accent, fontWeight: '600', fontSize: 14 }}>{doc.title || '(no title)'}</Text>
          </Pressable>
          <View style={layoutStyles.tableRowActions}>
            <Pressable onPress={() => onEdit(doc)}><Text style={{ fontSize: 12, color: palette.accent }}>Edit</Text></Pressable>
            <Text style={{ fontSize: 12, color: palette.border }}>|</Text>
            <Pressable onPress={() => onRowTrash(doc)}><Text style={{ fontSize: 12, color: palette.error }}>Trash</Text></Pressable>
          </View>
        </View>
      )
    },
    {
      key: 'type',
      width: '15%',
      label: 'Type',
      sortable: true,
      render: (doc) => <Text style={{ color: palette.text, fontSize: 13 }}>{doc.ui.type === 'post' ? 'Post' : 'Page'}</Text>
    },
    {
      key: 'status',
      width: '15%',
      label: 'Status',
      sortable: true,
      render: (doc) => <StatusBadge status={doc.ui.status} palette={palette} />
    },
    {
      key: 'updated',
      width: '20%',
      label: 'Updated',
      sortable: true,
      render: (doc) => <Text style={{ color: palette.textMuted, fontSize: 13 }}>{formatUpdated(doc.ui.updatedAtLabel)}</Text>
    }
  ];
  const pagination = {
    currentPage: paginationState?.page || 1,
    totalPages: paginationState?.totalPages || 1,
    totalItems: paginationState?.totalItems || docs.length,
    canPrev: (paginationState?.page || 1) > 1,
    canNext: (paginationState?.page || 1) < (paginationState?.totalPages || 1),
    onPrev: () => onPageChange((paginationState?.page || 1) - 1),
    onNext: () => onPageChange((paginationState?.page || 1) + 1)
  };

  return (
    <View style={layoutStyles.contentListWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[layoutStyles.sectionTitle, { color: palette.text, marginBottom: 0, paddingVertical: 0, paddingHorizontal: 0 }]}>Content</Text>
          <DropdownButton
            label="+ New"
            palette={palette}
            items={[
              { label: 'Page', onPress: onNewPage },
              { label: 'Post', onPress: onNewPost }
            ]}
          />
        </View>
        <ThemedTextInput
          palette={palette}
          value={contentSearch}
          onChangeText={onSearch}
          placeholder="Search..."
          style={{ width: 200 }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <FilterTabs
          palette={palette}
          currentFilter={contentTypeFilter}
          onFilterChange={onTypeFilter}
          filters={[
            { label: 'All', value: 'all' },
            { label: 'Pages', value: 'page' },
            { label: 'Posts', value: 'post' }
          ]}
        />
        <Text style={{ color: palette.textMuted }}>|</Text>
        <FilterTabs
          palette={palette}
          currentFilter={contentStatusFilter}
          onFilterChange={onStatusFilter}
          filters={[
            { label: 'Any status', value: 'all' },
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Trash', value: 'trash' }
          ]}
        />
      </View>

      <View style={[layoutStyles.card, layoutStyles.contentControlBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted, zIndex: 10, marginBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
        <View style={layoutStyles.contentControlGroup}>
          <DropdownButton
            label={bulkAction === 'none' ? "Bulk Actions" : (bulkAction === 'trash' ? 'Move to Trash' : (bulkAction === 'published' ? 'Publish' : 'Restore to Draft'))}
            palette={palette}
            items={[
              { label: 'Bulk Actions', onPress: () => setBulkAction('none') },
              { label: 'Publish', onPress: () => setBulkAction('published') },
              { label: 'Restore to Draft', onPress: () => setBulkAction('draft') },
              { label: 'Move to Trash', onPress: () => setBulkAction('trash') }
            ]}
          />
          <ActionButton label="Apply" onPress={applyBulk} disabled={selectedRowIds.length === 0 || bulkAction === 'none'} palette={palette} />
        </View>
      </View>

      <DataTable
        columns={columns}
        data={docs}
        keyExtractor={(d) => d.id}
        palette={palette}
        renderEmpty={() => <Text style={{ color: palette.textMuted }}>No content matches.</Text>}
        pagination={pagination}
        sort={{ sortBy, sortDir, onSort }}
      />
    </View>
  );
}

function CheckboxCell({ palette, checked, onPress, label = '' }) {
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
      {label ? <Text style={{ color: palette.textMuted }}>{label}</Text> : null}
    </Pressable>
  );
}

function StatusBadge({ status, palette }) {
  const isPublished = status === 'published';
  const color = isPublished ? '#00a32a' : palette.textMuted; // WP Green for published
  const label = labelCase(status);
  return (
    <Text style={{ color, fontWeight: isPublished ? '600' : '400', fontSize: 13 }}>{label}</Text>
  );
}

function FilterLink({ label, active, palette, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text
        style={{
          color: active ? palette.accent : palette.textMuted, // Active blue, inactive grey
          textDecorationLine: active ? 'none' : 'none',
          fontWeight: active ? '700' : '400',
          marginRight: 4,
          fontSize: 13
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
