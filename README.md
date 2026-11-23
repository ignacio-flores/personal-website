# Personal website

This repository contains the personal website for
[ignacioflores.com](https://ignacioflores.com), independent websites hosted at
dev.ignacioflores.com, and files hosted at share.ignacioflores.com.

## Repository layout

```text
main/       Personal-site Quarto project, content, assets, and build helpers
  www/      Generated personal website, tracked and ready to upload
dev/        Independent project websites
share/      Shared documents and software
tools/      Shared static directory-page generator and template
_data/      Shared content metadata
  directory-descriptions.yml  Editable metadata for all directory menus
```

The complete personal-site project lives in `main/`: the `.qmd` pages,
`_quarto.yml`, YAML catalogs in `_data/`, R helpers in `R/`, HTML includes,
styles, JavaScript, images, PDFs, and research downloads in `data/`.

The `dev/` and `share/` folders are independent of the personal-site build.
`dev/gcw/` contains a built website; its editable Quarto sources are not
included here.

## Build

Run these commands from the repository root. Build the personal website with:

```sh
quarto render main
```

Preview local changes with:

```sh
quarto preview main
```

No Python environment activation is needed. The directory-page generator
uses PyYAML from the current Python when available, otherwise it automatically
uses the repository's `.venv`. If needed, it creates that environment and
installs `tools/directory-index/requirements.txt` once. This first setup
requires an internet connection; later builds reuse the installed dependency.
Quarto, R, and Python 3 must already be installed.

The five personal-site pages are generated from `main/*.qmd`, with catalog
content stored in `main/_data/` and rendered by `main/R/render_content.R`.
Quarto's cache stays in `main/.quarto/` and is ignored by Git. Before rendering,
Quarto refreshes the static directory pages for `dev/`, `share/`, and
`main/pdf/`. It does not rebuild their existing websites or change their
documents and software files.

## Directory pages

The directory pages are standalone HTML with inline styling. They show full
filenames, folders first, breadcrumbs, file types, and sizes. They need no
JavaScript, external assets, or server configuration changes.

Each page has one heading, a link to the main website, and links to ancestor
folders. Nested pages also have an explicit **Up one folder** link. Existing
project websites are labelled **Website** so their destinations are clear.

Refresh only the directory pages from the repository root with:

```sh
python3 tools/directory-index/build.py
```

Layout lives in `tools/directory-index/template.html`; discovery and link
generation live in `tools/directory-index/build.py`. Edit these sources rather
than the generated `index.html` files. The generator adds an index to each
browsable directory and preserves existing websites with their own
`index.html`, `index.htm`, or `index.php`, including the whole `dev/gcw/` site.
Hidden entries and symbolic links are omitted.

Edit descriptions in the shared `_data/directory-descriptions.yml` catalog.
The catalog covers `dev`, `share`, and `main/pdf`. Each group has an optional
`intro` and an `entries` map. Entry keys are exact paths relative to that
group's root, with `/` between folders and no trailing slash. For example:

```yaml
dev:
  intro: Independent project websites and development work.
  entries:
    gcw: Wealth Inequality Project website and interactive research tools.
```

The generator lists the files and folders actually present on disk. Adding
a file makes it appear on the next build, even without metadata. Removing a
file removes its link on the next build, even if its catalog entry remains.
Renamed files initially appear under their new filenames; rename the catalog
keys too if you want to retain their descriptions.

Edit a description to change its text; remove the entry or leave its value
empty to hide that description. A folder's description also introduces its
own listing page. Descriptions are plain text; HTML is displayed literally.

For articles and other writing, use a record instead of a description:

```yaml
main/pdf:
  intro: Research papers, reports, and curriculum vitae.
  entries:
    CV_Ignacio_Flores.pdf: Ignacio Flores's curriculum vitae.
    paper.pdf:
      title: The title of the paper
      authors: First Author and Second Author
      date: 2026
      description: A short description of this document.
```

All four fields are optional. A title replaces the filename as the primary
label, with the filename beneath in smaller text. Available authors, date,
and description appear in that order. Without a title, the filename remains
the primary label. A folder record uses its `description` for both its row
and its own page introduction.

Dates describe the version of the document in the folder. They can be text
such as `March 2026`, a year such as `2026`, or an ISO date such as `2026-03-19`.
Quote text containing a colon followed by a space or a `#`, for example
`title: "Paper title: A subtitle"`. The catalog stays outside the public
folders and is not uploaded; upload the generated HTML and public files.

Add or remove public files locally, regenerate, and upload the changed files
and directory pages. A listing reflects the local files at build time;
uploads made only on the server will appear after the local copy is updated
and the pages are rebuilt. Use a normal full `quarto render main` before
uploading the personal website: it refreshes the directory pages and cleans
the compiled output, so deleted PDFs disappear from `main/www/pdf/` too.
Incremental preview, partial renders, and `--no-clean` can leave older copied
files in the output even though the refreshed menu no longer lists them.

Run the generator's preservation and link-handling checks with:

```sh
.venv/bin/python3 -m unittest discover -s tools/directory-index -p 'test_*.py'
```

If PyYAML is installed in your regular Python and no `.venv` was needed,
use `python3` instead of `.venv/bin/python3` for the tests.

The homepage's update month is explicit in `main/index.qmd`; update its text
and `<time datetime="YYYY-MM">` value when revising the homepage.

## Deploy

Quarto writes the complete static personal website to `main/www/`. Upload
the contents of that directory to the document root for ignacioflores.com;
no R or Quarto installation is needed on the server. Upload the contents,
not the enclosing `main/` or `www/` folder, to preserve existing public URLs.

The generated `main/www/` directory remains tracked so the repository always
contains a ready-to-upload build. The explicit resource list in
`main/_quarto.yml` controls which assets are copied; `main/data/` research
downloads remain separate from the generated site.

Keep separate upload destinations for `dev/` and `share/`, corresponding to
their subdomains' document roots. Preserve existing server-only files when
uploading. Upload each generated `index.html` at the same relative location
as in this repository, including the nested shared-file directories. Existing
project and download URLs stay unchanged. No Apache, DNS, or other server
configuration changes are needed; nothing is uploaded automatically.

If a browsable folder becomes a website with `index.htm` or `index.php`, the
generator removes its former `index.html` locally. Remove that same obsolete
generated page from the server when uploading so it does not hide the new
website; preserve all unrelated files.

<div align="center">
<img src="main/www/images/website-screenshot.png" width="900" alt="Website screenshot" />
</div>
