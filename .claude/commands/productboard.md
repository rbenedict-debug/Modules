# Productboard Copy/Paste

Generate a **local, editable HTML doc** of Productboard-ready content for the
current project. The user opens it in their browser, reads it, makes any small
adjustments by typing directly into the page, and copies one paste unit at a
time into Productboard with formatting intact (headings, bold, lists, links,
code chips).

**Why a rendered page and not markdown:** Productboard does not render pasted
markdown — it lands as literal text. It *does* preserve formatting from
rich-text pastes (HTML on the clipboard, the same mechanism as pasting from
Google Docs). A rendered local page gives that, plus the user can see and hand-
edit the content without asking Claude for every tweak.

## Rules (non-negotiable)

1. The formats below are canonical. Never restyle, reorder, or rename the
   standard sections — the entire point of this command is consistent output
   every time. The one sanctioned way a doc grows is **area sections** in the
   Overview's flexible zone (see Step 3); everything else stays fixed.
2. Content inside the `.doc` containers uses semantic tags only:
   `h1 h2 p ol ul li strong code a br`. No classes, no inline styles there —
   page cosmetic CSS lives in the shell only, so Productboard applies its own
   styling on paste.
3. Never invent facts. URLs, tags, doc links, story IDs, and counts come from
   the session, the repo, or the user — ask for anything missing.
4. A section with no real content is omitted entirely. No placeholder text ever.
5. The doc is a project file: `productboard/{project}.html` (create the folder
   if needed). Regenerating it overwrites the file — **warn the user first if
   the file already exists**, since it may hold their manual edits (their
   browser-saved edits also survive regeneration via localStorage, but treat
   the file as theirs, not yours).
6. A blank line in content is `<p><br></p>` (survives Productboard's editor
   better than an empty `<p>`).
7. **No whitespace between tags inside `.doc`.** Emit each `.doc`'s content as
   one continuous line — tags butted together (`</li><li>`, `</p><h2>`).
   Productboard's editor turns whitespace-only text nodes between block
   elements into empty paragraphs and empty list items (symptom: an empty
   numbered item between every real bullet). Pretty-printing belongs to the
   shell only; the shell's Copy handler also scrubs these text nodes at copy
   time as a safety net for edits saved before this rule.

## Step 1 — What to produce

- `/productboard overview` → the Overview view only
- `/productboard stories` → story views only
- `/productboard` (bare) → whichever the session has content for; if both, both;
  if neither is obvious, ask.

If the doc already exists, add/update the requested views and leave the rest of
the file's views in place.

## Step 2 — Gather content

| Item | Source |
|---|---|
| Repo URL | `git remote get-url origin` (omit the Repo line if none) |
| Tag | the session (e.g. a tag just created) or ask (e.g. `handoff-v1`) |
| Live preview URL(s) | the session or ask — one link line per prototype, short label before each when there are several |
| Technical documentation link | Defaults to the repo's `docs/ENGINEERING.md` (link it on GitHub at the tag/branch being shared) when that file has real content; if it's still the untouched starter, omit the section (or ask). Add a one-line description of what the doc covers |
| Stories | the session's work or `docs/user-stories/*.md` if present |
| Story IDs | the project's established prefix (e.g. `TICK-1`); ask for a prefix if none exists yet |

## Step 3 — Content formats

### Overview (one per project)

Sections in exactly this order, each omitted if empty:

```html
<h1>{Project title — short feature summary}</h1>

<h2>What you're delivering</h2>
<p>{1–3 sentence intro: what's being built, what stays unchanged}</p>
<ol>
  <li><strong>{Piece}</strong> {detail — literal values like routes, modes, tags as <code>code</code>}</li>
</ol>

<h2>Why this matters</h2>
<p>{Short paragraph: why this project exists — the problem and the user value}</p>

<!-- FLEXIBLE ZONE — area sections, 0 or more, only here.
     Larger projects that span several areas get one <h2> per area, named for
     the area (e.g. "Filter modal", "Saved views", "Analytics dashboard").
     Same building blocks as everything else: a short intro <p>, then
     <ol>/<ul> items with <strong> lead-ins and <code> literals.
     When area sections exist, keep the "What you're delivering" list
     high-level (roughly one item per area) and put the depth here. -->
<h2>{Area name}</h2>
<p>{1–2 sentence intro to this area}</p>
<ul>
  <li><strong>{Piece}</strong> {detail}</li>
</ul>

<h2>Live preview</h2>
<p><a href="{url}">{url}</a></p>
<p>Try it: {short walkthrough of what to click}</p>

<h2>Codebase</h2>
<ul>
  <li>Repo: <a href="{repo-url}">{repo-url}</a></li>
  <li>Handoff tag: <code>{tag}</code> ({note — e.g. pinned to the handoff state — branch from this})</li>
</ul>

<h2>Technical documentation</h2>
<p><a href="{doc-url}">{Doc name}</a> — {one-line description of what the doc covers}</p>

<h2>Out of scope (don't touch)</h2>
<ul>
  <li>{item}</li>
</ul>
```

### User story (one Productboard card each)

```html
<p><strong>As an</strong> {persona} <strong>I want</strong> {capability} <strong>So that</strong> {benefit}</p>
<p><br></p>
<p><strong>Acceptance criteria</strong></p>
<ul>
  <li>{criterion — <strong>bold lead-in</strong> for named UI pieces, <code>code</code> for literal values}</li>
</ul>
```

- Only the connector words (**As an / I want / So that**) are bold; the content
  between them is regular weight.
- "Acceptance criteria" is a **bold paragraph, not a heading**.

### All-stories view (batch paste into one card)

Concatenate every story. In this view only, precede each story with its bold ID
line and follow each story with a blank line:

```html
<p><strong>{ID}</strong></p>
{story markup}
<p><br></p>
```

Per-story views carry **no** ID line — the Productboard card title holds the ID.

## Step 4 — Assemble the doc

One view per paste unit: `Overview · All stories · {ID-1} · {ID-2} · …`
(overview first when present; "All stories" only when there are 2+ stories).

Story count is fully dynamic — one tab and one view **per story, however many
there are** (5–8 per feature is normal; more is fine — the toolbar tabs wrap to
extra rows). The two-story markup in the shell below is an example, not a
limit. Acceptance-criteria lists are likewise as long as each story needs, and
stories added in later runs get appended as new tabs/views.

Use this shell verbatim — replace only `{{PROJECT}}`, the tab buttons, and the
view sections. Do not rename ids or classes; the script relies on them
(`data-view` on tabs, `v-*` section ids, `doc-v-*` doc ids). How it behaves:

- Each `.doc` is `contenteditable` — the user edits in place; edits autosave to
  localStorage (keyed per file path + view) and re-apply on reload, so they
  survive both refreshes and regeneration of the file.
- **Copy** copies the current view *including the user's edits*, scrubbing
  whitespace-only text nodes between block elements first (Productboard
  renders those as empty bullets). Manual text selection + ⌘C also works —
  the source is emitted minified per rule 7. Chrome (toolbar/hints) never
  copies.
- **Reset view** discards saved edits for the current view and restores the
  generated content (confirm first). The button only shows when a view has
  edits.

```html
<title>Productboard — {{PROJECT}}</title>
<style>
  body { margin: 0; background: #F3F4F6; color: #33344A;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .chrome { position: sticky; top: 0; z-index: 2; background: rgba(255,255,255,.94);
            backdrop-filter: blur(8px); border-bottom: 1px solid #E4E5EB;
            user-select: none; -webkit-user-select: none; }
  .chrome-inner { max-width: 780px; margin: 0 auto; padding: 10px 20px;
                  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .chrome-label { font-size: 11px; font-weight: 600; letter-spacing: .08em;
                  text-transform: uppercase; color: #6E7086; margin-right: 4px; }
  .tab { border: 1px solid #D9DBE3; background: #fff; color: #33344A; border-radius: 999px;
         padding: 5px 12px; font-size: 13px; font-family: inherit; cursor: pointer;
         transition: background .15s ease, color .15s ease; }
  .tab[aria-selected="true"] { background: #2E6FD8; border-color: #2E6FD8; color: #fff; }
  .tab:focus-visible, .copy-btn:focus-visible, .reset-btn:focus-visible {
    outline: 2px solid #2E6FD8; outline-offset: 2px; }
  .copy-btn { margin-left: auto; border: 0; background: #2E6FD8; color: #fff; border-radius: 8px;
              padding: 7px 16px; font-size: 13px; font-weight: 600; font-family: inherit;
              cursor: pointer; transition: background .15s ease; }
  .copy-btn.copied { background: #1E8E5A; }
  .reset-btn { border: 0; background: none; color: #6E7086; font-size: 12px;
               font-family: inherit; cursor: pointer; text-decoration: underline; padding: 4px; }
  @media (prefers-reduced-motion: reduce) { .tab, .copy-btn { transition: none; } }
  .hint { max-width: 780px; margin: 12px auto 0; padding: 0 20px; font-size: 12.5px;
          color: #6E7086; user-select: none; -webkit-user-select: none; }
  .stage { max-width: 780px; margin: 14px auto 56px; padding: 0 20px; }
  .view { display: none; }
  .view.active { display: block; }
  .doc { background: #fff; border: 1px solid #E4E5EB; border-radius: 10px;
         padding: 36px 40px; box-shadow: 0 1px 2px rgba(20,20,43,.05); }
  .doc:hover { border-color: #C9CCD6; }
  .doc:focus-within { outline: none; border-color: #2E6FD8;
                      box-shadow: 0 0 0 3px rgba(46,111,216,.12); }
  .doc h1 { font-size: 30px; line-height: 1.25; font-weight: 700; margin: 0 0 6px; }
  .doc h2 { font-size: 21px; line-height: 1.3; font-weight: 700; margin: 28px 0 8px; }
  .doc p { font-size: 16px; line-height: 1.55; margin: 10px 0; }
  .doc ol, .doc ul { margin: 10px 0; padding-left: 26px; }
  .doc li { font-size: 16px; line-height: 1.55; margin: 6px 0; }
  .doc a { color: #2E6FD8; text-decoration: underline; }
  .doc code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85em;
              background: #F0F1F4; border-radius: 4px; padding: 1.5px 6px; }
</style>

<div class="chrome">
  <div class="chrome-inner" role="tablist" aria-label="Content to copy">
    <span class="chrome-label">Copy for Productboard</span>
    <!-- One tab per view; first tab gets aria-selected="true" -->
    <button class="tab" role="tab" aria-selected="true" data-view="v-overview">Overview</button>
    <button class="tab" role="tab" aria-selected="false" data-view="v-all">All stories</button>
    <!-- …one tab per story: data-view="v-tick-1" etc… -->
    <button class="reset-btn" id="resetBtn" type="button" hidden>Reset view</button>
    <button class="copy-btn" id="copyBtn" type="button">Copy</button>
  </div>
</div>
<p class="hint">Click into the page to edit it — changes save automatically in this
browser. Pick a view, hit <strong>Copy</strong>, paste into a Productboard description.
Selecting text yourself and copying keeps formatting too; the toolbar never copies.</p>

<div class="stage">
  <!-- One section per view; first gets class="view active", ids v-* / doc-v-*.
       Every .doc gets contenteditable="true". -->
  <section class="view active" id="v-overview" aria-label="Overview">
    <div class="doc" id="doc-v-overview" contenteditable="true">
      <!-- Overview content markup -->
    </div>
  </section>
  <!-- …more sections… -->
</div>

<script>
(function () {
  var tabs = document.querySelectorAll('.tab');
  var copyBtn = document.getElementById('copyBtn');
  var resetBtn = document.getElementById('resetBtn');
  var current = document.querySelector('.view.active').id;
  var KEY = 'pbdoc:' + location.pathname + ':';
  var original = {};

  document.querySelectorAll('.doc').forEach(function (d) {
    original[d.id] = d.innerHTML;
    var saved = null;
    try { saved = localStorage.getItem(KEY + d.id); } catch (e) {}
    if (saved !== null && saved !== d.innerHTML) d.innerHTML = saved;
    d.addEventListener('input', function () {
      try { localStorage.setItem(KEY + d.id, d.innerHTML); } catch (e) {}
      syncResetBtn();
    });
  });

  function hasEdits(docId) {
    try { var s = localStorage.getItem(KEY + docId); return s !== null && s !== original[docId]; }
    catch (e) { return false; }
  }
  function syncResetBtn() { resetBtn.hidden = !hasEdits('doc-' + current); }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      current = t.dataset.view;
      tabs.forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      document.querySelectorAll('.view').forEach(function (v) {
        v.classList.toggle('active', v.id === current);
      });
      syncResetBtn();
    });
  });

  resetBtn.addEventListener('click', function () {
    if (!confirm('Discard your edits to this view and restore the generated version?')) return;
    var d = document.getElementById('doc-' + current);
    d.innerHTML = original[d.id];
    try { localStorage.removeItem(KEY + d.id); } catch (e) {}
    syncResetBtn();
  });

  function done() {
    copyBtn.textContent = 'Copied ✓'; copyBtn.classList.add('copied');
    setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1600);
  }
  // Whitespace-only text nodes between block elements paste into Productboard
  // as empty bullets/paragraphs — scrub them before writing the clipboard.
  function cleanHTML(el) {
    var clone = el.cloneNode(true);
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    var junk = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      var p = n.parentNode && n.parentNode.nodeName;
      if (/^\s+$/.test(n.nodeValue) && (p === 'DIV' || p === 'OL' || p === 'UL')) junk.push(n);
    }
    junk.forEach(function (n) { n.parentNode.removeChild(n); });
    return clone.innerHTML;
  }
  function fallbackCopy(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    try { document.execCommand('copy'); } finally { s.removeAllRanges(); }
    done();
  }
  copyBtn.addEventListener('click', function () {
    var el = document.getElementById('doc-' + current);
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([cleanHTML(el)], { type: 'text/html' }),
        'text/plain': new Blob([el.innerText], { type: 'text/plain' })
      })]).then(done, function () { fallbackCopy(el); });
    } else { fallbackCopy(el); }
  });

  syncResetBtn();
})();
</script>
```

Note the shell file starts with `<title>` and has no `<!DOCTYPE>`/`<html>`/
`<head>`/`<body>` wrapper — browsers handle this fine for a local file, and it
keeps the shell identical to what the Artifact tool expects if one is ever
published instead. If you prefer, wrapping it in a standard skeleton is also
fine — the ids, classes, and script must stay as-is either way.

## Step 5 — Deliver

1. Write the doc to `productboard/{project}.html` in the project.
2. Open it for the user: `open productboard/{project}.html`.
3. Tell the user: pick a view, click **Copy**, paste into the Productboard
   description field; click into the page to hand-edit first if anything needs
   tweaking (edits are included in the copy and survive reload).

## If Productboard mangles something

Confirm with the user exactly what broke (most likely candidates: `code` chips
or the `<p><br></p>` blank line — inter-tag whitespace becoming empty bullets is
already fixed by rule 7 + the Copy scrub), adjust the markup rule **in this
file** so the fix applies to every future run, and regenerate the doc.
