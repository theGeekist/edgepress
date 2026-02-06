import { View, Text, Pressable, StyleSheet } from 'react-native';

export function DataTable({
    columns,
    data,
    keyExtractor,
    palette,
    renderEmpty,
    pagination,
    sort
}) {
    return (
        <View style={[styles.tableWrap, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
                {columns.map((col, index) => (
                    <View
                        key={col.key || index}
                        style={[
                            styles.cell,
                            col.width ? { width: col.width } : { flex: 1 }
                        ]}
                    >
                        {sort && col.sortable ? (
                            <Pressable onPress={() => sort.onSort(col.key)} style={styles.headerSortWrap}>
                                <Text style={[styles.headerText, { color: palette.text }]}>{col.label}</Text>
                                <Text style={[styles.headerSortArrow, { color: sort.sortBy === col.key ? palette.accent : palette.textMuted }]}>
                                    {sort.sortBy === col.key ? (sort.sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text style={[styles.headerText, { color: palette.text }]}>{col.label}</Text>
                        )}
                    </View>
                ))}
            </View>

            {/* Rows */}
            {data.map((item, index) => {
                const key = keyExtractor ? keyExtractor(item) : index;
                return (
                    <View key={key} style={[styles.row, { borderBottomColor: palette.borderSoft }]}>
                        {columns.map((col, colIndex) => (
                            <View
                                key={col.key || colIndex}
                                style={[
                                    styles.cell,
                                    col.width ? { width: col.width } : { flex: 1 }
                                ]}
                            >
                                {col.render ? col.render(item) : <Text style={[styles.text, { color: palette.text }]}>{item[col.key]}</Text>}
                            </View>
                        ))}
                    </View>
                );
            })}

            {data.length === 0 && renderEmpty && (
                <View style={styles.empty}>
                    {renderEmpty()}
                </View>
            )}
            {/* Pagination Footer - Optional */}
            {pagination ? (
                <View style={[styles.paginationRow, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
                    <Text style={[styles.text, { color: palette.textMuted }]}>
                        {pagination.totalItems} items
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Pressable onPress={pagination.onPrev} disabled={!pagination.canPrev} style={{ opacity: pagination.canPrev ? 1 : 0.5 }}>
                            <Text style={[styles.text, { color: palette.accent }]}>&laquo; Previous</Text>
                        </Pressable>
                        <Text style={[styles.text, { color: palette.text }]}>
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </Text>
                        <Pressable onPress={pagination.onNext} disabled={!pagination.canNext} style={{ opacity: pagination.canNext ? 1 : 0.5 }}>
                            <Text style={[styles.text, { color: palette.accent }]}>Next &raquo;</Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    tableWrap: {
        borderWidth: 1,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%'
    },
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        minHeight: 50
    },
    cell: {
        paddingRight: 8,
        justifyContent: 'center',
        minWidth: 0 // Critical for flex text truncation
    },
    headerText: {
        fontSize: 13,
        fontWeight: '600'
    },
    headerSortWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    headerSortArrow: {
        fontSize: 11,
        fontWeight: '700'
    },
    text: {
        fontSize: 13
    },
    empty: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1
    }
});
