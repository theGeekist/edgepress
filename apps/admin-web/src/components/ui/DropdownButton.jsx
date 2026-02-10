import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActionButton } from './ActionButton.jsx';

export function DropdownButton({ label, items, palette }) {
    const [isOpen, setIsOpen] = useState(false);
    const rawSurface = String(palette.surface || '').trim().toLowerCase();
    const menuBackground = rawSurface === 'transparent' || rawSurface === 'rgba(0,0,0,0)'
        ? (palette.surfaceMuted || '#ffffff')
        : (palette.surface || '#ffffff');

    return (
        <View style={styles.container}>
            <ActionButton
                label={label}
                onPress={() => setIsOpen(!isOpen)}
                palette={palette}
                active={isOpen}
            />

            {isOpen && (
                <View style={[styles.menu, {
                    borderColor: palette.border,
                    backgroundColor: menuBackground,
                    shadowColor: '#000',
                    opacity: 1
                }]}>
                    {items.map((item, index) => (
                        <Pressable
                            key={index}
                            onPress={() => {
                                setIsOpen(false);
                                if (typeof item.onPress === 'function') {
                                    item.onPress();
                                }
                            }}
                            style={({ hovered, pressed }) => [
                                styles.item,
                                { backgroundColor: hovered || pressed ? palette.surfaceMuted : menuBackground }
                            ]}
                        >
                            <Text style={[styles.itemText, { color: palette.text }]}>{item.label}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 1000
    },
    menu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        minWidth: 150,
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 4,
        zIndex: 2000,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10
    },
    item: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        cursor: 'pointer'
    },
    itemText: {
        fontSize: 13
    }
});
