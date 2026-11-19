# Personal website

This repository contains the source and generated static files for
[ignacioflores.com](https://ignacioflores.com).

## Build

The website is a Quarto project rooted in this directory. Build it with:

```sh
quarto render
```

Preview local changes with:

```sh
quarto preview
```

The pages are generated from the `.qmd` files, with catalog content stored in
`_data/` and rendered by `R/render_content.R`.

## Deploy

Quarto writes the complete static website to `www/`. Upload the contents of
that directory to the server's document root; no R or Quarto installation is
needed on the server.

The generated `www/` directory is tracked so the repository always contains a
ready-to-upload build.

<div align="center">
<img src="www/images/website-screenshot.png" width="900" alt="Website screenshot" />
</div>
