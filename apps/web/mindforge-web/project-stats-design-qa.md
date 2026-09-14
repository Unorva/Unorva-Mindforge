# 项目管理圆角卡片布局视觉核验

## Comparison target

- Source visual truth: `C:\Users\yanshijie\AppData\Local\Temp\codex-clipboard-041b8c1d-f30e-4b6f-8629-a03e14d87b94.png`.
- Implementation: `http://localhost:5173/apps/projects`, captured in the existing logged-in Edge session.
- Source pixels: 3140 × 1638 at approximately 2× density, normalized to about 1570 × 819 CSS px.
- Implementation viewport: 1592 × 786 CSS px at DPR 2; content width 1577 px with no horizontal page overflow.
- State: one active project with one requirement and one open defect; light theme and the application's current card-shadow preference.
- Implementation screenshot evidence: live browser capture in the Codex browser session; the browser connector did not expose a persistent filesystem path.

## Design intent

The source established the page content and hierarchy, while the requested redesign changes the composition for rounded, elevated cards. Shared UI primitives and component-library styles remain unchanged; only the project page layout and page-level composition were edited.

## Full-view comparison evidence

- The source grouped the statistics, toolbar and project list inside one large rectangular work area with divider strips. The implementation separates them into independent card islands with 16–20 px gaps, so each rounded edge and shadow has room to read cleanly.
- The three statistics remain equal width on desktop. At the checked viewport each card is 416 × 188 px, with aligned top and bottom edges.
- The toolbar is now its own 1281 × 78 px card and combines the section title, description, search and primary action without introducing a second nested frame.
- Project cards sit directly on the page canvas instead of inside another card. Their internal metrics use a muted rounded panel, avoiding extra divider lines.
- The detail route uses one project-summary card followed by a separate navigation card and content-workspace card. Desktop keeps a 13 rem navigation rail; mobile changes it to a horizontal scrollable tab row above the content card.

## Focused region comparison evidence

- Statistics: labels, values, semantic badges, icons and the scroll action were checked at desktop size. The information order is consistent across all three cards.
- Project card: icon, status, title, two-line description, metrics and metadata were checked for alignment and truncation.
- Detail workspace: requirements table, action button, tabs and pagination were checked on desktop and at a 390 × 844 mobile viewport. The page itself does not overflow horizontally; the existing data table retains its own horizontal scrolling behavior.

## Required fidelity surfaces

### Fonts and typography

The page continues to use the existing Geist stack and component typography. Titles, section labels, metrics and supporting copy use the existing font weights and remain readable in Chinese at desktop and mobile widths.

### Spacing and layout rhythm

The new composition uses a consistent 16 px card-grid gap and 20 px major-section gap. Rounded cards no longer touch through 1 px divider grids, and nested-card depth is limited to meaningful content regions.

### Colors and visual tokens

All surfaces use existing `background`, `card`, `muted`, `border`, `primary` and semantic status tokens. No new global color, radius or shadow token was introduced.

### Image quality and asset fidelity

The screen contains no product imagery. Existing Lucide icons are retained; no raster placeholders, custom SVGs or CSS-drawn assets were added.

### Copy and content

The original project data and Chinese labels are preserved. The only added copy is the short “我的项目” section description that explains the grouped content.

## Comparison history

- Earlier issue [P1, fixed]: rounded cards were connected by border-colored 1 px gaps inside one oversized parent card, making shadows and radii compete. Fixed by promoting statistics, toolbar and project cards to sibling page-level regions.
- Earlier issue [P2, fixed]: the project list toolbar and cards shared the same parent boundary, so the single project card looked stranded in a large empty white box. Fixed by separating the toolbar card and placing the responsive project grid directly on the page canvas.
- Earlier issue [P2, fixed]: the detail page mixed an uncarded header with one large content card. Fixed by using a summary card plus separate navigation and work-area cards, with a mobile horizontal-tab adaptation.

## Browser and interaction checks

- Desktop project list rendered at 1592 × 786 with no horizontal body overflow.
- Project-card navigation opened `/apps/projects/1` and rendered the requirements workspace.
- Mobile list and project-detail layouts were checked at 390 × 844.
- Production build passed.
- Targeted ESLint for `src/views/apps/projects/index.tsx` passed.
- Full-repository ESLint still reports pre-existing errors in blog, notes, shared data-table, header and daily-review files; none are in the edited project page.
- One pre-existing Base UI console error originates from `layouts/full/vertical/header/Profile.tsx`; it is outside this page-only layout change.

## Follow-up polish

- [P3] When more project records exist, re-check the visual balance of the 2- and 3-column grid at the largest desktop breakpoint.

final result: passed
