import { Text, View } from 'react-native';

import { ActionButton } from '../../components/ui/ActionButton.jsx';
import { ThemedTextInput } from '../../components/ui/ThemedTextInput.jsx';
import { layoutStyles } from './styles.js';

export function AdminLoginView({ palette, auth, status, error, onLogin }) {
  return (
    <View style={[layoutStyles.page, { backgroundColor: palette.page }]}> 
      <View style={[layoutStyles.loginCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
        <Text style={[layoutStyles.loginTitle, { color: palette.text }]}>GCMS Admin</Text>
        <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>Sign in to use the canonical SDK-backed editor shell.</Text>
        <View style={layoutStyles.loginRow}>
          <ThemedTextInput
            palette={palette}
            value={auth.username}
            onChangeText={auth.setUsername}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <ThemedTextInput
            palette={palette}
            value={auth.password}
            onChangeText={auth.setPassword}
            placeholder="password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onLogin}
          />
          <ActionButton label="Sign In" onPress={onLogin} palette={palette} />
        </View>
        {status ? <Text style={[layoutStyles.feedbackText, { color: palette.textMuted }]}>{status}</Text> : null}
        {error ? <Text style={[layoutStyles.feedbackText, { color: palette.error }]}>{error}</Text> : null}
      </View>
    </View>
  );
}
