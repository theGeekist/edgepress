import { View } from 'react-native';

export function SidebarSubmenu({ children, palette }) {
  return (
    <View style={{ backgroundColor: palette.sidebarSubmenu }}>
      {children}
    </View>
  );
}
