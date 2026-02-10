import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { DropdownButton } from './DropdownButton.jsx';

export function FilterTabs({
    filters,
    currentFilter,
    onFilterChange,
    palette,
    collapseOnMobile = false,
    mobileLabel = 'Filter'
}) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    if (collapseOnMobile && isMobile) {
        const active = filters.find((filter) => filter.value === currentFilter);
        return (
            <DropdownButton
                label={`${mobileLabel}: ${active?.label || 'All'}`}
                palette={palette}
                items={filters.map((filter) => ({
                    label: filter.label,
                    onPress: () => onFilterChange(filter.value)
                }))}
            />
        );
    }

    return (
        <View style={styles.container}>
            {filters.map((filter, index) => {
                const isActive = currentFilter === filter.value;
                const isLast = index === filters.length - 1;

                return (
                    <View key={filter.value} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable onPress={() => onFilterChange(filter.value)}>
                            <Text
                                style={{
                                    color: isActive ? palette.accent : palette.textMuted,
                                    fontWeight: isActive ? '700' : '400',
                                    fontSize: 13
                                }}
                            >
                                {filter.label}
                            </Text>
                        </Pressable>
                        {!isLast && <Text style={{ color: palette.textMuted, marginHorizontal: 8 }}>|</Text>}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap'
    }
});
