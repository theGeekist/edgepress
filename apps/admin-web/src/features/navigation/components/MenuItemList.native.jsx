import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { MenuItemCard } from './MenuItemCard.jsx';

export function MenuItemList({ items, onItemsChange, palette }) {
    const depths = useMemo(() => {
        const d = {};
        const itemMap = new Map(items.map((i) => [i.id, i]));
        items.forEach((item) => {
            let depth = 0;
            let curr = item;
            while (curr.parentId && itemMap.has(curr.parentId)) {
                depth++;
                curr = itemMap.get(curr.parentId);
                if (depth > 5) break;
            }
            d[item.id] = depth;
        });
        return d;
    }, [items]);

    const handleUpdate = (updatedItem) => {
        const next = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
        onItemsChange(next);
    };

    const handleRemove = (id) => {
        const target = items.find((i) => i.id === id);
        const next = items
            .filter((i) => i.id !== id)
            .map((i) => (i.parentId === id ? { ...i, parentId: target?.parentId || null } : i));
        onItemsChange(next);
    };

    const renderItem = ({ item, drag, isActive }) => {
        return (
            <MenuItemCard
                item={item}
                depth={depths[item.id] || 0}
                drag={drag}
                dragHandleProps={null}
                dragHandleRef={null}
                isActive={isActive}
                palette={palette}
                onUpdate={handleUpdate}
                onRemove={() => handleRemove(item.id)}
            />
        );
    };

    return (
        <View style={styles.container}>
            <DraggableFlatList
                data={items}
                onDragEnd={({ data }) => onItemsChange(data)}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                containerStyle={{ flex: 1 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 400,
    },
});
