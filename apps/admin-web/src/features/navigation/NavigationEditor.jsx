import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { layoutStyles } from '@components/styles.js';
import { PageLayout } from '@components/ui/PageLayout.jsx';
import { ActionButton } from '@components/ui/ActionButton.jsx';
import { MenuItemList } from '@features/navigation/components/MenuItemList';
import { AddMenuItemPanel } from '@features/navigation/components/AddMenuItemPanel.jsx';
import { useNavigationMenuEditor } from '@features/navigation/hooks/useNavigationMenuEditor.js';

export function NavigationEditor({ palette, docs, navigation, actions }) {
    const {
        menuTitle,
        items,
        setItems,
        addItem,
        saveMenu,
        uiState,
    } = useNavigationMenuEditor({ navigation, actions, menuKey: 'primary' });

    return (
        <PageLayout
            title="Menus"
            palette={palette}
            actions={
                <ActionButton
                    label={uiState.isDirty ? 'Save Menu' : 'Saved'}
                    tone="primary"
                    palette={palette}
                    onPress={saveMenu}
                    disabled={uiState.isSaving || !uiState.isDirty}
                />
            }
        >
            <View style={styles.editorContainer}>
                {/* Left Column: Add items */}
                <View style={styles.sidePanel}>
                    <Text style={[styles.panelTitle, { color: palette.text }]}>Add menu items</Text>
                    <AddMenuItemPanel
                        palette={palette}
                        docs={docs.docs || []}
                        onAdd={addItem}
                    />
                </View>

                {/* Right Column: Menu structure */}
                <View style={styles.mainPanel}>
                    <View style={[layoutStyles.card, styles.structureCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                        <View style={[styles.cardHeader, { borderBottomColor: palette.border }]}>
                            <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>Menu structure</Text>
                        </View>

                        <View style={styles.cardContent}>
                            <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 20 }}>
                                Drag items to reorder. Drag slightly right while dropping to nest under the item above, or drag left to outdent one level.
                            </Text>
                            {uiState.isLoading ? (
                                <Text style={{ color: palette.textMuted, fontSize: 13 }}>Loading menu...</Text>
                            ) : null}
                            {!uiState.isLoading && uiState.isDirty ? (
                                <Text style={{ color: palette.accent, fontSize: 12, marginBottom: 12 }}>
                                    Unsaved menu changes
                                </Text>
                            ) : null}

                            <MenuItemList
                                items={items}
                                onItemsChange={setItems}
                                palette={palette}
                            />
                        </View>

                        <View style={[styles.cardFooter, { borderTopColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
                            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                                Menu Name: <Text style={{ color: palette.text, fontWeight: '600' }}>{menuTitle}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </PageLayout>
    );
}

const styles = StyleSheet.create({
    editorContainer: {
        flexDirection: 'row',
        gap: 20,
        flexWrap: 'wrap',
    },
    sidePanel: {
        width: 280,
        gap: 12,
    },
    mainPanel: {
        flex: 1,
        minWidth: 400,
    },
    panelTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    structureCard: {
        flex: 1,
    },
    cardHeader: {
        padding: 12,
        borderBottomWidth: 1,
    },
    cardContent: {
        padding: 16,
        flex: 1,
    },
    cardFooter: {
        padding: 12,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    }
});
