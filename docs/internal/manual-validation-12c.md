# Phase 12C Manual Validation Guide

This guide defines the manual validation steps for Phase 12C (Product Parity) of the Geekist CMS.

## Prerequisites
1.  **Dev Server Running**: `apps/admin-web` running (default: `http://localhost:5173`).
2.  **API Running**: `apps/api` running (default: `http://localhost:8787`).
3.  **Authentication**: Logged in as an Admin user.

## Test Scripts

### Slice 0: Editor DevTools

**Objective**: Verify that the developer tools panel is accessible and functional.

1.  **Open Editor**: Navigate to any Document edit screen.
2.  **Toggle Panel**: Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac).
    *   **Expected**: The DevTools panel slides in from the right.
3.  **Inspect Block Tree**:
    *   Expand the "Block Tree" section.
    *   Select a block in the main editor canvas.
    *   **Expected**: The tree highlights the corresponding node and shows "Canonical State" properties.
4.  **Check Diagnostics**:
    *   Expand "Diagnostics".
    *   **Expected**: Should show "Transform Status: clean" (or similar) for standard blocks.
5.  **Theme Tokens**:
    *   Expand "Theme Tokens".
    *   **Expected**: List of resolved CSS variables (e.g., `--ep-sys-color-primary`).

### Slice 1: Block Hardening

**Objective**: Verify robust handling of rich text and embeds.

1.  **Rich Text Validation**:
    *   Insert a Paragraph block.
    *   Paste mixed HTML content (e.g., `<b>Bold</b> and <script>alert(1)</script>`).
    *   **Expected**: The script tag is stripped/escaped; bold formatting is preserved.
2.  **Embed Validation**:
    *   Insert an Embed block.
    *   Paste a valid YouTube URL.
    *   **Expected**: The video renders correctly.
    *   Paste an unsupported URL (e.g., a random non-whitelisted site).
    *   **Expected**: Diagnostic error or fallback display indicating "Unsupported Provider".
3.  **Image Captions**:
    *   Insert an Image block.
    *   Add a caption with bold text.
    *   Save and Reload.
    *   **Expected**: Caption text and formatting are preserved.

### Slice 2: Media Picker

**Objective**: Verify the replacement of raw ID inputs with a visual media picker.

1.  **Open Settings**: Open the "Document Settings" (sidebar).
2.  **Featured Image**:
    *   Locate "Featured Image".
    *   **Expected**: No raw text input. A "Select Image" button or placeholder.
3.  **Select Media**:
    *   Click "Select Image".
    *   **Expected**: Media Library modal opens.
    *   Select an image.
    *   **Expected**: Modal closes, and a thumbnail of the selected image appears in the sidebar.
4.  **Remove Media**:
    *   Click "Remove" (or "Clear").
    *   **Expected**: Thumbnail disappears, resetting to "Select Image" state.

### Slice 3: Navigation Block

**Objective**: Verify Navigation block functionality and menu resolution.

1.  **Insert Navigation**:
    *   In the editor, insert a "Navigation" block.
2.  **Select Menu**:
    *   In the block settings (sidebar), look for a Menu selector.
    *   Select an existing menu (or create one if needed).
    *   **Expected**: The block renders the items from the selected menu.
3.  **Preview**:
    *   Click "Preview".
    *   **Expected**: The navigation menu renders correctly in the preview window/tab.

### Slice 4: Patterns

**Objective**: Verify pattern insertion.

1.  **Insert Pattern**:
    *   Open the Block Inserter (`+` button).
    *   Switch to "Patterns" tab.
    *   **Expected**: A list of categorized patterns appears.
2.  **Add to Canvas**:
    *   Click a pattern.
    *   **Expected**: The pattern's blocks are inserted into the editor.

### Slice 5: Theme Tokens

**Objective**: Verify visual consistency.

1.  **Visual Check**:
    *   Observe the editor canvas background and text colors.
2.  **Compare**:
    *   Open Preview.
    *   **Expected**: The fonts, colors, and spacing in the editor match the preview exactly (barring admin UI chrome).

## Reporting

Record results in `walkthrough.md` with:
- [PASS/FAIL] status for each slice.
- Screenshots of failures or key successful UI states.
- Notes on any UX friction encountered.
