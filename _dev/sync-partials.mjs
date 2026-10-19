// Copies the shared head, header and footer from _dev/partials into every public
// page between marker comments, e.g. <!-- @header --> … <!-- /@header -->.
// Pages stay plain, directly-editable HTML; run `npm run partials` after editing a partial.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const PAGES = ["index.html", "services.html", "liquid-waste.html", "solid-waste.html", "fresh-food.html", "zora.html", "about-us.html", "gallery.html", "contact.html", "404.html"];
const PARTIALS = ["head", "header", "footer"];

const partials = Object.fromEntries(
  await Promise.all(PARTIALS.map(async (n) => [n, (await readFile(path.join(here, "partials", `${n}.html`), "utf8")).trim()]))
);

function markCurrent(html, page) {
  // aria-current on top-level nav links that point at this page (no hash)
  let out = html.replace(/<a href="([^"#]+)"(?![^>]*aria-current)/g, (m, href) =>
    href === page ? `<a href="${href}" aria-current="page"` : m
  );
  if (page === "services.html") out = out.replace('class="nav-trigger"', 'class="nav-trigger is-current"');
  return out;
}

// 404.html can be served from any path, so its shared links must be root-absolute.
const rootAbsolute = (html) => html.replace(/\b(href|src)="(?![a-z]+:|#|\/)/g, '$1="/');

const indent = (text, pad) => text.split("\n").map((l) => (l ? pad + l : l)).join("\n");

let changed = 0;
for (const page of PAGES) {
  const file = path.join(root, page);
  let html = await readFile(file, "utf8");
  const before = html;
  for (const name of PARTIALS) {
    const re = new RegExp(`([ \\t]*)<!-- @${name} -->[\\s\\S]*?<!-- /@${name} -->`);
    if (!re.test(html)) throw new Error(`${page}: missing <!-- @${name} --> markers`);
    html = html.replace(re, (_, pad) => {
      let body = name === "head" ? partials[name] : markCurrent(partials[name], page);
      if (page === "404.html") body = rootAbsolute(body);
      return `${pad}<!-- @${name} -->\n${indent(body, pad)}\n${pad}<!-- /@${name} -->`;
    });
  }
  if (html !== before) { await writeFile(file, html); changed++; }
}
console.log(`Partials synced (${changed} page${changed === 1 ? "" : "s"} updated).`);
