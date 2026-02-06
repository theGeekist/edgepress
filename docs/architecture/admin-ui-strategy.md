# Admin UI Strategy (Phase 10)

## Scope
Build a WordPress-like admin product on top of the existing Edgepress publish/release loop, with clear information architecture and user-facing publishing semantics.

## Product Objectives
- Make content authoring feel first-class, not like a diagnostics harness.
- Match WordPress mental models: content types, post settings, permalink, excerpt, media, featured image, publish status.
- Keep release plumbing behind user language (`Publish`, `View live`).
- Preserve Gutenberg compatibility while progressively expanding admin surfaces.

## Product Information Architecture
- Primary navigation:
  - Dashboard
  - Content
  - Media
  - Appearance
  - Settings
- Content sub-navigation:
  - Pages
  - Posts
  - Drafts
  - Published
- Editor workspace:
  - Top bar: identity + global actions.
  - Left rail: content list, search/filter/type/status.
  - Main surface: title + Gutenberg canvas.
  - Right rail: publish panel + post settings + metadata.

## Content Model (UI Semantics)
- User-facing entity name: `Content`.
- Required UI fields:
  - `type`: `page` | `post`
  - `status`: `draft` | `published`
  - `title`
  - `slug` (permalink path segment)
  - `excerpt` (optional)
  - `publishedAt` / scheduled date
  - `featuredImage` (optional media ref)
- Internal model may remain `document` during transition, but UI must always render content semantics.

## User-Facing Action Language
- Keep only intent verbs in primary surfaces:
  - `New page`, `New post`
  - `Save draft`
  - `Preview`
  - `Publish` (single user action that publishes and makes live)
  - `View live`
- Remove plumbing language from core UI:
  - Avoid `release id`, `job id`, `private read miss/hit` in primary feedback.
  - Keep diagnostics under advanced/troubleshooting panels only.

## Editor Surface Requirements
- Title input behaves like headline input (high visual priority).
- Save state visible near title (`Saving...`, `Saved`, `Unsaved changes`).
- Gutenberg inserter/toolbar must be interactive and contextually visible.
- Source/Visual mode is available but visually secondary to content editing.

## Publish Panel Contract (Right Rail)
- Status card:
  - Draft/Published state
  - Last saved timestamp
  - Publish timestamp or scheduled date
- Actions:
  - `Preview`
  - `Publish` (primary; publishes and makes live)
  - `View live` link when available
- Post settings card:
  - Permalink editor (slug)
  - Excerpt field
  - Date/schedule field
  - Featured image picker/removal
- Revisions card:
  - Human-readable timeline (not raw ids).

## Preview and Theme Strategy
- Separate `admin chrome theme` from `content preview skin`.
- Always render preview/content canvas with a readable default skin:
  - typography, spacing, max width, list/media defaults.
- If site theming is not enabled, explicitly label preview as `Default reading skin`.

## Component Architecture Contract
- `app/*`: composition root and app controller orchestration only.
- `features/layout/*`: page shell, navigation, rails.
- `features/content/*`: content list, filters, type/status views.
- `features/editor/*`: canvas + editor state.
- `features/publishing/*`: publish panel, status, live actions.
- `features/media/*`: media picker, featured image, media metadata.
- `features/settings/*`: permalink/date/excerpt inputs and validation.
- `components/ui/*`: visual primitives only.

## Delivery Plan (Phase 10 Slices)
1. Admin IA baseline:
  - Introduce top-level navigation and content sub-navigation.
  - Add type-aware list (`Pages`, `Posts`) with status chips and search/filter.
2. Editor workspace parity:
  - Finalize left/center/right shell with publish panel.
  - Standardize action language and remove internal jargon from feedback.
3. Post settings parity:
  - Add permalink, excerpt, date/schedule, featured image controls.
  - Persist settings through canonical API model.
4. Media and featured image:
  - Media browser/upload integration.
  - Featured image assignment and preview.
5. Revisions and publishing polish:
  - Human-readable revisions timeline.
  - View live flow and publish outcomes in product language.
6. Preview skin:
  - Ship default reading skin with explicit semantics.

## Current Increment (Implemented)
- Added primary admin navigation surface with section switching (`Dashboard`, `Content`, `Media`, `Appearance`, `Settings`), with non-content sections currently placeholder-backed.
- Upgraded content rail into a type/status-aware list with search and filters (`All/Pages/Posts`, `Any status/Draft/Published`).
- Added right-rail `Post Settings` panel with:
  - content type toggle (`Page` / `Post`)
  - permalink slug input
  - excerpt input
  - publish date input
  - featured image URL input
- Kept publishing as a separate right-rail panel (`Preview`, `Publish`, `View preview`) to maintain center-stage editor focus.
- Persisted content UI metadata and auth session in browser storage to make refresh behavior and content semantics stable during authoring sessions.

### Transitional Note
- Post-settings fields currently persist in admin-side metadata storage and are not yet fully canonical API fields.
- Next slice will move these settings into the API/domain model so Pages/Posts and post settings are first-class persisted entities end-to-end.

## Acceptance Criteria
- Users can create and manage both Pages and Posts from dedicated views.
- Users can edit permalink, excerpt, publish date, and featured image in the editor.
- Publish workflow uses only user-facing language and reveals no internal IDs in core flows.
- Refresh does not force re-login when session is valid.
- Preview and live viewing are one-click actions from publish panel.
- UI structure remains modular with bounded responsibilities per feature folder.

## Non-Goals (Current Phase)
- Full wp-admin clone parity across every legacy screen.
- Plugin marketplace and arbitrary plugin execution.
- Multi-user editorial workflow (roles/approvals) beyond current auth model.
