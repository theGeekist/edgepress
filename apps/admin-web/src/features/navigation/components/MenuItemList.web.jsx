import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuItemCard } from './MenuItemCard.jsx';

function SortableRow({ item, depth, palette, onUpdate, onRemove, isOver, dragIntent, isActiveDropTarget }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
    };
    const showIndicator = isOver && !isDragging;
    const indicatorText = dragIntent === 'nest'
        ? 'Drop as child'
        : dragIntent === 'outdent'
            ? 'Drop to outdent'
            : 'Drop to reorder';
    const indicatorOffset = dragIntent === 'nest' ? (depth + 1) * 24 : Math.max(depth, 0) * 24;

    return (
        <div ref={setNodeRef} style={style}>
            {showIndicator ? (
                <div
                    style={{
                        marginLeft: indicatorOffset,
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <div style={{ height: 2, flex: 1, background: palette.accent }} />
                    <span style={{ fontSize: 11, color: palette.accent, fontWeight: 600 }}>{indicatorText}</span>
                </div>
            ) : null}
            <MenuItemCard
                item={item}
                depth={depth}
                drag={() => { }}
                dragHandleProps={{ ...attributes, ...listeners }}
                dragHandleRef={setActivatorNodeRef}
                isActive={isDragging || isActiveDropTarget}
                palette={palette}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        </div>
    );
}

export function MenuItemList({ items, onItemsChange, palette }) {
    const activeDragIdRef = useRef(null);
    const activeDragDeltaXRef = useRef(0);
    const [activeDragId, setActiveDragId] = useState(null);
    const [overDragId, setOverDragId] = useState(null);
    const [dragIntent, setDragIntent] = useState('reorder');
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

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

    function isDescendant(itemMap, maybeChildId, maybeAncestorId) {
        let current = itemMap.get(maybeChildId);
        const visited = new Set();
        while (current?.parentId) {
            if (visited.has(current.parentId)) {
                return false;
            }
            visited.add(current.parentId);
            if (current.parentId === maybeAncestorId) {
                return true;
            }
            current = itemMap.get(current.parentId);
        }
        return false;
    }

    function intentFromDelta(deltaX) {
        if (deltaX > 12) return 'nest';
        if (deltaX < -12) return 'outdent';
        return 'reorder';
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over) {
            activeDragIdRef.current = null;
            activeDragDeltaXRef.current = 0;
            setActiveDragId(null);
            setOverDragId(null);
            setDragIntent('reorder');
            return;
        }
        const oldIndex = items.findIndex((entry) => entry.id === active.id);
        const newIndex = items.findIndex((entry) => entry.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
            activeDragIdRef.current = null;
            activeDragDeltaXRef.current = 0;
            setActiveDragId(null);
            setOverDragId(null);
            setDragIntent(null);
            return;
        }
        const shouldReorder = active.id !== over.id;
        const reordered = shouldReorder ? arrayMove(items, oldIndex, newIndex) : [...items];
        const movedIndex = shouldReorder ? reordered.findIndex((entry) => entry.id === active.id) : oldIndex;
        const movedItem = reordered[movedIndex];
        const itemMap = new Map(reordered.map((entry) => [entry.id, entry]));
        const deltaX = Number(activeDragDeltaXRef.current || 0);
        const intent = intentFromDelta(deltaX);
        let didHierarchyChange = false;

        // Classic-style hierarchy gesture: drag right to nest under previous sibling, left to outdent.
        if (intent === 'nest' && movedIndex > 0) {
            const candidateParent = reordered[movedIndex - 1];
            if (candidateParent && candidateParent.id !== movedItem.id && !isDescendant(itemMap, candidateParent.id, movedItem.id)) {
                reordered[movedIndex] = { ...movedItem, parentId: candidateParent.id };
                didHierarchyChange = true;
            }
        } else if (intent === 'outdent') {
            const currentParent = itemMap.get(movedItem.parentId);
            const nextParentId = currentParent?.parentId || null;
            if ((movedItem.parentId || null) !== nextParentId) {
                reordered[movedIndex] = { ...movedItem, parentId: nextParentId };
                didHierarchyChange = true;
            }
        }

        if (shouldReorder || didHierarchyChange) {
            const normalized = reordered.map((entry, idx) => ({ ...entry, order: idx }));
            onItemsChange(normalized);
        }
        activeDragIdRef.current = null;
        activeDragDeltaXRef.current = 0;
        setActiveDragId(null);
        setOverDragId(null);
        setDragIntent('reorder');
    }

    return (
        <View style={styles.container}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => {
                    activeDragIdRef.current = active?.id || null;
                    activeDragDeltaXRef.current = 0;
                    setActiveDragId(active?.id || null);
                    setOverDragId(active?.id || null);
                    setDragIntent('reorder');
                }}
                onDragMove={({ active, delta }) => {
                    if (activeDragIdRef.current && active?.id === activeDragIdRef.current) {
                        activeDragDeltaXRef.current = Number(delta?.x || 0);
                        setDragIntent(intentFromDelta(activeDragDeltaXRef.current));
                    }
                }}
                onDragOver={({ over }) => {
                    setOverDragId(over?.id || null);
                }}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                    activeDragIdRef.current = null;
                    activeDragDeltaXRef.current = 0;
                    setActiveDragId(null);
                    setOverDragId(null);
                    setDragIntent('reorder');
                }}
            >
                <SortableContext items={items.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map((item) => (
                            <SortableRow
                                key={item.id}
                                item={item}
                                depth={depths[item.id] || 0}
                                palette={palette}
                                onUpdate={handleUpdate}
                                onRemove={() => handleRemove(item.id)}
                                isOver={overDragId === item.id}
                                dragIntent={dragIntent}
                                isActiveDropTarget={activeDragId === item.id}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 400,
    },
});
