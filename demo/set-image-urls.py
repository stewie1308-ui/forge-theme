#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Point the demo CSV's Image Src column at your own product images.

Shopify's product importer fetches Image Src over HTTP while the import runs, so
the URLs must already be publicly reachable. That rules out the theme's assets/
folder, which only gets a CDN URL once the theme itself has been uploaded.

Route that works:

  1. Shopify admin -> Content -> Files -> Upload, and upload the ten images named
     in FILENAMES below (any extension; pass --ext if not .jpg).
  2. Click any one of them and copy its URL. It looks like:
       https://cdn.shopify.com/s/files/1/0812/3456/7890/files/omega-3-fish-oil.jpg?v=1712345678
  3. Run this script with that URL:
       python demo/set-image-urls.py --sample-url "<the URL you copied>"
  4. Import demo/products-with-images.csv.

The ?v= cache-buster is stripped; the base path before /files/<name> is reused for
every row, so one sample URL is enough for all ten.

Use --base instead of --sample-url if you are hosting the images somewhere else
entirely (an S3 bucket, your own CDN); pass the directory URL without a trailing
slash and the filenames below are appended to it.
"""
import argparse
import csv
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(ROOT, 'demo', 'products-with-metafields.csv')
DST = os.path.join(ROOT, 'demo', 'products-with-images.csv')

# One image per product, named after the product handle so the mapping is obvious.
FILENAMES = [
    'daily-essentials-multivitamin',
    'omega-3-fish-oil',
    'vitamin-d3-k2',
    'magnesium-glycinate',
    'whey-protein-concentrate',
    'creatine-monohydrate',
    'pre-workout-formula',
    'ashwagandha-ksm66',
    'lions-mane-mushroom',
    'zinc-copper-balance',
]


def base_from_sample(url):
    """Strip the filename and any ?v= cache-buster off a Shopify Files URL."""
    url = url.split('?')[0].strip()
    if '/' not in url:
        sys.exit('--sample-url does not look like a URL: %r' % url)
    return url.rsplit('/', 1)[0]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--sample-url', help='any one uploaded image URL; its directory is reused')
    g.add_argument('--base', help='directory URL to build from, no trailing slash')
    ap.add_argument('--ext', default='.jpg', help='image extension (default: .jpg)')
    ap.add_argument('--list', action='store_true', help='just print the filenames to upload')
    args = ap.parse_args()

    ext = args.ext if args.ext.startswith('.') else '.' + args.ext

    if args.list:
        for n in FILENAMES:
            print(n + ext)
        return

    if not args.sample_url and not args.base:
        ap.error('one of --sample-url or --base is required (or use --list)')

    base = base_from_sample(args.sample_url) if args.sample_url else args.base.rstrip('/')

    if not os.path.exists(SRC):
        sys.exit('missing %s - run the generator first' % SRC)

    rows = list(csv.DictReader(io.open(SRC, encoding='utf-8')))
    fields = list(rows[0].keys())

    swapped, unknown = 0, []
    for r in rows:
        if not r.get('Image Src'):
            continue                      # variant continuation row
        handle = r['Handle']
        if handle not in FILENAMES:
            unknown.append(handle)
            continue
        r['Image Src'] = '%s/%s%s' % (base, handle, ext)
        if not r.get('Image Alt Text'):
            r['Image Alt Text'] = r.get('Title') or handle
        swapped += 1

    with io.open(DST, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    print('base:    %s' % base)
    print('swapped: %d image URLs' % swapped)
    if unknown:
        print('unknown handles (left alone): %s' % ', '.join(sorted(set(unknown))))
    print('wrote:   %s' % DST)
    print('\nSanity-check one URL in a browser before importing - if it 404s,')
    print('the import will silently create products with no images.')


if __name__ == '__main__':
    main()
