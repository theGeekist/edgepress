import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';

export function MenuItemCard({ item, depth, onUpdate, onRemove, drag, dragHandleProps, dragHandleRef, isActive, palette }) {
    const [expanded, setExpanded] = useState(false);

    const indentWidth = depth * 24;

    return (
        <View style={[styles.container, { marginLeft: indentWidth }]}>
            <View style={[
                styles.header,
                {
                    backgroundColor: isActive ? palette.accentMuted : palette.surface,
                    borderColor: palette.border
                }
            ]}>
                <Pressable
                    ref={dragHandleRef}
                    onLongPress={drag}
                    delayLongPress={100}
                    style={styles.dragHandle}
                    {...(dragHandleProps || {})}
                >
                    <Text style={{ color: palette.textMuted }}>☰</Text>
                </Pressable>

                <Pressable style={styles.content} onPress={() => setExpanded(!expanded)}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.label, { color: palette.text }]}>
                            {item.label}
                            {depth > 0 && <Text style={{ fontSize: 11, color: palette.textMuted, fontWeight: '400' }}> (Sub-item)</Text>}
                        </Text>
                        <Text style={[styles.type, { color: palette.textMuted }]}>
                            {item.kind === 'external' ? 'Custom Link' : 'Content Link'}
                        </Text>
                    </View>
                </Pressable>

                <Pressable style={styles.toggle} onPress={() => setExpanded(!expanded)}>
                    <Text style={{ color: palette.textMuted }}>{expanded ? '▴' : '▾'}</Text>
                </Pressable>
            </View>

            {expanded && (
                <View style={[styles.details, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                    <View style={styles.field}>
                        <Text style={[styles.fieldLabel, { color: palette.text }]}>Navigation Label</Text>
                        <ThemedTextInput
                            palette={palette}
                            value={item.label}
                            onChangeText={(val) => onUpdate({ ...item, label: val })}
                        />
                    </View>

                    {item.kind === 'external' && (
                        <View style={styles.field}>
                            <Text style={[styles.fieldLabel, { color: palette.text }]}>URL</Text>
                            <ThemedTextInput
                                palette={palette}
                                value={item.externalUrl}
                                onChangeText={(val) => onUpdate({ ...item, externalUrl: val })}
                            />
                        </View>
                    )}
                    {item.kind === 'internal' && (
                        <View style={styles.field}>
                            <Text style={[styles.fieldLabel, { color: palette.text }]}>Route</Text>
                            <ThemedTextInput
                                palette={palette}
                                value={item.route || ''}
                                placeholder="/about"
                                onChangeText={(val) => onUpdate({ ...item, route: val })}
                            />
                            <Text style={[styles.helpText, { color: palette.textMuted }]}>
                                Content links are usually selected from the left panel, but you can edit the route manually.
                            </Text>
                        </View>
                    )}

                    <View style={styles.actions}>
                        <Pressable onPress={onRemove}>
                            <Text style={{ color: '#d63638' }}>Remove</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        height: 44,
        borderWidth: 1,
        borderRadius: 4,
        alignItems: 'center',
    },
    dragHandle: {
        width: 36,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'move',
    },
    content: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
    type: {
        fontSize: 11,
        fontStyle: 'italic',
        marginRight: 8,
    },
    toggle: {
        width: 36,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    details: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        padding: 12,
        marginTop: -1,
    },
    field: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    helpText: {
        fontSize: 11,
        marginTop: 6,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 12,
    },
});
