import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { ActionButton } from '@components/ui/ActionButton.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { DataTable } from '@components/ui/DataTable.jsx';
import { DropdownButton } from '@components/ui/DropdownButton.jsx';
import { FilterBar } from '@components/ui/FilterBar.jsx';
import { FilterTabs } from '@components/ui/FilterTabs.jsx';
import { SectionTopBar } from '@components/ui/SectionTopBar.jsx';
import { layoutStyles } from '@components/styles.js';

function labelStatus(value) {
  const labels = {
    published: 'Published',
    trash: 'Trash',
    draft: 'Draft'
  };
  return labels[value] || 'Unknown';
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
  onPageChange,
  hideHeader = false,
}) {
  const [bulkAction, setBulkAction] = useState('none');
  const bulkActionLabels = {
    none: 'Bulk Actions',
    trash: 'Move to Trash',
    published: 'Publish',
    draft: 'Restore to Draft'
  };

  async function applyBulk() {
    if (bulkAction === 'none') {
      return;
    }
    try {
      await onBulkApply(bulkAction);
    } catch (e) {
      throw e;
    } finally {
      setBulkAction('none');
      onClearSelected();
    }
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
            <Text style={{ fontSize: 12, color: palette.border }}>|</Text>
            <Pressable onPress={() => onRowDelete?.(doc)}><Text style={{ fontSize: 12, color: palette.error }}>Delete</Text></Pressable>
          </View>
        </View>
      )
    },
    {
      key: 'type',
      width: '15%',
      label: 'Type',
      sortable: true,
      render: (doc) => <Text style={{ color: palette.text, fontSize: 13 }}>{doc?.ui?.type === 'post' ? 'Post' : 'Page'}</Text>
    },
    {
      key: 'status',
      width: '15%',
      label: 'Status',
      sortable: true,
      render: (doc) => <StatusBadge status={doc?.ui?.status} palette={palette} />
    },
    {
      key: 'updated',
      width: '20%',
      label: 'Updated',
      sortable: true,
      render: (doc) => <Text style={{ color: palette.textMuted, fontSize: 13 }}>{formatUpdated(doc?.ui?.updatedAtLabel)}</Text>
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
      {!hideHeader && (
        <SectionTopBar
          palette={palette}
          title="Content"
          left={(
            <DropdownButton
              label="+ New"
              palette={palette}
              items={[
                { label: 'Page', onPress: onNewPage },
                { label: 'Post', onPress: onNewPost }
              ]}
            />
          )}
          right={(
            <ThemedTextInput
              palette={palette}
              value={contentSearch}
              onChangeText={onSearch}
              placeholder="Search..."
              style={{ width: 220 }}
            />
          )}
        />
      )}

      <FilterBar compact={hideHeader}>
        <FilterTabs
          palette={palette}
          currentFilter={contentTypeFilter}
          onFilterChange={onTypeFilter}
          collapseOnMobile
          mobileLabel="Type"
          filters={[
            { label: 'All', value: 'all' },
            { label: 'Pages', value: 'page' },
            { label: 'Posts', value: 'post' }
          ]}
        />
        <FilterTabs
          palette={palette}
          currentFilter={contentStatusFilter}
          onFilterChange={onStatusFilter}
          collapseOnMobile
          mobileLabel="Status"
          filters={[
            { label: 'Any status', value: 'all' },
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Trash', value: 'trash' }
          ]}
        />
      </FilterBar>

      <View style={[layoutStyles.card, layoutStyles.contentControlBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted, zIndex: 10, marginBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
        <View style={layoutStyles.contentControlGroup}>
          <DropdownButton
            label={bulkActionLabels[bulkAction] || 'Bulk Actions'}
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
  const label = labelStatus(status);
  return (
    <Text style={{ color, fontWeight: isPublished ? '600' : '400', fontSize: 13 }}>{label}</Text>
  );
}
