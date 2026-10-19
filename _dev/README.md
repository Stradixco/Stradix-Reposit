# S-TRADIX website — developer notes

Static site hosted on GitHub Pages (`CNAME` → www.s-tradix.com). No build step is
required to deploy: the HTML files in the repository root are the site.
This `_dev/` folder holds local tooling only; Jekyll (GitHub Pages) does not
publish folders that start with `_`.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html`, `services.html`, `about-us.html`, `gallery.html`, `contact.html`, `404.html` | Public pages |
| `assets/css/site.css` | Design system (tokens, components, layout) |
| `assets/js/site.js` | All public-site interactions, no dependencies |
| `assets/img/` | Optimised WebP/JPEG images generated from `img/` |
| `img/` | Original uploads (kept untouched as the source of truth) |
| `_dev/partials/` | Shared `<head>`, header and footer |
| `Login.html`, `dashboard.html`, … | Internal portal (Firebase Auth via `js/portal-guard.js`) |
| `verify.html` | Public QR verification page (URLs printed on documents — do not rename) |

## Common tasks

```bash
cd _dev
npm install            # once
npm run images         # regenerate assets/img from img/ (edit optimize-images.mjs to add images)
npm run partials       # copy partials/*.html into every public page
npm run check          # verify links, anchors, images, metadata, CSP-safe markup
node serve.mjs 8080    # local preview at http://localhost:8080
node qa-browser.mjs http://localhost:8080 ./qa-shots   # browser QA (uses installed Chrome)
```

Edit the header, footer or shared `<head>` **only** in `_dev/partials/`, then run
`npm run partials`. Content between `<!-- @header -->` / `<!-- /@header -->`
(and the `head`/`footer` equivalents) is overwritten by that script.

## Security notes

- Public pages ship a Content-Security-Policy meta tag (see `partials/head.html`).
  Inline `<script>` blocks and `on*=` attributes are blocked — put code in `site.js`.
  Adding a third-party service requires adding its domain to the policy.
- Portal pages must include `<script type="module" src="js/portal-guard.js"></script>`.
  Users are managed in the Firebase console (project `tradix-portal`).
- Never put passwords, API keys or private data in this repository — everything here is public.
