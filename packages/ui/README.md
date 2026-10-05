# StackReplay UI

Instrument Sans for text and numbers, with tabular figures in tables. Keep code formatting for actual IDs or code. Graphite and warm paper are surfaces; ember identifies actions and citron highlights value. Both themes use semantic tokens.

Import `styles/tokens.css`, `styles/theme.css` and `styles/premium.css` after Tailwind. `/design` shows the primitives with fictional data.

- `PageHeader`, `SectionHeader`: sentence case eyebrow, expressive heading, description, optional actions.
- `Card`, `Panel`: themed containers. `StatTile`: large figure, label, hint and default/ember/citron tone. `Metric`: compact figure.
- `Select`: required `label`, `options` (`value`, `label`, optional `disabled`), controlled `value`/`onValueChange` or `defaultValue`, optional `name`/`required`. Base UI handles arrows, typeahead, Escape, focus return and form input. Use instead of native selects.
- `SegmentedControl`: labeled radio group; `options`, `value`, `onValueChange`. Arrows select, Tab moves on.
- `Tabs`: labeled in-page group; `items` with `value`, `label`, `content`. Base UI handles arrows and panel semantics. Route navigation uses links with `aria-current`.
- `DataTable`: `label`, `rows`, stable `rowKey`, `columns` with `key`, `label`, `render`, optional `compare` and `numeric`. Sort buttons announce `aria-sort`; scroll region is keyboard focusable. Compare raw numbers/BigInts, never formatted prices.
- `EmptyState`: title, description, icon/action slots. `LoadingSkeleton`: accessible status label and rows. `Notice`: info/success/error, title, content, actions; errors are alerts.
- `Button` / `buttonVariants`: primary, secondary, outline, ghost, destructive; minimum 44px targets. Link actions use `buttonVariants`.
- `CatalogSubNav`: Overview, Models, Providers, Benchmarks, Plans, Compare, Updates.
- `ProductHeader`, `ProductFooter`, `ApplicationShell`, `PublicShell`: one header language. Four app sections and a scan action. Mobile menu is a focus-trapped, dismissible Base UI dialog.

Page workers own composition and domain charts. Shared primitives stay here. Unknown facts stay unknown; API equivalents are estimates, never bills or savings. Raw logs never become network payloads.
