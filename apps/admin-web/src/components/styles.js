import { StyleSheet } from 'react-native';

const BORDER_RADIUS = 4;

export const layoutStyles = StyleSheet.create({
  page: {
    minHeight: '100vh',
    flexDirection: 'column',
    backgroundColor: 'transparent' // Handled by App wrapper
  },
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  topbar: {
    height: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100
  },
  tableHeaderCell: {
    fontSize: 13,
    fontWeight: '600'
  },
  tableCell: {
    fontSize: 13,
    paddingRight: 8,
    justifyContent: 'center',
    minWidth: 0
  },
  topbarTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  topbarMeta: {
    fontSize: 13,
    marginLeft: 8
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  topbarMenuButton: {
    padding: 8,
    marginRight: 8
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row'
  },
  sidebar: {
    width: 180,
    borderRightWidth: 1,
    zIndex: 90,
    paddingVertical: 0,
  },
  // Mobile drawer style would apply absolutely
  sidebarMobile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 240,
    elevation: 10,
    zIndex: 200,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.7,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4
  },
  adminNavButtons: {
    gap: 0
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSubButton: {
    paddingVertical: 8,
    paddingLeft: 24,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  navButtonActive: {
    borderLeftWidth: 4,
    paddingLeft: 8 // Compensate for border
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '500'
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 600
  },
  contentWorkspace: {
    flex: 1,
    flexDirection: 'column',
    padding: 20,
    gap: 20,
    maxWidth: '100%'
  },
  contentWorkspaceMobile: {
    padding: 10
  },
  contentHeader: {
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 8
  },
  contentToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap'
  },
  contentFilters: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  filterLink: {
    fontSize: 13,
    marginRight: 4
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  sectionHint: {
    fontSize: 13
  },
  contentControlBar: {
    padding: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' // Allow wrapping on small screens
  },
  contentControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  contentSearchInput: {
    minWidth: 200
  },
  contentListWrap: {
    flex: 1,
    gap: 10
  },
  contentEditorPane: {
    flex: 1,
    minWidth: 0,
    gap: 10
  },
  titleInput: {
    fontSize: 34,
    fontWeight: '600',
    width: '100%'
  },
  canvasWrap: {
    flex: 1,
    minHeight: 680,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden'
  },
  publishRail: {
    width: 360,
    minWidth: 320,
    borderLeftWidth: 1,
    paddingLeft: 12,
    gap: 12
  },
  publishActions: {
    gap: 8
  },
  loopTitle: {
    fontSize: 20,
    fontWeight: '600'
  },
  loopText: {
    fontSize: 16
  },
  sectionPlaceholder: {
    minHeight: 220,
    padding: 16,
    gap: 10
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 0,
    backgroundColor: 'transparent'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12, // More breathing room
    paddingHorizontal: 16
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12, // Match header
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 50
  },
  tableRowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    minHeight: 20 // Ensure height for touch
  },
  checkboxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Mobile Card View for List
  cardList: {
    gap: 12
  },
  cardItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    gap: 8
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  feedbackBar: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600'
  },
  feedbackLink: {
    fontSize: 13,
    textDecorationLine: 'underline'
  },
  loginCard: {
    maxWidth: 760,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    padding: 16,
    alignSelf: 'center',
    gap: 8
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: '700'
  },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center'
  },
  settingsPanel: {
    padding: 16,
    gap: 16,
    borderLeftWidth: 1,
    width: 280
  },
  // Helper for touch targets
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center'
  }
});
