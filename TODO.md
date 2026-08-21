# Forge Theme — outstanding work

Everything left after the blocker and high-severity passes.
Verified against the codebase on 2026-08-20 — every item below still exists.

Current state: `shopify theme check` passes with **0 errors, 4 warnings**
(all four are false positives — `RemoteAsset` firing on `<link rel="canonical/prev/next">`
and on a Shopify-hosted video CDN URL).

---

## 🔴 Do first — blocks submission

### 1. Documentation URL still a placeholder
`config/settings_schema.json:7` still ships:
```json
"theme_documentation_url": "https://example.com/forge-theme/docs",
```
It's a **required property** — an empty string fails `ValidJSON`, which is why it's a
placeholder rather than blank. Decided on 2026-08-21 to point it at the project README,
but this isn't a git repo yet and the README isn't hosted anywhere, so there's no URL to
use. Needs either the repo URL once it exists, or a real docs page.

`theme_support_email` is done — set to `stewart@brunelweb.co.uk`.

---

## 🟠 Correctness / UX

### 2. Collection grid toggle overrides responsive breakpoints
`sections/main-collection.liquid:285` — `grid.style.gridTemplateColumns = 'repeat(N, 1fr)'`
sets an inline style that beats every media query. Pick "4 columns" on desktop, shrink the
window, and you get 4 columns on a phone. Not persisted across navigation either.

Fix: toggle a `data-cols` attribute (already present on the grid) and drive it from CSS.

### 3. Order history isn't paginated
`sections/main-account.liquid` loops `customer.orders` with no `{% paginate %}`.
A long-standing customer gets every order in one page. Wrap in `{% paginate customer.orders by 20 %}`
and render the existing `pagination` snippet.

### 4. Homepage ships showing placeholder cards
`templates/index.json` sets `featured-products` to `products_source: "collection"` but leaves
`collection` unset, so it falls through to the placeholder branch. Out of the box the demo
homepage shows grey boxes, not products.

Fix: default to `products_source: "manual"`, or point it at `all`.

---

## 🟡 Accessibility

### 5. Hero autoplay video ignores `prefers-reduced-motion`
`sections/hero-banner.liquid` has 0 occurrences of `prefers-reduced-motion`. The CSS
media query in `theme.css` disables animations but can't stop a video with `autoplay`.

Fix: gate autoplay behind a JS `matchMedia` check, or render the poster only.

### 6. Formal accessibility verification
Never done, and the README now says so explicitly rather than claiming otherwise:
- [ ] WCAG 2.1 AA contrast audit across all three presets
- [ ] Touch-target sizes measured (claim was 24×24px minimum)
- [ ] Real-device testing on iOS Safari and Chrome for Android

---

## 🟢 SEO / structured data polish

### 7. `aggregateRating` invents a review count
`snippets/structured_data.liquid:47` — `rating_count.value | default: 1`. If a rating exists
with no count, this asserts "1 review" to Google. Fabricated review data is a rich-results
penalty risk.

Fix: only emit `aggregateRating` when `rating_count.value > 0`.

### 8. `og:image` has width but no height
`snippets/og-tags.liquid` emits `og:image:width` (0 occurrences of `og:image:height`).
Some scrapers need both to render a large card.

### 9. Organization logo uses the social share image
`snippets/structured_data.liquid:81` uses `settings.share_image` (1200×630 landscape) as the
schema.org `logo`. Google wants an actual logo. Consider a dedicated setting.

---

## 🔵 Performance

### 10. Collection filtering does a full page reload
`sections/main-collection.liquid:301` — `filtersForm.submit()` on every checkbox change.
The cart already uses the Section Rendering API; filters could too, with no loading state
currently shown either way.

### 11. Product cards always load a second image
`snippets/product-card.liquid` renders `product-card__img--hover` whenever a product has
>1 image, doubling image requests on collection pages for a hover effect most mobile users
never see.

Fix: skip it under `@media (hover: none)`, or load it lazily on first hover.

### 12. Variant switch swaps in a full-resolution image
`sections/main-product.liquid` — `mainImg.src = variant.featured_image.src` uses the raw
CDN URL with no width parameter.

Fix: build a sized `image_url` server-side into the variant JSON, or append `&width=1200`.

---

## ⚪ Nice to have

### 13. No newsletter signup in the footer
0 occurrences of `form 'customer'` in `sections/footer.liquid`. Standard for the category,
and supplement brands lean hard on email. The password page already has a working
`{% form 'customer' %}` to copy.

### 14. No blog comment form
0 occurrences of `form 'new_comment'` in `sections/main-article.liquid`, but
`locales/en.default.json` already carries all 10 `blog.comment_*` keys — they're written
and unused. Cheap to wire up.

### 15. Theme editor re-render quirks
- `sections/main-collection.liquid` appends a new filter overlay `<div>` to `<body>` every
  time the section re-renders — duplicates stack up while editing.
- `sections/header.liquid` binds the search drawer inside `DOMContentLoaded`, which never
  fires again after a Section Rendering re-render, so search breaks in the editor.

### 16. Dead code
`layout/theme.liquid:193` — `var count = 0;` in `refreshDrawer()` is computed from the
parsed response and then thrown away; the function refetches `/cart.js` instead.
Either use it or delete it and the parse above it.

### 17. Odd coupling: tax note gated behind the VAT toggle
`cart.taxes_and_shipping_policy_at_checkout_html` renders only when
`settings.show_vat_note` is on. Two unrelated concerns sharing one switch.

---

## Reference — already done

Blockers (all 9): missing templates ×7, doubled canonical/`og:url`, malformed `////` image
URLs, locale-formatted JSON-LD prices, `form.errors` outside `{% form %}`, invisible password-recovery
confirmation, hero video piped through `asset_url`, hardcoded `/checkout`, locale-dropping cart AJAX.

High severity (all 15): three presets created, `cart_type` + `card_image_ratio` wired up,
2,451 lines of CSS extracted from inline `<style>` blocks, quick add + badges made accessible,
qty stepper reaching 0, swatch CSS injection removed, footer nofollow inverted back, ~90 strings
translated, Supplement Facts `.value` fix, `@app` blocks on product/collection/cart, localization
form, compare-at price, mega menu on touch, closed drawers out of the tab order.

Cart de-duplication (was #4): the item list and footer are now single snippets,
`snippets/cart-contents.liquid` and `snippets/cart-footer.liquid`, rendered by both
`snippets/cart-drawer.liquid` (first paint) and `sections/cart-items.liquid` (Section
Rendering refresh). Closing the drift also fixed two live bugs: upsells now appear on
first paint rather than only after a JS refresh, and the drawer's qty/remove controls
get the ARIA labels that previously existed only in the refreshed markup.

Cart page quantity controls (was #3): the qty inputs in `sections/main-cart.liquid`
now carry `data-cart-line`, so the +/- buttons drive the existing AJAX path instead of
firing a `change` nothing listened for. `name="updates[]"` stays, so the no-JS
"Update cart" submit still works. Because a drawer refresh does not touch the cart
page's table, `refreshCartPage()` in `layout/theme.liquid` re-renders the section via
`?section_id=` and restores focus to the control that was clicked; cart mutations are
now serialised through `mutateCart()` and the section is marked `aria-busy` in flight,
because line numbers are positional and two overlapping requests hit the wrong line.
Added the `cart.update_error` locale string for the failure toast.

Upsell single pass (was #7): `snippets/cart-contents.liquid` captures the upsell markup
in one loop with a `break` at two items, and emits the wrapper only if the capture is
non-blank. No `limit:` — see the comment in the file for why.

Accessibility batch (was #6, #7, #8, #9, #11):
- Product tabs and gallery thumbnails: dropped the invalid `role="list"`/`role="listitem"`
  nesting in `sections/main-product.liquid`. The thumbnail container keeps its label as
  `role="group"` — a `list` with no `listitem` children is invalid too.
- Cart drawer `closeCart()` now restores focus to whatever opened it, guarded by
  `document.contains()` in case that element was re-rendered.
- Search drawer got `Forge.trapFocus` plus focus restore, deferred past the
  visibility transition. Its Escape handler is now guarded — it is bound at document
  level and was stripping `no-scroll` off the body on every Escape anywhere.
- Header logo `height="auto"` replaced with a computed intrinsic height. The pattern in
  `main-password.liquid` that this was supposed to copy was itself broken — it divided
  before multiplying, and Liquid integer-divides, so `height | divided_by: width` truncated
  to 0 for any logo wider than tall. Both files now multiply first.

Supplement panel format switch (was blocker #2): added the `supplement_panel_format`
theme setting under UK & EU Compliance, defaulting to `eu_nrv` and pinned explicitly in
all three presets. `snippets/supplement-facts.liquid` now resolves title, amount column
header, table caption and both footnotes from the selected format; the metafield shape
and row markup are unchanged, so switching format needs no data re-entry. Added eight
EU strings to `locales/en.default.json`. `dv` values are passed through as entered and
deliberately NOT converted between NRV and DV — documented in the README and in the
snippet header. Also replaced a hardcoded English `aria-label` on the panel that had
escaped the translation pass, and neutralised the now format-specific "Show Supplement
Facts panel" label in `main-product.liquid`.

Also fixed along the way: account CSS was trapped in `main-account.liquid` (login/register were
completely unstyled), `.page-header` defined twice, and five `| t:` filter-precedence bugs I
introduced and caught before they shipped.
