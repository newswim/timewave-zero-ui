# Estate enforcement tools

Two small tools for finding out who is behind a URL and getting infringing
material taken down. Both are read-only and use public data.

## 1. `estate-probe` (GitHub Action)

**Who is behind this URL?**

1. Open **Actions → estate-probe → Run workflow** in this repository.
2. Paste the URL (a page, a listing, a shop, a domain). Run.
3. Open the finished run: the report is on its **Summary** page and attached
   as the `probe-report` artifact.

The report covers: page title and metadata, platform fingerprints (Shopify,
Stripe, Printful, analytics IDs…), names, handles and emails on the page,
outbound links, script bundles (GitHub links, emails, payment keys), WHOIS and
RDAP (registrar, creation date, registrant state/country), DNS and mail
provider, hosting and abuse contact, certificate-transparency subdomains,
Wayback history, urlscan, storefront/policy paths, and the public GitHub
profile if the site links one.

Workflow file: [`.github/workflows/estate-probe.yml`](../.github/workflows/estate-probe.yml).

## 2. Takedown Desk (`takedown-desk.html`)

**Turn a URL into a filed notice.**

Open the page (published copy: see the pinned link in the project; or open
the file locally in a browser). Fill in the rights holder once; it is saved
in that browser only. Then, per case:

1. Paste the infringing URL(s).
2. Pick where it is hosted or sold.
3. Copy the generated text into the platform's form (the page shows which
   form and the steps).
4. "Save to case log" and mark it filed / removed later.

It generates: a DMCA takedown notice (17 U.S.C. § 512(c)(3)), a demand
letter, a Stripe Restricted-Business IP Notice, a Cloudflare registrant
relay message, and an ICANN RDRS identity request. The platform directory
lists the filing form for YouTube, Etsy, Redbubble, Amazon, eBay, Meta,
TikTok, X, Spotify, Apple, SoundCloud, Bandcamp, Patreon, Shopify, Internet
Archive, GitHub, Google Search and Cloudflare-fronted websites.

Only the rights holder or someone it has authorized should sign and send a
notice; each one is made under penalty of perjury.
