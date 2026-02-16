import { View } from "react-native";
import PropTypes from 'prop-types';

export function SidebarSubmenu({ children, palette }) {
  return (
    <View style={{ backgroundColor: palette.sidebarSubmenu }}>
      {children}
    </View>
  );
}

SidebarSubmenu.propTypes = {
  children: PropTypes.node.isRequired,
  palette: PropTypes.shape({
    sidebarSubmenu: PropTypes.string.isRequired
  }).isRequired
};
