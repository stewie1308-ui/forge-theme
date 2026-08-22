# Forge Theme — outstanding work

Everything left after the blocker and high-severity passes.
Verified against the codebase on 2026-08-21; items 2, 4, 5 and 14 fixed on 2026-08-22.

**No submission blockers remain as of 2026-08-21.**

Current state: `shopify theme check` passes with **0 errors, 4 warnings**
(all four are false positives — `RemoteAsset` firing on `<link rel="canonical/prev/next">`
and on a Shopify-hosted video CDN URL).

---

---

## 🧪 Dev store setup — blocks visual verification

### 1. Re-import the demo CSV — 13 of 15 definitions now exist
Store: `forge-e8mvi2rk.myshopify.com` · theme pushed unpublished as **Forge** (#190581342517)

The demo products imported on 2026-08-21, but **all 15 metafield columns were silently
dropped** — Shopify's product importer only accepts metafield columns that already have a
definition, and reports success regardless.

**Created in the admin on 2026-08-22** (all with Storefront API access on):

| Namespace | Keys | Type |
|---|---|---|
| `supplement_facts` | `serving_size`, `servings_per` | Single line text |
| `supplement_facts` | `calories` | Integer |
| `supplement_facts` | `rows` | JSON |
| `forge` | `subtitle`, `other_ingredients` | Single line text |
| `forge` | `directions`, `ingredients`, `warnings` | Rich text |
| `forge` | `ingredient_list` | JSON |
| `forge` | `lab_report_url` | URL |
| `forge` | `ingredient_count` | Integer |
| `forge` | `allergen_flags` | List of single line text |

**Still missing: `reviews.rating` and `reviews.rating_count`.** Shopify refuses them —
saving returns "This namespace and key combination is reserved for standard definitions",
and no matching standard is offered in this store's suggestion picker (searching "Product
rating" returns nothing; "Star rating" is `shopify.star-rating`, a list scoped to freezer
categories). The `reviews` namespace is writable only by review apps. So star ratings, and
the `aggregateRating` in `snippets/structured_data.liquid`, stay unverifiable until either
a review app is installed (Judge.me and similar create both definitions on install) or
they are created through the Admin API by an app holding the right scope.

Two unrelated bugs in `demo/products-with-metafields.csv` were fixed on 2026-08-22: tags were
pipe-separated (`multivitamin|daily|essentials|vegan`), so every product had arrived carrying
one long single tag instead of four; and the variant continuation rows repeated the
product-level fields (Title, Tags, Body, SEO, Status) while leaving the metafield columns
blank, which would have blanked the metafields on the three multi-variant products.

Note: `forge.certifications` is documented in the README metafield table but **nothing in
the theme reads it**, and it is not a demo CSV column — deliberately not created. See the
nice-to-have item below.

**The CSV importer will not carry these metafields — proven by experiment on 2026-08-22.**
A minimal one-row file (`Handle`, `Title`, `Option1 Name`, `Option1 Value`, `Variant SKU`,
`Variant Price`, `Metafield: forge.subtitle [single_line_text_field]`) was imported against
`ashwagandha-ksm66` with "Overwrite products with matching handles" ticked. Shopify reported
"Products imported" and **applied the Title from that same row**, but `forge.subtitle` stayed
empty — with the definition present and the type matching exactly. So the columns are being
silently ignored, not lost to a formatting or matching problem.

Note: the importer also rejects a metafield-only file outright — "Product options input is
required when updating variants" — so any test file must carry the variant option columns.

Populate the metafields another way: by hand in the admin, or via the Admin API
(`metafieldsSet`) from an app with `write_products`. Doing one product by hand is enough to
unblock the visual pass, which only needs a single product page to render.

Remaining steps:
1. ~~Populate the metafields on at least one product.~~ **Done 2026-08-22** — all 13 were
   entered by hand on `ashwagandha-ksm66` in the admin and verified after a reload. The
   rich text fields (`directions`, `ingredients`, `warnings`) were entered as plain
   sentences, since the admin gives a rich-text editor rather than the rich-text JSON the
   CSV stores. The two JSON fields were set through the DOM rather than typed, because the
   editor auto-closes brackets. The other nine products are still empty.
2. Then check the Supplement Facts panel, ingredients panel and allergen badges render on
   the storefront. This is now unblocked — the product page has everything it needs.
3. Optional: upload `demo/images/*.png` to Content → Files and run
   `python demo/set-image-urls.py --sample-url "<any uploaded URL>"` to swap the Unsplash
   images for the supplied ones, then import `demo/products-with-images.csv` instead.

Then the visual pass that has never been done — see the accessibility verification item
below, plus: homepage cards and hero, cart +/- and drawer upsells, keyboard focus in both
drawers, and the supplement panel in both FDA and EU NRV modes.

---

## 🔴 Found in the storefront visual pass (2026-08-22)

**V1–V5 fixed, pushed to the Forge draft theme and re-verified live on 2026-08-22.**
V6 remains an open decision. Verification evidence:
- V1 — focus set on "Increase quantity", clicked: focus is still on "Increase quantity" and
  inside the drawer afterwards, quantity updated. Same result for "Decrease quantity".
- V2 — opening the search drawer now lands focus on `#SearchDrawerInput` inside the dialog;
  Escape still returns it to the header Search button.
- V3 — `.hero__eyebrow` measures 136px inside its 680px column, instead of 680px.
- V4 — the panel header reads "1 active ingredient".
- No regressions: cart drawer still focuses Close on open, the Supplement Facts panel and
  ingredients panel render unchanged, and all JSON-LD still parses.

The same push also carried the four earlier fixes. `og:image:height` is now emitted on the
product page as 1800 against a width of 1200 — a portrait source image, which confirms the
multiply-before-divide actually works rather than truncating to 0.

Run against the **Forge** draft theme as pushed on 2026-08-21, via the admin theme preview
(the store is password protected, so the preview session is the only way in). The four code
fixes made on 2026-08-22 are local only and were **not** exercised by this pass.

### V1. Cart drawer loses focus on every quantity change — FIXED
Confirmed: focus set on "Increase quantity", clicked, and after the refresh
`document.activeElement` is `<body>` — outside the still-open dialog. A keyboard user
adjusting quantity is ejected from the drawer on every press and has to tab back in from
the top of the document.

`refreshDrawer()` in `layout/theme.liquid` swaps `innerHTML` and destroys the focused
button. Fixed by giving it the same focus capture/restore `refreshCartPage()` already had:
the line number and `data-action` are read synchronously before the first `await`, and focus
is only restored when it was genuinely inside the drawer, so the two cannot fight each other
when both run from `mutateCart()`.

### V2. Search drawer never moves focus into the dialog — FIXED
Confirmed by sampling `document.activeElement` at 0.3s, 0.8s, 1.5s, 2.5s and 4s after
opening: focus stays on the header "Search" button every time, while
`#SearchDrawerInput` sits unfocused inside an open `role="dialog"`. Escape and focus
restore both work, and the cart drawer does move focus (to its Close button) — so the two
drawers are inconsistent, and a search drawer in particular should focus its input.

Root cause was in `Forge.trapFocus` (`assets/theme.js`), not in the search drawer at all: its
focusable selector matched `input:not([disabled])`, and the first such element in the drawer
is `<input type="hidden" name="type" value="product">`. `first.focus()` on a hidden input is a
silent no-op, so focus stayed on the button behind the dialog — and the shift+Tab wrap
targeted an unfocusable element too. Fixed by excluding `[type="hidden"]` and filtering to
elements that actually render (`getClientRects().length > 0`). This hardens the cart drawer
against the same trap, which only worked by luck because its first focusable is a button.

### V3. `.hero__eyebrow` stretches the full column width — FIXED
It is a `<span>` with `display: block`, so its `rgba(255,255,255,0.1)` / `999px` pill
background renders as a 680px bar with "New formula" at the far left, instead of hugging
the text. The rule already said `inline-block` — the cause was `.hero__inner`, a column flex
container with no `align-items`, so it defaults to `stretch` and CSS blockifies the
`inline-block` flex item. Fixed with an explicit `width: fit-content`, which hugs in all
three alignments and leaves the `--center`/`--right` modifiers to place it.

### V4. "1 active ingredients" — FIXED
The ingredients panel header printed the raw `forge.ingredient_count` against a hardcoded
plural, so a single-ingredient product read "1 active ingredients". Fixed by making
`products.product.active_ingredients` a `one`/`other` object, matching the pluralised form
already used by `product_count`, `reviews_with_count` and `comments_with_count`.

### V5. The demo homepage still ships invented review figures — FIXED
`★★★★★ 4.9/5 from 2,400+ reviews` renders live in the hero trust bar. The section
*defaults* were blanked earlier, but `templates/index.json` pins the original values, so the
demo storefront still asserts fabricated social proof. Same family as the rich-text claims
item below.

Blanked on 2026-08-22: `hero.trust_bar`, `testimonials.aggregate_rating` and
`testimonials.review_count` are now empty strings in `templates/index.json`, matching the
section defaults that were blanked earlier. `show_aggregate` stays `true` — the section
already gates on a non-blank rating, so it simply waits for the merchant's own numbers.
Verified on the storefront: the hero ends at its button with no empty trust row, and the
testimonials section renders its heading and three cards with no gap where the aggregate was.

The three testimonial blocks were blanked too, on the same day. They were worse than the
figures: invented quotes attributed to "James T.", "Sarah M." and "Dr. R. Patel", each with
five stars and a **"Verified" badge** — and they shipped in `sections/testimonials.liquid`
as *both* the block setting defaults and the section preset, so any merchant adding the
section, or even a single block, got fabricated verified reviews on their storefront. Only
the `templates/index.json` copy was visible on the demo homepage.

Blanking alone would have left three empty cards, because the loop drew an `<article>` per
block regardless and the author footer and initials avatar render even with no text. So
`sections/testimonials.liquid` now skips any block whose quote is blank, and hides the whole
section when neither a review nor an aggregate survives — the convention the aggregate block
already used. `verified` now defaults to `false` with an info hint that it is only for a
review you have actually verified, and the name/quote/subtitle defaults became placeholders.
Verified on the storefront: the section disappears entirely, products flow straight into
"Our promise to you", and no empty heading, grid or card remains.

### V6. `®` renders oversized in display headings — FIXED
In the serif display face used for `h1` and product card titles, `®` draws at full size —
"Ashwagandha KSM-66® 600mg" reads as though the mark is a typo. Renders correctly in body
copy. Cosmetic, but it is on every heading of every trademarked product.

Measured: at 40px, Georgia draws `®` 37.7px wide against 28.1px for a capital R. Fixed with a
`@font-face` named `ForgeMark` that serves only `U+00AE`, `U+2122` and `U+2117` from a local
serif at `size-adjust: 60%`, placed first in the heading stack so every other character falls
through to the merchant's chosen font. Browsers without `size-adjust`, or platforms where no
`local()` source resolves, fall through too and render as before. After the fix the mark
measures 0.81× a capital R instead of 1.34×.

### V7. "1 results for ..." on the search page — FIXED
`sections/main-search.liquid:53` uses `general.search.results_for_html`, whose value is the
hardcoded `"{{ count }} results for …"`. Line 55, the branch with no search terms, already
uses the correctly pluralised `results_with_count`. So the pluralised string exists and is
used on one branch but not the other — the same shape as V4, and as the ten written-but-unused
`blog.comment_*` keys. Searching "ashwagandha" renders "1 results for “ashwagandha”" while
Shopify's own page title on the same request reads "1 result found". Fixed by making
`results_for_html` a `one`/`other` object; the page now reads "1 result for “ashwagandha”".

### V8. The font picker never applied — FIXED
Found while fixing V6, and the largest problem of the pass: **no store using this theme has
ever rendered in the fonts it selects.** Two independent causes, either of which was enough
on its own.

1. `theme.css` re-declares `--font-body-family`, `--font-heading-family` and
   `--font-heading-weight` in `:root`, and `layout/theme.liquid` linked it *after* the
   `{% style %}` block that writes the settings. Same specificity, later sheet wins — walking
   the CSSOM confirmed the winning rule came from `theme.css`. Fixed by loading `theme.css`
   before the settings block, which is the conventional order and protects every other token
   too, not just the three that happened to collide.
2. A multi-word family already arrives quoted, so `{{ heading_font.family | json }}` emitted
   `""Playfair Display""` — invalid CSS, dropped by the parser. Fixed by stripping quotes
   before `json`.

The theme's own presets specify Playfair Display and Inter; both were being fetched and left
`unloaded`. After the fix `document.fonts` reports Playfair Display 400, Inter 400 and Inter
700 as `loaded`, and the heading stack computes to `"ForgeMark", "Playfair Display", serif`.

**This visibly changes the site.** Headings are now Playfair Display at the configured weight
400 rather than Georgia bold, and body copy is Inter rather than system-ui. That is the
intended design, but it is worth a look before you decide it is right.

### Mobile pass (2026-08-22)
Run at a 500px viewport — Chrome's minimum window width, so wider than a real phone but below
the mobile breakpoint, and enough to exercise the mobile layout. Real-device testing is still
outstanding.

Healthy: no horizontal scroll on the product or collection pages (`scrollWidth` equals
`clientWidth`; the only off-viewport elements are the off-canvas mobile nav parked at
`left: -360px`, which is intentional). Product page stacks in the right order — gallery,
title, subtitle, price, add to cart, tabs. The Supplement Facts panel holds its full table
width with no overflow and stays readable. The collection page hides the filter sidebar and
drops to a two-column grid, which is what the "FILTER" button is for.

Worth noting: that button is *also* shown on desktop alongside the always-open sidebar, so the
redundancy is a desktop-only issue.

### Reviewed and healthy
Collection page (breadcrumb, product count, sort, filter sidebar, grid/list toggle — the
2-column toggle works), cart page (line table, order note, order summary, VAT and shipping
notes, update/continue actions), search results, and the 404 page (accent numeral, both CTAs
and a search box). No console errors on a full product page load.

### Not testable in this setup
The browser window would not resize below its maximized size — `window.innerWidth` stayed at
1920 after a resize to 400px — so no mobile viewport was exercised. Real-device testing is
still outstanding, as the accessibility item below already says. The account pages could not
be screenshotted either; the extension blocks captures on login screens.

### Verified working
Supplement Facts panel in EU NRV mode — "Nutrition Information" title, serving size,
servings per container, "Energy — 2 kcal", `%NRV*` column, bold parent row, indented
`sub: true` row, both `†` footnotes and the other-ingredients line, all driven by the JSON
metafield. Ingredients panel with icon, dose badge and benefit. Allergen badges, subtitle,
all five product tabs, compare-at price with "Save 23%", VAT note, quantity stepper.
Cart drawer: opens on add, correct ARIA labels, AJAX quantity update with subtotal and
header count, Escape closes and restores focus to the Add to cart button, reopening focuses
Close, `role="dialog"` with `aria-hidden` and `no-scroll` managed correctly.
Homepage: bundled WebP hero, benefits grid, product cards with no skeleton placeholders,
footer with supplement disclaimer and the localization selector.

### Not covered
- **FDA mode of the supplement panel** — needs `supplement_panel_format` flipped in theme
  settings; only `eu_nrv` was seen.
- **Star ratings** — impossible until `reviews.*` exists (see item 1).
- Only `ashwagandha-ksm66` has metafields, so every other product page renders without the
  panels.

### Store config, not theme defects
- Prices render in USD ($32.99) while the theme copy says "Free UK delivery on orders over
  £40" and "Price includes VAT" — the dev store's default market is United States.
- Shopify's default **Gift Card** (vendor "Snowboard Vendor", "Sold out") appears in "Our
  bestsellers", because the section falls back to `collections['all']`.

---

## 🟡 Accessibility

### 2. Formal accessibility verification
Never done, and the README now says so explicitly rather than claiming otherwise:
- [ ] WCAG 2.1 AA contrast audit across all three presets
- [ ] Touch-target sizes measured (claim was 24×24px minimum)
- [ ] Real-device testing on iOS Safari and Chrome for Android

---

## 🟢 SEO / structured data polish

### 3. Organization logo uses the social share image
`snippets/structured_data.liquid:81` uses `settings.share_image` (1200×630 landscape) as the
schema.org `logo`. Google wants an actual logo. Consider a dedicated setting.

---

## 🔵 Performance

### 4. Collection filtering does a full page reload
`sections/main-collection.liquid:301` — `filtersForm.submit()` on every checkbox change.
The cart already uses the Section Rendering API; filters could too, with no loading state
currently shown either way.

### 5. Product cards always load a second image
`snippets/product-card.liquid` renders `product-card__img--hover` whenever a product has
>1 image, doubling image requests on collection pages for a hover effect most mobile users
never see.

Fix: skip it under `@media (hover: none)`, or load it lazily on first hover.

### 6. Variant switch swaps in a full-resolution image
`sections/main-product.liquid` — `mainImg.src = variant.featured_image.src` uses the raw
CDN URL with no width parameter.

Fix: build a sized `image_url` server-side into the variant JSON, or append `&width=1200`.

---

## ⚪ Nice to have

### 7. Default copy in rich-text and benefits makes claims
`sections/rich-text.liquid` ships default body copy asserting "verified by independent
laboratories" and "peer-reviewed science", naming Forge products directly;
`sections/benefits.liquid` defaults a block heading to "Clinically dosed". Both auto-apply
when a merchant adds the section, so the claims land on their store unedited.

Softer than the review figures (now blanked) because they read as sample prose rather than
data, and a merchant is more likely to rewrite body copy than a number. Left as your call:
blank them, or reword to something obviously illustrative.

### 8. No newsletter signup in the footer
0 occurrences of `form 'customer'` in `sections/footer.liquid`. Standard for the category,
and supplement brands lean hard on email. The password page already has a working
`{% form 'customer' %}` to copy.

### 9. No blog comment form — DONE 2026-08-22
Built and rendering on the dev store; see the Reference section. Comments were enabled on the
**News** blog as "Allowed, pending moderation" and a temporary post
(`test-post-comment-form-verification`) created to exercise it — both still in place, and both
safe to remove. Still unverified: the `form.posted_successfully?` notice and the paginated
comment list, which only run after a comment is actually posted.

### 10. Theme editor re-render quirks
- `sections/main-collection.liquid` appends a new filter overlay `<div>` to `<body>` every
  time the section re-renders — duplicates stack up while editing.
- `sections/header.liquid` binds the search drawer inside `DOMContentLoaded`, which never
  fires again after a Section Rendering re-render, so search breaks in the editor.

### 11. Odd coupling: tax note gated behind the VAT toggle
`cart.taxes_and_shipping_policy_at_checkout_html` renders only when
`settings.show_vat_note` is on. Two unrelated concerns sharing one switch.

### 12. `forge.certifications` is documented but never read
`README.md` lists `certifications` (List of text, "Certification badges") in the `forge`
metafield table, and `locales/en.default.json:123` carries a `certifications` string — but
0 occurrences in `sections/`, `snippets/`, `layout/` or `templates/`, and it is not a
column in `demo/products-with-metafields.csv`. A merchant following the README creates a
definition, fills it in, and gets nothing on the page.

Fix: either drop the README row and the orphaned locale string, or wire the badges up next
to the allergen flags on the product page, which already has the pattern to copy.

Reduced-motion hero (was #2): `sections/hero-banner.liquid` no longer sets `autoplay` on the
background video. An `autoplay` attribute cannot be undone from CSS, so the
`prefers-reduced-motion` block in `theme.css` could stop the animations but not the video.
Playback now starts from a small inline script that bails out when
`matchMedia('(prefers-reduced-motion: reduce)')` matches, leaving the poster frame in place.
The `<video>` gained a section-scoped id so multiple hero sections cannot collide.

aggregateRating review count (was #4): `snippets/structured_data.liquid` no longer falls back
to `default: 1` for `reviews.rating_count`. Both a rating and a count greater than zero are
now required before `aggregateRating` is emitted at all, so a rating with no count stops
asserting a review that does not exist to Google.

og:image height (was #5): `snippets/og-tags.liquid` now derives `og:image:height` from the
source image instead of shipping only a hardcoded width. The four possible sources (product,
article, collection, `settings.share_image`) have different aspect ratios, so each branch now
assigns the image object and the height is computed once from it. Multiplied before dividing —
Liquid divides integers, so `height | divided_by: width` truncates to 0 for any landscape
image, the same trap that had broken the header logo.

Dead code in refreshDrawer (was #14): removed the `[data-cart-count-drawer]` parse in
`layout/theme.liquid` whose result was computed and thrown away. The `/cart.js` fetch below it
is authoritative and was already the only thing feeding `updateCartCount()`.

---

## 🧹 Unused-declaration sweep (2026-08-22)

Findings only — nothing deleted, because some of it is deliberate surface for merchants.

### S1. 23 locale keys nothing references — 9 now wired
**Update 2026-08-22:** the blog comment form was built, taking the count from 23 to 14.
`blog.article_metadata_html` is the one blog key still unreferenced — see the note at the end
of this item.

### S1 (original finding). 23 locale keys nothing references
Out of 248 leaf keys. Verified by substring search of every `.liquid`/`.js`/`.json` outside
`locales/`, then spot-checked with grep.

- **The blog comment form — 10 keys.** `blog.comment_form_title`, `_name`, `_email`, `_body`,
  `_submit`, `blog.comment_success`, `blog.comment_moderated`, `blog.comments_with_count`,
  `blog.article_comments`, `blog.article_metadata_html`. Already tracked as its own item: the
  strings are written and translated, the form was never wired up.
- **Guest checkout login:** `customer.login.guest_title`, `customer.login.sign_in_guest`.
- **Order history:** `customer.orders.order_number_link`, `customer.orders.discount`,
  `customer.account.details`.
- **Loose ends:** `accessibility.loading`, `collections.all_title`, `general.search.view_all`,
  `general.password_page.powered_by_shopify_html`, `products.product.image`,
  `products.product.unavailable`, `sections.footer.copyright`.
- **`products.product.certifications`** — pairs with the `forge.certifications` metafield that
  the README documents and nothing reads. Both halves of a feature exist except the feature.

`general.search.view_all` and `products.product.unavailable` are worth a look before deleting:
they suggest a predictive-search "view all results" affordance and a sold-out variant state
that may be genuinely missing rather than merely undeclared.

**`blog.article_metadata_html` ("By {{ author }} on {{ date }}") does not fit the markup.**
`sections/main-article.liquid` renders the author and date as separate elements with a real
`<time datetime="...">`, which is better for SEO and assistive tech than one interpolated
sentence. Using the string would mean giving that up. The catch is that the header's "By " is
currently hardcoded English, so there *is* a translation gap — it just is not the gap this
string fixes. Either delete the key and add a `blog.article_author` label, or restructure the
meta line and accept losing `<time>`. Left as a decision rather than quietly degrading the
markup.

### S2. Schema settings — clean
All 6 initial hits were false positives. `sections/footer.liquid` reads `footer_title_1..3`
and `footer_menu_1..3` through a constructed key (`section.settings[col_menu]`), so a literal
search misses them. **No section or block setting goes unread.**

### S3. 14 CSS custom properties declared and never referenced
`--accent`, `--icon`, `--color-warning`, `--header-height-mobile`, `--radius-xl`,
`--shadow-sm`, `--sp-1`, `--sp-16`, `--sp-20`, `--text-5xl`, `--trans-base`, `--trans-slow`,
`--z-modal`, `--z-overlay`. Note `--accent` and `--icon` sit alongside the real
`--color-accent` and look like abandoned earlier names; `--z-modal`/`--z-overlay` are gaps in
an otherwise-used z-index scale.

### S4. CSS classes with no consumer
482 class selectors in `theme.css`; 46 never appear literally in markup, but most are built
dynamically (`hero__inner--{{ alignment }}`, `benefits-grid--{{ n }}`,
`product-card__media--{{ ratio }}`, and `toast--` + type in `theme.js:137`). After filtering
those, **18 are genuinely unreferenced**, in two groups:

- **Components with nothing to style:** `.spinner` (theme.css:603), `.form-error` (:410),
  `.form-help` (:411). `.spinner` is the interesting one — the collection filter item below
  notes there is no loading state anywhere, and here is the spinner that was styled for it.
- **A utility layer nobody calls:** `.lead`, `.text-accent`, `.text-center`, `.w-full`,
  `.mb-4`, `.mb-6`, `.mt-8`, `.pt-0`, `.pb-0`, `.border-top`, `.border-bottom`,
  `.desktop-only`, `.mobile-only`, `.section--sm`, `.section--lg`. These are defensible —
  utilities exist so merchants can use them in rich-text and custom Liquid — but they are
  undocumented, so nobody knows they are there. Either document them in the README or drop
  them.

### S5. README metafield table — one mismatch, already tracked
14 documented keys, 13 read by templates. Only `certifications` is undocumented-in-reverse.

### Suggested order
Wire up the blog comment form (the strings are done), decide on `.spinner` when the filter
loading state gets built, then delete or document the rest in one pass.

Blog comment form (was a nice-to-have, and S1's largest cluster): `sections/main-article.liquid`
now renders published comments and a posting form, gated on `blog.comments_enabled?` rather
than a new theme setting, so Shopify's own switch stays authoritative. The comment list is
paginated at 10 through the existing `pagination` snippet, each comment carries a real
`<time datetime>`, and the form follows the same conventions as the account forms —
`.form-group`/`.form-label`/`.form-input`, `form.errors | default_errors` kept inside the
`{% form %}` tag where `form.errors` is actually defined, and a success notice that switches
between `blog.comment_success` and `blog.comment_moderated` on `blog.moderated?`. Added the
matching CSS, which did not exist. Nine of the ten written-but-unused `blog.*` strings are now
referenced.

Not yet verified on the storefront: the dev store's blog has no articles, so the template has
never rendered. Needs a post, and comments enabled on that blog, before it can be exercised.

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
