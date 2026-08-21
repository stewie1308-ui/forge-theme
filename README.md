# Forge Theme

A conversion-focused Shopify theme built specifically for supplement brands. Clean, clinical aesthetic with science-backed credibility signals built in.

---

## Requirements

- Shopify CLI 3.x
- Node.js 18+
- A Shopify Partner account and development store

---

## Installation

```bash
# Clone or copy the theme folder into your project
cd your-project-folder

# Push to your dev store
shopify theme push --store your-store.myshopify.com

# Or run locally
shopify theme dev --store your-store.myshopify.com
```

---

## Theme presets

Three presets ship in `config/settings_data.json` and are selectable in the
theme editor under **Theme settings → Presets**:

| Preset | Tone | Best for |
|---|---|---|
| **Evidence** | Clinical, minimal | Nootropics, medical-grade supplements |
| **Lifestyle** | Bold, aspirational | Pre-workout, sports nutrition |
| **Practitioner** | Educational, authoritative | Practitioner brands, condition-specific |

---

## Sections

### Home page sections
| Section | File | Description |
|---|---|---|
| Hero Banner | `hero-banner.liquid` | Full-width hero with image/video, two CTAs |
| Benefits | `benefits.liquid` | Icon cards, numbered list, or inline style |
| Featured Products | `featured-products.liquid` | Grid from collection or manual selection |
| Testimonials | `testimonials.liquid` | Review cards with aggregate rating |
| Rich Text | `rich-text.liquid` | Flexible text block with optional CTAs |

### Page-specific sections
| Section | File | Template |
|---|---|---|
| Product page | `main-product.liquid` | `product.json` |
| Collection page | `main-collection.liquid` | `collection.json` |
| Cart page | `main-cart.liquid` | `cart.json` |
| Search page | `main-search.liquid` | `search.json` |
| Static page | `main-page.liquid` | `page.json` |
| Blog listing | `main-blog.liquid` | `blog.json` |
| Blog article | `main-article.liquid` | `article.json` |
| 404 page | `main-404.liquid` | `404.json` |

### Customer sections
| Section | File | Template |
|---|---|---|
| Login | `main-login.liquid` | `customers/login.json` |
| Register | `main-register.liquid` | `customers/register.json` |
| Account | `main-account.liquid` | `customers/account.json` |
| Reset password | `main-reset-password.liquid` | `customers/reset_password.json` |
| Activate account | `main-activate-account.liquid` | `customers/activate_account.json` |
| Address book | `main-addresses.liquid` | `customers/addresses.json` |
| Order detail | `main-order.liquid` | `customers/order.json` |

### Other templates
| Section | File | Template |
|---|---|---|
| Collections list | `main-list-collections.liquid` | `list-collections.json` |
| Password page | `main-password.liquid` | `password.json` (uses `layout/password.liquid`) |
| Gift card | — | `gift_card.liquid` (standalone, `{% layout none %}`) |

---

## Product metafields

Set these up in **Shopify Admin → Settings → Custom data → Products**.

> **Create the definitions before importing any CSV.** Shopify's product importer
> silently drops metafield columns that have no matching definition — the import
> reports success and the panels stay empty, with no error to explain why.
> Namespace and key must match exactly; the theme reads them literally.
>
> For `reviews.rating` and `reviews.rating_count`, add Shopify's **standard**
> definitions ("Product rating" / "Product rating count") rather than creating
> custom ones — `reviews` is reserved for review apps.

### Demo data for a dev store

Shopify's own test data is snowboards with no supplement metafields, so none of the
panels render on a fresh store. `demo/products-with-metafields.csv` has 10 supplement
products with all 15 metafields populated — supplement facts rows, ingredient panels,
allergen flags, COA links and ratings.

Import it at **Products → Import**, ticking "overwrite existing products with the same
handle". Create the metafield definitions below first if you want the values editable in
the admin afterwards; the import works either way.

Image Src points at Unsplash by default. To use your own images:

```bash
python demo/set-image-urls.py --list          # filenames to upload
# upload those to Content → Files, copy any one URL, then:
python demo/set-image-urls.py --sample-url "<that URL>"
# imports demo/products-with-images.csv
```

Product images cannot come from `assets/` — Shopify's importer fetches `Image Src` over
HTTP during the import, and theme assets only get a CDN URL once the theme is uploaded.

### Namespace: `forge`

| Key | Type | Used for |
|---|---|---|
| `subtitle` | Single line text | Short product tagline below title |
| `directions` | Rich text | How to use tab on product page |
| `ingredients` | Rich text | Ingredient prose fallback |
| `ingredient_list` | JSON | Structured ingredient panel (see below) |
| `warnings` | Rich text | Warnings & disclaimer tab |
| `allergen_flags` | List of text | Allergen badges (e.g. "Gluten-free", "Contains: Soy") |
| `lab_report_url` | URL | Link to certificate of analysis |
| `certifications` | List of text | Certification badges |
| `other_ingredients` | Single line text | Other ingredients line in the supplement panel |
| `ingredient_count` | Integer | Displayed in ingredients panel header |

### Namespace: `supplement_facts`

| Key | Type | Used for |
|---|---|---|
| `serving_size` | Single line text | e.g. "2 capsules (1,200mg)" |
| `servings_per` | Single line text | e.g. "30" |
| `calories` | Integer | Energy per serving in kcal (0 to hide). Rendered as "Energy — N kcal" in EU format, "Calories — N" in FDA format |
| `rows` | JSON | Ingredient rows (see below) |

### Supplement panel rows JSON format

```json
[
  { "name": "Vitamin C", "amount": "500mg", "dv": "556%", "sub": false, "bold": false },
  { "name": "Zinc", "amount": "10mg", "dv": "100%", "sub": false, "bold": false },
  { "name": "Ashwagandha Extract (KSM-66®)", "amount": "600mg", "dv": "†", "sub": false, "bold": true }
]
```

- `sub: true` — indents the row (for sub-ingredients)
- `bold: true` — bolds the row
- `dv: "†"` — shows † (Daily Value / NRV not established)
- `dv` is whatever you enter — a % Daily Value under the US format, a %NRV under UK/EU

### Ingredient list JSON format

```json
[
  {
    "name": "Ashwagandha KSM-66®",
    "dose": "600mg",
    "benefit": "Clinically studied adaptogen shown to reduce cortisol and support stress resilience.",
    "icon": "🌿"
  },
  {
    "name": "L-Theanine",
    "dose": "200mg",
    "benefit": "Promotes calm focus without drowsiness. Often stacked with caffeine.",
    "icon": "🍵"
  }
]
```

### Reviews metafields (standard)

These are written by most review apps automatically:

| Key | Type |
|---|---|
| `reviews.rating` | Rating (decimal) |
| `reviews.rating_count` | Integer |

Compatible apps: Judge.me, Okendo, Stamped, Yotpo, Loox.

---

## Filtering

Collection page filtering requires the **Shopify Search & Discovery** app (free).

1. Install from the Shopify App Store
2. Go to **Search & Discovery → Filters**
3. Add filters: Price, Product type, Vendor, or any metafield
4. Enable filtering in the Collection page section settings

---

## Cart drawer

The cart drawer uses the **Section Rendering API** to refresh after every add/remove/update — no page reload required.

To enable upsell products in the cart:
1. Go to **Theme settings → Cart**
2. Enable "Show upsell products in cart"
3. Select a collection to pull upsells from

---

## App blocks

`main-product`, `main-collection` and `main-cart` accept `@app` blocks, so
merchants can drop in review widgets, subscription selectors and similar from
the theme editor without editing Liquid. Add them under **Add block → Apps**.

For supplement brands specifically, this is what subscription apps
(Recharge, Seal, Appstle) hook into on the product page.

---

## Markets / localization

If the store publishes more than one country or language, a country/currency
and language selector renders automatically at the bottom of the footer.
It is hidden entirely on single-market stores. No configuration needed.

---

## UK & EU compliance

Configure in **Theme settings → UK & EU Compliance**:

- **Supplement panel format** — switches the product panel between the UK/EU
  **Nutrition Information (%NRV)** format and the US **Supplement Facts (% Daily Value)**
  format. Defaults to UK/EU. Only the framing changes — title, amount column header and
  the footnotes — so you can switch without re-entering metafield data. The figures in
  `dv` are passed through as entered, **not** converted between NRV and DV; enter values
  appropriate to the market you have selected.
- **VAT note** — displays "Price includes VAT" on product pages and cart
- **BNPL messaging** — optional Klarna/Clearpay line near the ATC button
- **Supplement disclaimer** — shown in the footer, configurable per preset

---

## Performance notes

- No external JS or CSS dependencies
- All assets served from Shopify CDN
- All CSS lives in `assets/theme.css` — cached once, not re-sent inline per page
- Images use `srcset` and `loading="lazy"` throughout
- Scroll reveal uses `IntersectionObserver` (native, no library)
- Cart uses fetch API + Section Rendering (no full page reloads)
- Collection filtering and sorting still do a full page reload

---

## Accessibility

- All interactive elements are keyboard navigable, including quick add
- Closed drawers are removed from the tab order (`visibility: hidden`)
- Focus trapping on drawers and modals
- `aria-expanded`, `aria-controls`, `aria-live` used throughout
- `prefers-reduced-motion` respected for CSS animations

Not yet verified: colour contrast has not been formally audited against
WCAG 2.1 AA on all three presets, and touch-target sizes have not been
measured across every component. Autoplaying hero video does not currently
respect `prefers-reduced-motion`.

---

## Browser support

- Chrome, Firefox, Safari, Edge (latest 2 versions)
- iOS Safari 15+
- Chrome for Android (latest)

---

## Shopify Theme Store requirements

Met:

- ✅ No designer credits or affiliate links
- ✅ No app-like features requiring API keys
- ✅ All scripts hosted on Shopify servers
- ✅ No minified CSS or JS (except Shopify-generated)
- ✅ No Sass/SCSS
- ✅ SEO: metadata, Open Graph, structured data, canonical URLs
- ✅ Social: Twitter cards implemented
- ✅ App blocks (`@app`) supported on product, collection and cart
- ✅ Localization form (country/currency + language) in the footer
- ✅ All customer templates present
- ✅ External links use `rel="nofollow"`; internal links do not
- ✅ `robots.txt.liquid` not included (uses Shopify default)
- ✅ `shopify theme check` passes with zero errors

Still outstanding before submission:

- ⬜ Replace the placeholder `theme_documentation_url` and
      `theme_support_email` in `config/settings_schema.json`
- ⬜ Formal WCAG 2.1 AA contrast audit across all three presets
- ⬜ Real-device testing on iOS Safari and Chrome for Android
- ⬜ Blog article comment form is not implemented

---

## Changelog

### v1.0.0
- Initial release
- 3 colour presets: Evidence, Lifestyle, Practitioner
- Supplement panel (metafield-driven), switchable between UK/EU NRV and US FDA formats
- Ingredients panel with structured JSON support
- Allergen flags
- Cart drawer with Section Rendering API
- Sticky add-to-cart bar on product pages
- Collection filtering and sorting
- Full customer account flow (login, register, reset, activate, addresses, orders)
- App block (`@app`) support on product, collection and cart
- Country/currency and language selectors for Shopify Markets
- All copy driven by `locales/en.default.json`
