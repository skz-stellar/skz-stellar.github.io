# HyperTextify

Convert raw HTML or GitHub-flavored Markdown into clean, unstyled HTML. Open
`index.html` directly or serve this directory with `python3 -m http.server 8080`.
Choose the input format, paste source, and click **HyperTextify** (or press
Cmd/Ctrl+Enter). Use **Copy HTML** or inspect the unstyled preview.

## Cleanup behavior

Headings, paragraphs, lists, links, images, tables, code, and semantic emphasis
are retained. Styles, classes, IDs, scripts, embeds, comments, and font/layout
wrappers are removed. Simple text containers become paragraphs to retain their
boundaries. Functional attributes such as link URLs, image alt text, table spans,
and list numbering are kept. Unsafe URL schemes are removed. Task list checkboxes
remain disabled. Code block contents and inline whitespace are preserved.

Markdown uses the locally bundled Marked 17.0.1 parser, with tables, fenced code,
strikethrough, and task lists enabled. Embedded HTML goes through the same cleanup.
This produces an HTML fragment, rather than a complete HTML document.

## Privacy

All processing happens in the browser. No analytics, runtime dependencies from
CDNs, network APIs, cookies, or browser storage. Input and output only live in
memory and disappear on reload. Copy writes to the clipboard only when clicked.
The content security policy blocks network connections and image loads except
the two bundled favicon files on the published site. Pasted HTML is parsed inside an inert template. The preview is a sandboxed iframe with
its own restrictive CSP, no scripts, no image sources, and no link destinations.
URLs are retained in the copied HTML, but never loaded by the app. The initial
page and bundled scripts/fonts are fetched from the static host as usual.

## Publishing

The app is hosted at `https://skz-stellar.github.io/hypertextify/`, with a card on
the tools homepage. To copy app files into a homepage repository checkout:

```sh
python3 scripts/stage-homepage.py /path/to/skz-stellar.github.io
```

The homepage repository publishes its `main` branch through GitHub Pages.

## Tests

`npm install` installs the development-only DOM harness. `npm test` checks cleanup,
Markdown conversion, UI actions, preview URL removal, and static privacy rules.

`test/browser.cjs` uses Node and Playwright Core with an installed Chrome. It
checks both conversion modes, hostile markup, whitespace preservation, explicit
conversion, preview isolation, clipboard, and network requests. Set
`PLAYWRIGHT_PATH` to the local Playwright Core module and `CHROME_PATH` if needed.

```sh
node test/browser.cjs
```

Third-party licenses are included alongside the bundled Marked parser and fonts.
