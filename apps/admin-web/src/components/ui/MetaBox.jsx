import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function MetaBox({
    title,
    children,
    footer,
    palette,
    initialOpen = true,
    onToggle
}) {
    const [isOpen, setIsOpen] = useState(initialOpen);

    function handleToggle() {
        setIsOpen(!isOpen);
        if (onToggle) onToggle(!isOpen);
    }

    return (
        <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Pressable
                onPress={handleToggle}
                style={[styles.panelHeader, { borderBottomColor: isOpen ? palette.border : 'transparent' }]}
            >
                <Text style={[styles.panelTitle, { color: palette.text }]}>{title}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isOpen && (
                <>
                    <View style={styles.panelBody}>
                        {children}
                    </View>
                    {footer ? (
                        <View style={[styles.panelFooter, { backgroundColor: palette.surfaceMuted, borderTopColor: palette.border }]}>
                            {footer}
                        </View>
                    ) : null}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        borderWidth: 1,
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden'
    },
    panelHeader: {
        padding: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    panelTitle: {
        fontWeight: '600',
        fontSize: 14
    },
    panelBody: {
        padding: 12,
        gap: 16
    },
    panelFooter: {
        padding: 12,
        borderTopWidth: 1
    }
});
