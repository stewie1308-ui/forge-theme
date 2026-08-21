# Forge Theme — outstanding work

Everything left after the blocker and high-severity passes.
Verified against the codebase on 2026-08-21 — every item below still exists.

**No submission blockers remain as of 2026-08-21.**

Current state: `shopify theme check` passes with **0 errors, 4 warnings**
(all four are false positives — `RemoteAsset` firing on `<link rel="canonical/prev/next">`
and on a Shopify-hosted video CDN URL).

---

---

## 🟡 Accessibility

### 1. Hero autoplay video ignores `prefers-reduced-motion`
`sections/hero-banner.liquid` has 0 occurrences of `prefers-reduced-motion`. The CSS
media query in `theme.css` disables animations but can't stop a video with `autoplay`.

Fix: gate autoplay behind a JS `matchMedia` check, or render the poster only.

### 2. Formal accessibility verification
Never done, and the README now says so explicitly rather than claiming otherwise:
- [ ] WCAG 2.1 AA contrast audit across all three presets
- [ ] Touch-target sizes measured (claim was 24×24px minimum)
- [ ] Real-device testing on iOS Safari and Chrome for Android

---

## 🟢 SEO / structured data polish

### 3. `aggregateRating` invents a review count
`snippets/structured_data.liquid:47` — `rating_count.value | default: 1`. If a rating exists
with no count, this asserts "1 review" to Google. Fabricated review data is a rich-results
penalty risk.

Fix: only emit `aggregateRating` when `rating_count.value > 0`.

### 4. `og:image` has width but no height
`snippets/og-tags.liquid` emits `og:image:width` (0 occurrences of `og:image:height`).
Some scrapers need both to render a large card.

### 5. Organization logo uses the social share image
`snippets/structured_data.liquid:81` uses `settings.share_image` (1200×630 landscape) as the
schema.org `logo`. Google wants an actual logo. Consider a dedicated setting.

---

## 🔵 Performance

### 6. Collection filtering does a full page reload
`sections/main-collection.liquid:301` — `filtersForm.submit()` on every checkbox change.
The cart already uses the Section Rendering API; filters could too, with no loading state
currently shown either way.

### 7. Product cards always load a second image
`snippets/product-card.liquid` renders `product-card__img--hover` whenever a product has
>1 image, doubling image requests on collection pages for a hover effect most mobile users
never see.

Fix: skip it under `@media (hover: none)`, or load it lazily on first hover.

### 8. Variant switch swaps in a full-resolution image
`sections/main-product.liquid` — `mainImg.src = variant.featured_image.src` uses the raw
CDN URL with no width parameter.

Fix: build a sized `image_url` server-side into the variant JSON, or append `&width=1200`.

---

## ⚪ Nice to have

### 9. Default copy in rich-text and benefits makes claims
`sections/rich-text.liquid` ships default body copy asserting "verified by independent
laboratories" and "peer-reviewed science", naming Forge products directly;
`sections/benefits.liquid` defaults a block heading to "Clinically dosed". Both auto-apply
when a merchant adds the section, so the claims land on their store unedited.

Softer than the review figures (now blanked) because they read as sample prose rather than
data, and a merchant is more likely to rewrite body copy than a number. Left as your call:
blank them, or reword to something obviously illustrative.


### 10. No newsletter signup in the footer
0 occurrences of `form 'customer'` in `sections/footer.liquid`. Standard for the category,
and supplement brands lean hard on email. The password page already has a working
`{% form 'customer' %}` to copy.

### 11. No blog comment form
0 occurrences of `form 'new_comment'` in `sections/main-article.liquid`, but
`locales/en.default.json` already carries all 10 `blog.comment_*` keys — they're written
and unused. Cheap to wire up.

### 12. Theme editor re-render quirks
- `sections/main-collection.liquid` appends a new filter overlay `<div>` to `<body>` every
  time the section re-renders — duplicates stack up while editing.
- `sections/header.liquid` binds the search drawer inside `DOMContentLoaded`, which never
  fires again after a Section Rendering re-render, so search breaks in the editor.

### 13. Dead code
`layout/theme.liquid:193` — `var count = 0;` in `refreshDrawer()` is computed from the
parsed response and then thrown away; the function refetches `/cart.js` instead.
Either use it or delete it and the parse above it.

### 14. Odd coupling: tax note gated behind the VAT toggle
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

Support details (was blocker #1): `theme_support_email` set to `stewart@brunelweb.co.uk`.
`theme_documentation_url` set to https://github.com/stewie1308-ui/forge-theme#readme —
the project was initialised as a git repo and pushed to a public GitHub repo on
2026-08-21 so the README resolves as real documentation. Verified anonymously
reachable (HTTP 200). If the repo is ever made private, this URL 404s for reviewers
and the blocker returns.

Homepage placeholder cards (was #3): `sections/featured-products.liquid` now falls back
to `collections['all']` when the source is a collection and none is chosen, and shows the
skeleton placeholders only when there is genuinely nothing to render. Fixed in the section
rather than only in `templates/index.json`, because the old behaviour shipped skeletons to
the live storefront of any merchant who left the section unconfigured, not just to the demo
homepage. `templates/index.json` also pins `"collection": "all"` so the shipped homepage
states its intent rather than relying on the fallback.

Hero placeholder overlay (found on the dev store, 2026-08-21): with no image or video set,
`sections/hero-banner.liquid` rendered `.hero__media--placeholder`, an absolutely positioned
`inset: 0` div filled with `--color-background-secondary` (#f5f5f3). It painted over the
`background_color` setting the section already applies, so the shipped homepage showed a
near-white box — with `.hero__heading`'s white text on top of it, about 1.05:1 contrast.
Removed the placeholder branch and its CSS rule; the configured `background_color`
(#0a0a0a by default) now shows through, which is what the white text was designed for.

Placeholder sweep (2026-08-21): the other three placeholder branches — product card,
product gallery, collection list — are legitimate; they fire on genuinely missing data
rather than unset settings, and cover nothing configured. All remaining `inset: 0`
overlays check out too. The sweep instead turned up fabricated review claims shipping as
schema defaults: `hero-banner.trust_bar` ("4.9/5 from 2,400+ reviews"),
`testimonials.aggregate_rating` ("4.9") and `testimonials.review_count` ("2,400+").
All four sections have presets, so adding one put invented figures on a live storefront.
Defaults blanked and moved to `placeholder`/`info` hints — the aggregate block is gated
on a non-blank rating, so it now waits for the merchant's own numbers. `templates/index.json`
pins all three, so the demo homepage is unchanged. Also gave the product gallery
placeholder `role="img"` (an `aria-label` on a bare div is ignored) and moved two
hardcoded English strings in `testimonials.liquid` into `sections.testimonials.*`.

Collection grid toggle (was #1): the toggle set an inline `gridTemplateColumns`, which the
mobile rule needed `!important` to fight. The `[data-cols]` attribute it also sets already
drives the CSS, so the inline style was redundant — dropped it, added an explicit
`[data-cols="4"]` rule, and removed the `!important`. (The TODO's stated symptom was
slightly off: author `!important` outranks a normal inline style, so mobile was in fact
holding at 2 columns. The redundancy and the `!important` were real.)

Order history pagination (was #2): `sections/main-account.liquid` now wraps the orders
table in `{% paginate customer.orders by 20 %}` and renders the existing `pagination`
snippet. Also replaced a hardcoded English `default: 'Unfulfilled'` with the new
`customer.orders.unfulfilled` locale key.

Also fixed along the way: account CSS was trapped in `main-account.liquid` (login/register were
completely unstyled), `.page-header` defined twice, and five `| t:` filter-precedence bugs I
introduced and caught before they shipped.
