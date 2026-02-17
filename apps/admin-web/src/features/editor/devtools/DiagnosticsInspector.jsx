import { View, Text, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';

const STATUS_COLORS = {
  transformed: '#22c55e',
  partial: '#eab308',
  fallback: '#f97316',
  unsupported: '#ef4444'
};

function CountBadge({ label, count, color, palette }) {
  if (count === 0) return null;

  return (
    <View style={[styles.countBadge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.countNumber, { color }]}>{count}</Text>
      <Text style={[styles.countLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

CountBadge.propTypes = {
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

function IssueItem({ item, palette }) {
  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.unsupported;

  return (
    <View style={[styles.issueItem, { borderColor: palette.border }]}>
      <View style={styles.issueHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.issueBlockName, { color: palette.text }]}>
          {item.originWpBlockName || 'unknown'}
        </Text>
        <Text style={[styles.issueStatus, { color: statusColor }]}>
          {item.status}
        </Text>
      </View>

      {item.transformId && (
        <Text style={[styles.issueMeta, { color: palette.textMuted }]}>
          Transform: {item.transformId}
        </Text>
      )}

      {item.code && (
        <Text style={[styles.issueCode, { color: palette.textMuted }]}>
          Code: {item.code}
        </Text>
      )}

      {item.message && (
        <Text style={[styles.issueMessage, { color: palette.text }]}>
          {item.message}
        </Text>
      )}

      {item.nodePath && item.nodePath.length > 0 && (
        <Text style={[styles.issuePath, { color: palette.textMuted }]}>
          Path: {item.nodePath.join(' → ')}
        </Text>
      )}
    </View>
  );
}

IssueItem.propTypes = {
  item: PropTypes.shape({
    status: PropTypes.string,
    originWpBlockName: PropTypes.string,
    transformId: PropTypes.string,
    code: PropTypes.string,
    message: PropTypes.string,
    nodePath: PropTypes.array
  }).isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

export function DiagnosticsInspector({ diagnostics, palette }) {
  const { summary, import: importDiag, render: renderDiag } = diagnostics || {};
  const counts = summary || { transformed: 0, partial: 0, fallback: 0, unsupported: 0 };

  const importIssues = (importDiag?.items || []).filter(i => i.status !== 'transformed');
  const renderIssues = (renderDiag?.items || []).filter(i => i.status !== 'transformed');
  const totalIssues = importIssues.length + renderIssues.length;

  return (
    <View style={styles.container}>
      <View style={styles.countsRow}>
        <CountBadge
          label="Transformed"
          count={counts.transformed}
          color={STATUS_COLORS.transformed}
          palette={palette}
        />
        <CountBadge
          label="Partial"
          count={counts.partial}
          color={STATUS_COLORS.partial}
          palette={palette}
        />
        <CountBadge
          label="Fallback"
          count={counts.fallback}
          color={STATUS_COLORS.fallback}
          palette={palette}
        />
        <CountBadge
          label="Unsupported"
          count={counts.unsupported}
          color={STATUS_COLORS.unsupported}
          palette={palette}
        />
      </View>

      {totalIssues === 0 ? (
        <View style={styles.successState}>
          <Text style={{ color: STATUS_COLORS.transformed, fontSize: 24 }}>✓</Text>
          <Text style={{ color: palette.text, marginTop: 8 }}>
            All blocks transformed successfully
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.issuesList}>
          {importIssues.length > 0 && (
            <View style={styles.issuesSection}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Import Issues ({importIssues.length})
              </Text>
              {importIssues.map((item, index) => (
                <IssueItem key={`import-${index}`} item={item} palette={palette} />
              ))}
            </View>
          )}

          {renderIssues.length > 0 && (
            <View style={styles.issuesSection}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Render Issues ({renderIssues.length})
              </Text>
              {renderIssues.map((item, index) => (
                <IssueItem key={`render-${index}`} item={item} palette={palette} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

DiagnosticsInspector.propTypes = {
  diagnostics: PropTypes.shape({
    summary: PropTypes.shape({
      transformed: PropTypes.number,
      partial: PropTypes.number,
      fallback: PropTypes.number,
      unsupported: PropTypes.number
    }),
    import: PropTypes.shape({
      items: PropTypes.array
    }),
    render: PropTypes.shape({
      items: PropTypes.array
    })
  }),
  palette: PropTypes.shape(palettePropTypes).isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6
  },
  countNumber: {
    fontSize: 16,
    fontWeight: '700'
  },
  countLabel: {
    fontSize: 11,
    textTransform: 'uppercase'
  },
  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  issuesList: {
    flex: 1,
    padding: 12
  },
  issuesSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8
  },
  issueItem: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 8
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  issueBlockName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 1
  },
  issueStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  issueMeta: {
    fontSize: 11,
    marginTop: 4
  },
  issueCode: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace'
  },
  issueMessage: {
    fontSize: 12,
    marginTop: 4
  },
  issuePath: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'monospace'
  }
});
