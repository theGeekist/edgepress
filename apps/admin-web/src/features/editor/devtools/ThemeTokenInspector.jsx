import { View, Text, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';

function TokenRow({ name, value, palette }) {
  const isColor = /^#|^rgb|^hsl|^var\(--/.test(String(value));

  return (
    <View style={[styles.tokenRow, { borderColor: palette.border }]}>
      <Text style={[styles.tokenName, { color: palette.text }]}>
        {name}
      </Text>
      <View style={styles.tokenValueContainer}>
        {isColor && (
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: value, borderColor: palette.border }
            ]}
          />
        )}
        <Text
          style={[styles.tokenValue, { color: palette.textMuted }]}
          numberOfLines={1}
          selectable
        >
          {String(value)}
        </Text>
      </View>
    </View>
  );
}

TokenRow.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.any,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

function TokenGroup({ title, tokens, palette }) {
  const entries = Object.entries(tokens || {});

  if (entries.length === 0) return null;

  return (
    <View style={styles.tokenGroup}>
      <Text style={[styles.groupTitle, { color: palette.text }]}>
        {title}
      </Text>
      {entries.map(([name, value]) => (
        <TokenRow key={name} name={name} value={value} palette={palette} />
      ))}
    </View>
  );
}

TokenGroup.propTypes = {
  title: PropTypes.string.isRequired,
  tokens: PropTypes.object,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

function groupTokensByPrefix(tokens) {
  const groups = {
    admin: {},
    site: {},
    wp: {},
    other: {}
  };

  for (const [key, value] of Object.entries(tokens || {})) {
    if (key.startsWith('--ep-admin')) {
      groups.admin[key] = value;
    } else if (key.startsWith('--ep-site')) {
      groups.site[key] = value;
    } else if (key.startsWith('--wp')) {
      groups.wp[key] = value;
    } else {
      groups.other[key] = value;
    }
  }

  return groups;
}

export function ThemeTokenInspector({ themeTokens, palette }) {
  const groups = groupTokensByPrefix(themeTokens);
  const hasTokens = Object.values(groups).some(g => Object.keys(g).length > 0);

  if (!hasTokens) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: palette.textMuted }}>
          No theme tokens available
        </Text>
        <Text style={[styles.hint, { color: palette.textMuted }]}>
          Theme tokens will appear here once Slice 5 (Theme Parity) is complete.
          Currently showing any tokens passed to the editor.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TokenGroup
        title="Site Tokens (--ep-site-*)"
        tokens={groups.site}
        palette={palette}
      />
      <TokenGroup
        title="Admin Tokens (--ep-admin-*)"
        tokens={groups.admin}
        palette={palette}
      />
      <TokenGroup
        title="WordPress Tokens (--wp-*)"
        tokens={groups.wp}
        palette={palette}
      />
      <TokenGroup
        title="Other Tokens"
        tokens={groups.other}
        palette={palette}
      />
    </ScrollView>
  );
}

ThemeTokenInspector.propTypes = {
  themeTokens: PropTypes.object,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300
  },
  tokenGroup: {
    marginBottom: 20
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1
  },
  tokenName: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1
  },
  tokenValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '50%'
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 1
  },
  tokenValue: {
    fontSize: 11,
    fontFamily: 'monospace'
  }
});
