/**
 * WordPress-inspired admin layout primitives
 * Provides consistent structure and spacing across all admin pages
 */

import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { spacing, radius, createTransition } from '../tokens.js';

// ========== Main Page Layout ==========

/**
 * AdminPage - Main page wrapper with proper structure
 *
 * Structure:
 * - Header (title, breadcrumbs, actions)
 * - Toolbar (filters, search, bulk actions) - optional
 * - Content (main + right rail)
 */
export function AdminPage({
  palette,
  children,
  header,
  toolbar,
  rightRail,
  scrollToTop,
  compact = false,
}) {
  const hasRightRail = Boolean(rightRail);
  const hasToolbar = Boolean(toolbar);

  return (
    <View style={[styles.pageContainer, { backgroundColor: palette.page }]}>
      {/* Header */}
      {header && (
        <View style={[
          styles.pageHeader,
          compact && styles.pageHeaderCompact,
          { borderBottomColor: palette.borderSoft }
        ]}>
          {header}
        </View>
      )}

      {/* Toolbar */}
      {hasToolbar && (
        <View style={[
          styles.pageToolbar,
          compact && styles.pageToolbarCompact,
          { borderBottomColor: palette.borderSoft }
        ]}>
          {toolbar}
        </View>
      )}

      {/* Content */}
      <View style={styles.pageContentWrapper}>
        <ScrollView
          contentContainerStyle={[
            styles.pageContent,
            compact && styles.pageContentCompact,
            hasRightRail && styles.pageContentWithRail,
          ]}
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>

        {/* Right Rail */}
        {hasRightRail && (
          <View style={[
            styles.pageRail,
            compact && styles.pageRailCompact,
            { borderLeftColor: palette.borderSoft }
          ]}>
            {rightRail}
          </View>
        )}
      </View>
    </View>
  );
}

// ========== Page Header ==========

export function PageHeader({ palette, title, breadcrumb, actions }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        {breadcrumb && (
          <Text style={[styles.breadcrumb, { color: palette.textMuted }]}>
            {breadcrumb}
          </Text>
        )}
        <Text style={[styles.pageTitle, { color: palette.text }]}>
          {title}
        </Text>
      </View>
      {actions && <View style={styles.headerActions}>{actions}</View>}
    </View>
  );
}

// ========== Page Toolbar ==========

export function PageToolbar({ palette, children, left, right, compact = false }) {
  return (
    <View style={[styles.toolbarContainer, compact && styles.toolbarContainerCompact]}>
      <View style={styles.toolbarLeft}>{left || children}</View>
      {right && <View style={styles.toolbarRight}>{right}</View>}
    </View>
  );
}

// ========== Page Content Sections ==========

export function PageContent({ children, style }) {
  return (
    <View style={[styles.contentArea, style]}>
      {children}
    </View>
  );
}

export function PageRail({ palette, children, tabs, activeTab, onTabChange }) {
  return (
    <View style={styles.railContainer}>
      {tabs && (
        <RailTabs
          palette={palette}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
      <View style={styles.railContent}>{children}</View>
    </View>
  );
}

// ========== Rail Tabs ==========

function RailTabs({ palette, tabs, activeTab, onTabChange }) {
  return (
    <View style={[styles.railTabs, { borderBottomColor: palette.border }]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onTabChange?.(tab.id)}
          style={({ pressed }) => [
            styles.railTab,
            pressed && { backgroundColor: palette.surfaceMuted },
            activeTab === tab.id && {
              borderBottomColor: palette.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.railTabText,
              {
                color: activeTab === tab.id ? palette.accent : palette.textMuted,
              },
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ========== Card Component ==========

export function Card({ palette, children, style, noPadding }) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.borderSoft,
          borderRadius: radius.md,
        },
        style,
      ]}
    >
      <View style={noPadding ? undefined : styles.cardContent}>{children}</View>
    </View>
  );
}

export function CardHeader({ palette, title, actions }) {
  return (
    <View style={[styles.cardHeader, { borderBottomColor: palette.borderSoft }]}>
      <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>
      {actions && <View style={styles.cardActions}>{actions}</View>}
    </View>
  );
}

export function CardBody({ children, style }) {
  return <View style={[styles.cardBody, style]}>{children}</View>;
}

export function CardFooter({ palette, children, style }) {
  return (
    <View
      style={[
        styles.cardFooter,
        { borderTopColor: palette.borderSoft },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ========== Layout Sections ==========

export function TwoColumnLayout({ palette, left, right, ratio = '2:1' }) {
  const leftFlex = parseInt(ratio.split(':')[0]) || 2;
  const rightFlex = parseInt(ratio.split(':')[1]) || 1;

  return (
    <View style={styles.twoColumnLayout}>
      <View style={{ flex: leftFlex, paddingRight: spacing.lg }}>{left}</View>
      <View style={{ flex: rightFlex }}>{right}</View>
    </View>
  );
}

// ========== Utility Components ==========

export function Section({ palette, children, title, actions, collapsible }) {
  return (
    <View style={[styles.section, { borderBottomColor: palette.borderSoft }]}>
      {(title || actions) && (
        <View style={styles.sectionHeader}>
          {title && (
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {title}
            </Text>
          )}
          {actions && <View style={styles.sectionActions}>{actions}</View>}
        </View>
      )}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

// ========== Styles ==========

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    flexDirection: 'column',
    minHeight: '100vh',
  },

  // Header
  pageHeader: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  pageHeaderCompact: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  breadcrumb: {
    fontSize: 13,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  // Toolbar
  pageToolbar: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pageToolbarCompact: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toolbarContainerCompact: {
    gap: spacing.sm,
  },
  toolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Content
  pageContentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 1200,
  },
  pageContentCompact: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pageContentWithRail: {
    paddingRight: 16,
    maxWidth: 'none',
  },

  // Right Rail
  pageRail: {
    width: 280,
    paddingLeft: 16,
    paddingRight: 32,
    paddingVertical: 24,
    borderLeftWidth: 1,
  },
  pageRailCompact: {
    width: 260,
    paddingLeft: 12,
    paddingRight: 20,
    paddingVertical: 16,
  },
  railContainer: {
    flex: 1,
  },
  railTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  railTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: spacing.md,
    transition: createTransition(['border-bottom-color', 'background-color'], 'fast'),
  },
  railTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  railContent: {
    gap: spacing.lg,
  },

  // Card
  card: {
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardBody: {
    padding: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionContent: {
    gap: spacing.md,
  },

  // Two Column
  twoColumnLayout: {
    flexDirection: 'row',
    gap: spacing.xl,
  },

  // Content Area
  contentArea: {
    gap: spacing.lg,
  },
});
