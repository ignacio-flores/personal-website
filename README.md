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

Optional descriptions live in `tools/directory-index/descriptions.json`,
grouped under `dev`, `share`, and `main/pdf`. Each group has an optional `intro`
and an `entries` map. Entry keys are exact paths relative to that group's root,
with `/` between folders and no trailing slash. For example:

```json
{
  "dev": {
    "intro": "Independent project websites and development work.",
    "entries": {
      "gcw": "Wealth Inequality Project website and interactive research tools."
    }
  }
}
```

All current listed files and folders have descriptive or bibliographic
metadata. Edit the text to revise it; remove an entry or leave its value empty
to hide the description. A folder's description also introduces its own
listing page. New files work without descriptions. Descriptions are plain
text; HTML is displayed literally.

For articles and other writing, use a record instead of a description:

```json
"paper.pdf": {
  "title": "The title of the paper",
  "authors": "First Author and Second Author",
  "date": "March 2026"
}
```

These three fields appear first, with the filename beneath in smaller text
and no summary description. Dates refer to the version of the document in
the folder. The metadata file stays local with the tools; only the generated
HTML needs uploading.

Add or remove public files locally, regenerate, and upload the changed files
and directory pages. A listing reflects the local files at build time;
uploads made only on the server will appear after the local copy is updated
and the pages are rebuilt. A full `quarto render main` also copies the PDF
directory page into `main/www/pdf/`.

Run the generator's preservation and link-handling checks with:

```sh
python3 -m unittest discover -s tools/directory-index -p 'test_*.py'
```

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
