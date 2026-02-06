import { Text, View, Pressable } from 'react-native';
import { ActionButton } from '../../components/ui/ActionButton.jsx';
import { layoutStyles } from './styles.js';

export function AdminTopbar({ palette, mode, username, onToggleTheme, onLogout, onToggleMenu }) {
  const transparentActionPalette = {
    ...palette,
    surface: 'transparent',
    surfaceMuted: 'transparent',
    text: palette.topbarText,
    border: 'transparent'
  };

  return (
    <View style={[layoutStyles.topbar, { backgroundColor: palette.topbar }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Mobile Hamburger - Visible logic can be done via props or CSS media query equivalent */}
        <Pressable onPress={onToggleMenu} style={layoutStyles.topbarMenuButton}>
          <Text style={{ color: palette.topbarText, fontSize: 20 }}>☰</Text>
        </Pressable>

        <Text style={[layoutStyles.topbarTitle, { color: palette.topbarText }]}>GCMS Admin</Text>
      </View>

      <View style={layoutStyles.topbarActions}>
        <Text style={[layoutStyles.topbarMeta, { color: palette.topbarText, opacity: 0.8 }]}>
          Howdy, {username}
        </Text>
        <ActionButton
          label={mode === 'dark' ? '☀' : '☾'}
          onPress={onToggleTheme}
          palette={transparentActionPalette}
        />
        <ActionButton
          label="Log Out"
          onPress={onLogout}
          palette={transparentActionPalette}
        />
      </View>
    </View>
  );
}
