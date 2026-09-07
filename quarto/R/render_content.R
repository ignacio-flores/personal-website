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

render_research <- function(path) {
  papers <- yaml::read_yaml(path)
  sections <- unique(vapply(papers, `[[`, character(1), "section"))
  for (section in sections) {
    cat(sprintf('<section class="research-section"><h2>%s</h2>', escape_html(section)))
    for (paper in Filter(function(x) identical(x$section, section), papers)) {
      status <- if (!is.null(paper$status)) sprintf('<span class="status">%s</span>', escape_html(paper$status)) else ""
      title <- external_link(paper$url, paper$title)
      cat(sprintf('<article class="paper-card">%s<h3>%s</h3><p class="paper-authors">%s</p><p class="paper-meta">%s</p><div class="link-row">%s</div><details><summary>Read abstract</summary><div><p>%s</p></div></details></article>',
                  status, title, escape_html(paper$authors), escape_html(paper$venue),
                  render_links(paper$links), escape_html(paper$abstract)))
    }
    cat('</section>')
  }
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
