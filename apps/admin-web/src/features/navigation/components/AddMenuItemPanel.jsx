import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ThemedTextInput } from '../../../components/ui/ThemedTextInput.jsx';
import { MetaBox } from '../../../components/ui/MetaBox.jsx';

export function AddMenuItemPanel({ palette, docs, onAdd }) {
    const [customLabel, setCustomLabel] = useState('');
    const [customUrl, setCustomUrl] = useState('http://');

    const handleAddCustom = () => {
        if (!customLabel) return;
        onAdd({
            label: customLabel,
            kind: 'external',
            externalUrl: customUrl,
        });
        setCustomLabel('');
        setCustomUrl('http://');
    };

    const handleAddPage = (page) => {
        onAdd({
            label: page.title,
            kind: 'internal',
            documentId: page.id,
            route: page.slug ? `/${page.slug}` : `/documents/${page.id}`,
        });
    };

    return (
        <View style={styles.container}>
            <MetaBox title="Content" palette={palette} initiallyExpanded={true}>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 8 }}>
                    Pick a page/post to create a content link in the menu.
                </Text>
                <ScrollView style={{ maxHeight: 200 }}>
                    {docs.map(page => (
                        <Pressable
                            key={page.id}
                            onPress={() => handleAddPage(page)}
                            style={({ pressed }) => [
                                styles.itemRow,
                                { borderBottomColor: palette.border, backgroundColor: pressed ? palette.surfaceMuted : 'transparent' }
                            ]}
                        >
                            <Text style={{ color: palette.text, fontSize: 13 }}>{page.title || 'Untitled'}</Text>
                            <Text style={{ color: palette.accent, fontSize: 12 }}>Add</Text>
                        </Pressable>
                    ))}
                    {docs.length === 0 && (
                        <Text style={{ color: palette.textMuted, fontSize: 13, padding: 8 }}>No content found.</Text>
                    )}
                </ScrollView>
            </MetaBox>

            <MetaBox title="Custom Links" palette={palette}>
                <View style={{ gap: 12 }}>
                    <View>
                        <Text style={{ color: palette.text, fontSize: 12, marginBottom: 4 }}>URL</Text>
                        <ThemedTextInput palette={palette} value={customUrl} onChangeText={setCustomUrl} />
                    </View>
                    <View>
                        <Text style={{ color: palette.text, fontSize: 12, marginBottom: 4 }}>Link Text</Text>
                        <ThemedTextInput palette={palette} value={customLabel} onChangeText={setCustomLabel} />
                    </View>
                    <Pressable
                        onPress={handleAddCustom}
                        style={[styles.addButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    >
                        <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600' }}>Add to Menu</Text>
                    </Pressable>
                </View>
            </MetaBox>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    itemRow: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    addButton: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        alignItems: 'center',
        marginTop: 8,
    }
});
