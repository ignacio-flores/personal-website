escape_html <- function(x) {
  x <- as.character(x)
  x <- gsub("&", "&amp;", x, fixed = TRUE)
  x <- gsub("<", "&lt;", x, fixed = TRUE)
  x <- gsub(">", "&gt;", x, fixed = TRUE)
  x <- gsub('"', "&quot;", x, fixed = TRUE)
  x
}

external_link <- function(url, label, class = "") {
  sprintf('<a class="%s" href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
          class, escape_html(url), escape_html(label))
}

render_links <- function(links) {
  if (is.null(links) || !length(links)) return("")
  paste(vapply(links, function(link) external_link(link$url, link$label), character(1)), collapse = "")
}

has_value <- function(x) {
  !is.null(x) && length(x) > 0 && !is.na(x[[1]]) && nzchar(trimws(as.character(x[[1]])))
}

render_research_figure <- function(paper, figure_sets) {
  if (!has_value(paper$figure_set)) return("")

  figure_key <- as.character(paper$figure_set[[1]])
  figure_set <- figure_sets[[figure_key]]
  if (is.null(figure_set)) {
    stop(sprintf("Research item '%s' refers to unknown figure_set '%s'.", paper$title, figure_key), call. = FALSE)
  }
  if (!has_value(figure_set$selected)) {
    stop(sprintf("Figure set '%s' has no selected option.", figure_key), call. = FALSE)
  }

  selected_id <- as.character(figure_set$selected[[1]])
  matching_options <- Filter(
    function(option) has_value(option$id) && identical(as.character(option$id[[1]]), selected_id),
    figure_set$options
  )
  if (length(matching_options) != 1) {
    stop(sprintf("Figure set '%s' must contain exactly one option with id '%s'.", figure_key, selected_id), call. = FALSE)
  }

  figure <- matching_options[[1]]
  if (!has_value(figure$image) || !has_value(figure$alt)) {
    stop(sprintf("Selected option '%s' in figure set '%s' requires image and alt values.", selected_id, figure_key), call. = FALSE)
  }

  format <- if (has_value(figure$format)) as.character(figure$format[[1]]) else "auto"
  allowed_formats <- c("auto", "wide", "square", "portrait")
  if (!format %in% allowed_formats) {
    stop(sprintf("Figure option '%s' in set '%s' has invalid format '%s'.", selected_id, figure_key, format), call. = FALSE)
  }

  caption <- if (has_value(figure$caption)) {
    sprintf("<figcaption>%s</figcaption>", escape_html(figure$caption))
  } else {
    ""
  }

  sprintf(
    '<figure class="paper-figure paper-figure--%s" data-figure-option="%s"><img src="%s" alt="%s" loading="lazy" decoding="async">%s</figure>',
    escape_html(format), escape_html(selected_id), escape_html(figure$image),
    escape_html(figure$alt), caption
  )
}

slugify_id <- function(x) {
  slug <- iconv(as.character(x), to = "ASCII//TRANSLIT")
  slug <- tolower(slug)
  slug <- gsub("[^a-z0-9]+", "-", slug)
  gsub("(^-|-$)", "", slug)
}

escape_attribute <- function(x) {
  x <- escape_html(x)
  gsub("\n", "&#10;", x, fixed = TRUE)
}

citation_venue <- function(paper) {
  venue <- as.character(paper$venue)
  year <- as.character(paper$year[[1]])
  venue <- gsub(sprintf("\\s*\\(%s\\)\\s*$", year), "", venue)
  venue <- gsub(
    sprintf(",?\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+%s$", year),
    "", venue
  )
  trimws(venue)
}

bibtex_authors <- function(authors) {
  authors <- sub("^With the ", "", authors)
  authors <- gsub(",\\s*", " and ", authors)
  gsub("\\s+and\\s+", " and ", authors)
}

research_citations <- function(paper) {
  year <- as.character(paper$year[[1]])
  venue <- citation_venue(paper)
  apa <- sprintf("%s (%s). %s. %s.", paper$authors, year, paper$title, venue)
  chicago <- sprintf("%s. \"%s.\" %s.", paper$authors, paper$title, paper$venue)

  entry_type <- switch(
    paper$section,
    "Working papers" = "unpublished",
    "Journal articles" = "article",
    "Book chapters" = "incollection",
    "Guidelines and reports" = "techreport",
    "misc"
  )
  title_words <- strsplit(slugify_id(paper$title), "-", fixed = TRUE)[[1]]
  citation_key <- paste0("flores", year, paste(head(title_words, 3), collapse = ""))
  bibtex <- sprintf(
    "@%s{%s,\n  author = {%s},\n  title = {%s},\n  year = {%s},\n  note = {%s},\n  url = {%s}\n}",
    entry_type, citation_key, bibtex_authors(paper$authors), paper$title,
    year, paper$venue, paper$url
  )

  list(apa = apa, chicago = chicago, bibtex = bibtex)
}

render_research_paper <- function(paper, figure_sets, show_figures) {
  status <- if (has_value(paper$status)) {
    sprintf('<span class="status">%s</span>', escape_html(paper$status))
  } else {
    ""
  }
  title <- external_link(paper$url, paper$title)
  figure <- if (isTRUE(show_figures)) render_research_figure(paper, figure_sets) else ""
  card_class <- if (nzchar(figure)) "paper-card paper-card--with-image" else "paper-card"
  links <- render_links(paper$links)
  citations <- research_citations(paper)
  cite_menu <- sprintf(
    paste0(
      '<details class="citation-menu"><summary>Cite</summary>',
      '<div class="citation-options"><p>Copy citation</p>',
      '<button class="citation-copy" type="button" data-format="APA" data-citation="%s" aria-label="Copy APA citation for %s" aria-live="polite"><span>APA</span><i class="bi bi-clipboard" aria-hidden="true"></i></button>',
      '<button class="citation-copy" type="button" data-format="Chicago" data-citation="%s" aria-label="Copy Chicago citation for %s" aria-live="polite"><span>Chicago</span><i class="bi bi-clipboard" aria-hidden="true"></i></button>',
      '<button class="citation-copy" type="button" data-format="BibTeX" data-citation="%s" aria-label="Copy BibTeX citation for %s" aria-live="polite"><span>BibTeX</span><i class="bi bi-clipboard" aria-hidden="true"></i></button>',
      '</div></details>'
    ),
    escape_attribute(citations$apa), escape_html(paper$title),
    escape_attribute(citations$chicago), escape_html(paper$title),
    escape_attribute(citations$bibtex), escape_html(paper$title)
  )

  sprintf(
    paste0(
      '<article class="%s">',
      '<div class="paper-header">%s<h4>%s</h4>',
      '<p class="paper-authors">%s</p><p class="paper-meta">%s</p></div>',
      '%s',
      '<div class="paper-actions">',
      '<div class="paper-action-row">%s%s</div>',
      '<details class="paper-abstract"><summary>Read abstract</summary>',
      '<div><p>%s</p></div></details></div></article>'
    ),
    card_class, status, title, escape_html(paper$authors), escape_html(paper$venue),
    figure, links, cite_menu, escape_html(paper$abstract)
  )
}

render_research <- function(path, figures_path, show_figures = TRUE) {
  papers <- yaml::read_yaml(path)
  figure_sets <- yaml::read_yaml(figures_path)
  sections <- unique(vapply(papers, `[[`, character(1), "section"))

  invalid_years <- Filter(
    function(paper) !has_value(paper$year) || is.na(suppressWarnings(as.integer(paper$year[[1]]))),
    papers
  )
  if (length(invalid_years)) {
    stop(sprintf("Every research item requires a numeric year; check '%s'.", invalid_years[[1]]$title), call. = FALSE)
  }

  cat('<div class="research-layout">')
  cat('<div class="research-directory" role="navigation" aria-label="Research categories"><p class="research-directory-label"><i class="bi bi-journal-text" aria-hidden="true"></i><span>Browse research</span></p><nav>')
  for (section in sections) {
    section_id <- paste0("research-", slugify_id(section))
    cat(sprintf(
      '<a class="research-directory-link" href="#%s" data-research-target="%s">%s</a>',
      escape_html(section_id), escape_html(section_id), escape_html(section)
    ))
  }
  cat('</nav></div><div class="research-bibliography">')

  for (section in sections) {
    section_papers <- Filter(function(paper) identical(paper$section, section), papers)
    years <- sort(unique(vapply(section_papers, function(paper) as.integer(paper$year[[1]]), integer(1))), decreasing = TRUE)
    section_id <- paste0("research-", slugify_id(section))

    cat(sprintf(
      '<section class="research-section" id="%s" data-research-section><header class="research-section-header"><h2>%s</h2></header>',
      escape_html(section_id), escape_html(section)
    ))
    for (year in years) {
      year_papers <- Filter(function(paper) as.integer(paper$year[[1]]) == year, section_papers)
      cat(sprintf('<div class="research-year-group"><h3 class="research-year">%s</h3><div class="research-year-items">', year))
      for (paper in year_papers) {
        cat(render_research_paper(paper, figure_sets, show_figures))
      }
      cat('</div></div>')
    }
    cat('</section>')
  }

  cat('</div></div>')
}

render_projects <- function(path) {
  projects <- yaml::read_yaml(path)
  sections <- unique(vapply(projects, `[[`, character(1), "section"))
  for (section in sections) {
    cat(sprintf('<section class="research-section"><h2>%s</h2><div class="project-grid">', escape_html(section)))
    for (project in Filter(function(x) identical(x$section, section), projects)) {
      cat(sprintf('<article class="project-card"><p class="role">%s</p><h3>%s</h3><p>%s</p><div class="link-row">%s</div></article>',
                  escape_html(project$role), external_link(project$url, project$title),
                  escape_html(project$description), render_links(project$links)))
    }
    cat('</div></section>')
  }
}

render_outreach <- function(path) {
  entries <- yaml::read_yaml(path)
  cat('<div class="media-list">')
  for (entry in entries) {
    cat(sprintf('<article class="media-entry"><div class="media-date">%s</div><div><h2>%s</h2><p>%s</p></div></article>',
                escape_html(entry$date), external_link(entry$url, entry$title), escape_html(entry$details)))
  }
  cat('</div>')
}

render_resources <- function(path) {
  groups <- yaml::read_yaml(path)
  cat('<div class="resource-grid">')
  for (group in groups) {
    links <- paste(vapply(group$items, function(item) sprintf('<li>%s</li>', external_link(item$url, item$title)), character(1)), collapse = "")
    cat(sprintf('<section class="resource-group"><h2>%s</h2><ul>%s</ul></section>', escape_html(group$topic), links))
  }
  cat('</div>')
}
