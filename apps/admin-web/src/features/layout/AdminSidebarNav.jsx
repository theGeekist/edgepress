import { Text, View, Pressable } from 'react-native';
import { layoutStyles } from './styles.js';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'settings', label: 'Settings' }
];

function MenuButton({ label, active, onPress, palette }) {
  // Sidebar keeps WordPress-like fixed contrast, independent from content surface palette.
  const textColor = active ? '#ffffff' : '#f0f0f1';
  const bgColor = active ? palette.accent : 'transparent';
  const fontWeight = active ? '600' : '400';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        layoutStyles.navButton,
        { backgroundColor: pressed ? '#2c3338' : bgColor }, // Hover-ish state
        active && { backgroundColor: palette.accent }
      ]}
    >
      <Text style={[layoutStyles.navButtonText, { color: textColor, fontWeight }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminSidebarNav({ palette, activeSection, onChangeSection, isMobile, isOpen }) {
  if (isMobile && !isOpen) {
    return null;
  }

  const containerStyle = isMobile ? layoutStyles.sidebarMobile : layoutStyles.sidebar;

  return (
    <View style={[containerStyle, { backgroundColor: palette.sidebar }]}>
      {/* Optional: Add close button for mobile here */}
      <View style={layoutStyles.adminNavButtons}>
        {SECTIONS.map((section) => (
          <MenuButton
            key={section.id}
            label={section.label}
            onPress={() => onChangeSection(section.id)}
            active={activeSection === section.id}
            palette={palette}
          />
        ))}
      </View>
    </View>
  );
}
