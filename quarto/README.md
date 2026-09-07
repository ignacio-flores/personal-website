# Experimental Quarto site

This directory contains the local-only redesign of `ignacioflores.com`. The legacy R Markdown site remains at the repository root and is not affected by this project.

## Preview

From this directory, run:

```sh
quarto preview --render all
```

For a static build without the preview server, run:

```sh
quarto render
```

Quarto writes the rendered site to `_site/`. That directory is intentionally ignored by Git.

## Content

- `_data/research.yml` holds publications, working papers, chapters, and reports.
- `_data/projects.yml`, `_data/outreach.yml`, and `_data/resources.yml` hold the other catalog content.
- `R/render_content.R` turns those records into accessible HTML cards and disclosure sections.

The prototype links to the existing public PDFs and profile image so it can be reviewed without duplicating large legacy assets.
