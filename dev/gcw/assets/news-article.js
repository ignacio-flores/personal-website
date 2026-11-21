(function () {
  "use strict";

  const API_KEY = "AIzaSyBUCn9sR6Cca3fOh2eOZG0eDpE0H2i9cs8";
  const MAIN_FEED_ENDPOINT = "https://sheets.googleapis.com/v4/spreadsheets/1HJS2iWAEHuNpfy0Ll_JQdAag-iwZitCptuQdUUaL414/values/Sheet1!A2:E1000?key=" + API_KEY;
  const ARTICLE_RANGE = "Sheet1!A2:B1000";
  const LEGACY_ARTICLE_PATH = "article.html?id=";
  const LEGACY_BOLD_CLOSE = "<.b>";
  const LEGACY_GENERAL_NEWS = "GENERAL NEWS";
  const RELATED_NEWS_COUNT = 4;

  function normalizeText(value) {
    return (value == null ? "" : String(value)).trim();
  }

  function categorySlug(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/ /g, "");
  }

  function categoryClass(category) {
    var normalized = categorySlug(category);
    if (!normalized || normalized === "news" || normalized === categorySlug(LEGACY_GENERAL_NEWS)) {
      return "";
    }
    return normalized + "card";
  }

  function safeHref(value) {
    var link = normalizeText(value);

    if (!link) {
      return "";
    }

    if (link.indexOf("//") === 0) {
      return "";
    }

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(link)) {
      try {
        var parsed = new URL(link);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return parsed.href;
        }
      } catch (error) {
        return "";
      }

      return "";
    }

    return link;
  }

  function parseArticleId(search) {
    var params = new URLSearchParams(search || window.location.search);
    var id = normalizeText(params.get("id"));

    if (!id || !/^[A-Za-z0-9_-]{20,140}$/.test(id)) {
      return "";
    }

    return id;
  }

  function buildArticleEndpoint(sheetId) {
    if (!sheetId) {
      return "";
    }

    return "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) + "/values/" + ARTICLE_RANGE + "?key=" + API_KEY;
  }

  function showElement(element, visible) {
    if (!element) {
      return;
    }
    element.hidden = !visible;
  }

  function renderError(state, message) {
    showElement(state.status, true);
    showElement(state.layout, false);
    state.status.classList.add("gc-news-article__status--error");
    state.status.textContent = message || "Unable to load this news article right now.";
  }

  function renderReady(state) {
    showElement(state.status, false);
    showElement(state.layout, true);
  }

  function escapeAttribute(value) {
    return normalizeText(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function replaceLegacyInlineTags(value) {
    return normalizeText(value)
      .replace(/<link=([^>]+)>([\s\S]*?)<\/link>/g, function (match, href, label) {
        return '<a class="customlink" href="' + escapeAttribute(href) + '">' + label + "</a>";
      })
      .replace(/<b>/g, "<strong>")
      .split(LEGACY_BOLD_CLOSE)
      .join("</strong>")
      .replace(/<i>/g, "<em>")
      .replace(/<\/i>/g, "</em>");
  }

  function sanitizeNode(source, destination) {
    var allowed = {
      A: true,
      BR: true,
      EM: true,
      FONT: true,
      LI: true,
      P: true,
      PRE: true,
      SOURCE: true,
      STRONG: true,
      UL: true,
      VIDEO: true,
    };
    var child = source.firstChild;

    while (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        destination.appendChild(document.createTextNode(child.nodeValue || ""));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        var tagName = child.tagName.toUpperCase();
        var clean;

        if (allowed[tagName]) {
          clean = document.createElement(tagName === "FONT" ? "span" : tagName.toLowerCase());
          if (tagName === "A") {
            var href = safeHref(child.getAttribute("href"));
            if (href) {
              clean.setAttribute("href", href);
              clean.className = "customlink";
            }
          } else if (tagName === "FONT") {
            var color = normalizeText(child.getAttribute("color"));
            if (/^#?[A-Fa-f0-9]{3,8}$/.test(color)) {
              clean.style.color = color.indexOf("#") === 0 ? color : "#" + color;
            }
          } else if (tagName === "VIDEO") {
            clean.setAttribute("playsinline", "");
            ["autoplay", "muted", "loop", "controls"].forEach(function (attribute) {
              if (child.hasAttribute(attribute)) {
                clean.setAttribute(attribute, "");
              }
            });
            if (normalizeText(child.getAttribute("style")).replace(/\s/g, "").toLowerCase() === "width:100%;") {
              clean.style.width = "100%";
            }
          } else if (tagName === "SOURCE") {
            var sourceUrl = safeHref(child.getAttribute("src"));
            var sourceType = normalizeText(child.getAttribute("type"));
            if (sourceUrl) {
              clean.setAttribute("src", sourceUrl);
            }
            if (sourceType === "video/mp4") {
              clean.setAttribute("type", sourceType);
            }
          }
          sanitizeNode(child, clean);
          if ((tagName === "A" && !clean.getAttribute("href")) || (tagName === "SOURCE" && !clean.getAttribute("src"))) {
            while (clean.firstChild) {
              destination.appendChild(clean.firstChild);
            }
          } else {
            destination.appendChild(clean);
          }
        } else {
          sanitizeNode(child, destination);
        }
      }

      child = child.nextSibling;
    }
  }

  function renderInlineContent(value) {
    var template = document.createElement("template");
    var fragment = document.createDocumentFragment();
    template.innerHTML = replaceLegacyInlineTags(value);
    sanitizeNode(template.content, fragment);
    return fragment;
  }

  function parseImageSpec(value) {
    var raw = normalizeText(value);
    var caption = "";
    var centered = false;
    var marker = "";
    var markerIndex;

    if (raw.indexOf("**caption-center=") > -1) {
      marker = "**caption-center=";
      centered = true;
    } else if (raw.indexOf("**caption=") > -1) {
      marker = "**caption=";
    }

    if (marker) {
      markerIndex = raw.indexOf(marker);
      caption = raw.slice(markerIndex + marker.length);
      raw = raw.slice(0, markerIndex);
    }

    return {
      caption: caption,
      centered: centered,
      src: safeHref(raw),
    };
  }

  function createImageFigure(value, state) {
    var spec = parseImageSpec(value);
    var figure = document.createElement("figure");
    var img;
    var caption;

    if (!spec.src) {
      return document.createDocumentFragment();
    }

    img = document.createElement("img");
    img.src = spec.src;
    img.alt = "";
    img.addEventListener("click", function () {
      openModal(state, spec.src);
    });
    figure.appendChild(img);

    if (spec.caption) {
      caption = document.createElement("figcaption");
      caption.textContent = spec.caption;
      if (spec.centered) {
        caption.className = "gc-news-article__caption--center";
      }
      figure.appendChild(caption);
    }

    return figure;
  }

  function renderArticleBlock(row, state) {
    var element = normalizeText(row[0]).toLowerCase();
    var value = normalizeText(row[1]);
    var wrapper;
    var listItems;
    var i;

    if (element === "title") {
      wrapper = document.createElement("h5");
      wrapper.appendChild(renderInlineContent(value));
      return wrapper;
    }

    if (element === "paragraph") {
      if (value.toLowerCase() === "<pre></pre>") {
        return document.createElement("pre");
      }
      wrapper = document.createElement("p");
      wrapper.appendChild(renderInlineContent(value));
      return wrapper;
    }

    if (element === "list") {
      wrapper = document.createElement("ul");
      listItems = value.split("*");
      for (i = 0; i < listItems.length; i += 1) {
        if (normalizeText(listItems[i])) {
          var li = document.createElement("li");
          li.appendChild(renderInlineContent(listItems[i]));
          wrapper.appendChild(li);
        }
      }
      return wrapper;
    }

    if (element === "image") {
      return createImageFigure(value, state);
    }

    if (element === "sidebysideimage") {
      wrapper = document.createElement("div");
      wrapper.className = "gc-news-article__image-row";
      value.split("*,*").slice(0, 2).forEach(function (imageValue) {
        var column = document.createElement("div");
        column.className = "gc-news-article__image-column";
        column.appendChild(createImageFigure(imageValue, state));
        wrapper.appendChild(column);
      });
      return wrapper;
    }

    return document.createDocumentFragment();
  }

  function renderArticleRows(state, rows) {
    var title = normalizeText(rows[0] && rows[0][1]);
    var date = normalizeText(rows[1] && rows[1][1]);
    var fragment = document.createDocumentFragment();
    var i;

    state.title.textContent = title || "News";
    state.date.textContent = date;
    state.body.innerHTML = "";

    for (i = 2; i < rows.length; i += 1) {
      fragment.appendChild(renderArticleBlock(rows[i] || [], state));
    }

    state.body.appendChild(fragment);
  }

  function createRelatedCard(row) {
    var title = normalizeText(row[0]) || "Untitled item";
    var date = normalizeText(row[1]);
    var description = normalizeText(row[2]);
    var link = safeHref(row[3]);
    var category = normalizeText(row[4]) || "News";
    var cardClass = categoryClass(category);
    var card = document.createElement("a");
    var body = document.createElement("div");
    var titleEl = document.createElement("h3");
    var dateEl;
    var descriptionEl;

    card.className = "gc-news-card" + (cardClass ? " " + cardClass : "");
    card.href = link || "";
    card.target = "_self";
    card.rel = "noopener";

    body.className = "gc-news-card__body";

    titleEl.className = "gc-news-card__title";
    titleEl.textContent = title;
    body.appendChild(titleEl);

    if (date) {
      dateEl = document.createElement("p");
      dateEl.className = "gc-news-card__date";
      dateEl.textContent = date;
      body.appendChild(dateEl);
    }

    if (description) {
      descriptionEl = document.createElement("p");
      descriptionEl.className = "gc-news-card__description";
      descriptionEl.textContent = description;
      body.appendChild(descriptionEl);
    }

    card.appendChild(body);
    return card;
  }

  function renderRelatedNews(state, rows) {
    var fragment = document.createDocumentFragment();

    state.related.innerHTML = "";

    rows.slice(0, RELATED_NEWS_COUNT).forEach(function (row) {
      fragment.appendChild(createRelatedCard(row || []));
    });

    state.related.appendChild(fragment);
  }

  function openModal(state, src) {
    if (!state.modal || !state.modalImage) {
      return;
    }
    state.modalImage.src = src;
    showElement(state.modal, true);
  }

  function closeModal(state) {
    if (!state.modal || !state.modalImage) {
      return;
    }
    state.modalImage.removeAttribute("src");
    showElement(state.modal, false);
  }

  function fetchJson(endpoint) {
    return fetch(endpoint, { method: "GET" }).then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed with status " + response.status);
      }
      return response.json();
    });
  }

  function initializeNewsArticle(root) {
    var state = {
      body: root.querySelector("[data-gc-news-article-body]"),
      date: root.querySelector("[data-gc-news-article-date]"),
      layout: root.querySelector("[data-gc-news-article-layout]"),
      modal: root.querySelector("[data-gc-news-article-modal]"),
      modalClose: root.querySelector("[data-gc-news-article-modal-close]"),
      modalImage: root.querySelector("[data-gc-news-article-modal-image]"),
      related: root.querySelector("[data-gc-news-related]"),
      status: root.querySelector("[data-gc-news-article-status]"),
      title: root.querySelector("[data-gc-news-article-title]"),
    };
    var articleId = parseArticleId(window.location.search);
    var endpoint = buildArticleEndpoint(articleId);

    if (state.modalClose) {
      state.modalClose.addEventListener("click", function () {
        closeModal(state);
      });
    }

    if (state.modal) {
      state.modal.addEventListener("click", function (event) {
        if (event.target === state.modal) {
          closeModal(state);
        }
      });
    }

    if (!articleId || !endpoint) {
      renderError(state, "Unable to load this news article because the article link is invalid.");
      return;
    }

    fetchJson(endpoint)
      .then(function (articlePayload) {
        var articleRows = Array.isArray(articlePayload && articlePayload.values) ? articlePayload.values : [];

        if (articleRows.length < 2) {
          renderError(state, "Unable to load this news article right now.");
          return;
        }

        renderArticleRows(state, articleRows);
        renderReady(state);
        fetchJson(MAIN_FEED_ENDPOINT)
          .then(function (relatedPayload) {
            var relatedRows = Array.isArray(relatedPayload && relatedPayload.values) ? relatedPayload.values : [];
            renderRelatedNews(state, relatedRows);
          })
          .catch(function (error) {
            if (window.console && window.console.error) {
              window.console.error(error);
            }
          });
      })
      .catch(function (error) {
        renderError(state, "Unable to load this news article right now.");
        if (window.console && window.console.error) {
          window.console.error(error);
        }
      });
  }

  function boot() {
    var roots = document.querySelectorAll("[data-gc-news-article]");
    var i;

    for (i = 0; i < roots.length; i += 1) {
      initializeNewsArticle(roots[i]);
    }
  }

  window.GCNewsArticle = {
    ARTICLE_RANGE: ARTICLE_RANGE,
    MAIN_FEED_ENDPOINT: MAIN_FEED_ENDPOINT,
    buildArticleEndpoint: buildArticleEndpoint,
    categoryClass: categoryClass,
    initializeNewsArticle: initializeNewsArticle,
    LEGACY_ARTICLE_PATH: LEGACY_ARTICLE_PATH,
    parseArticleId: parseArticleId,
    renderArticleBlock: renderArticleBlock,
    renderInlineContent: renderInlineContent,
    renderRelatedNews: renderRelatedNews,
    safeHref: safeHref,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
