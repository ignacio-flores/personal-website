(function () {
  "use strict";

  const ENDPOINT = "https://sheets.googleapis.com/v4/spreadsheets/1HJS2iWAEHuNpfy0Ll_JQdAag-iwZitCptuQdUUaL414/values/Sheet1!A2:E1000?key=AIzaSyBUCn9sR6Cca3fOh2eOZG0eDpE0H2i9cs8";
  const LEGACY_GENERAL_NEWS = "GENERAL NEWS";
  const ITEMS_PER_PAGE = 10;
  const PAGINATION_SIZE = 5;

  function normalizeText(value) {
    return (value == null ? "" : String(value)).trim();
  }

  function categorySlug(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/ /g, "");
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

  function categoryClass(category) {
    var normalized = categorySlug(category);
    if (!normalized || normalized === "news" || normalized === categorySlug(LEGACY_GENERAL_NEWS)) {
      return "";
    }
    return normalized + "card";
  }

  function getPageList(totalPages, page, maxLength) {
    function range(start, end) {
      var items = [];
      var i;
      for (i = start; i <= end; i += 1) {
        items.push(i);
      }
      return items;
    }

    var sideWidth = maxLength < 9 ? 1 : 2;
    var leftWidth = Math.floor((maxLength - sideWidth * 2 - 3) / 2);
    var rightWidth = leftWidth;

    if (totalPages <= maxLength) {
      return range(1, totalPages);
    }

    if (page <= maxLength - sideWidth - 1 - rightWidth) {
      return range(1, maxLength - sideWidth - 1).concat([0], range(totalPages - sideWidth + 1, totalPages));
    }

    if (page >= totalPages - sideWidth - 1 - rightWidth) {
      return range(1, sideWidth).concat([0], range(totalPages - sideWidth - 1 - rightWidth - leftWidth, totalPages));
    }

    return range(1, sideWidth).concat([0], range(page - leftWidth, page + rightWidth), [0], range(totalPages - sideWidth + 1, totalPages));
  }

  function showElement(element, visible) {
    if (!element) {
      return;
    }
    element.hidden = !visible;
  }

  function createCard(row) {
    var title = normalizeText(row[0]) || "Untitled item";
    var date = normalizeText(row[1]);
    var description = normalizeText(row[2]);
    var link = safeHref(row[3]);
    var category = normalizeText(row[4]) || "News";
    var cardClass = categoryClass(category);
    var isNewsCategory = categorySlug(category) === "news" || categorySlug(category) === categorySlug(LEGACY_GENERAL_NEWS) || !category;

    var card = document.createElement("a");
    card.className = "gc-news-card" + (cardClass ? " " + cardClass : "") + (isNewsCategory ? "" : " gc-news-card--tinted");
    card.href = link || "";
    card.target = "_self";
    card.rel = "noopener";

    var body = document.createElement("div");
    body.className = "gc-news-card__body";

    var heading = document.createElement("div");
    heading.className = "gc-news-card__heading";

    if (!isNewsCategory) {
      var kicker = document.createElement("p");
      kicker.className = "gc-news-card__kicker";
      kicker.textContent = category.toUpperCase() + " |";
      heading.appendChild(kicker);
    }

    var titleEl = document.createElement("h3");
    titleEl.className = "gc-news-card__title";
    titleEl.textContent = title;
    heading.appendChild(titleEl);

    body.appendChild(heading);

    if (date) {
      var dateEl = document.createElement("p");
      dateEl.className = "gc-news-card__date";
      dateEl.textContent = date;
      body.appendChild(dateEl);
    }

    if (description) {
      var descriptionEl = document.createElement("p");
      descriptionEl.className = "gc-news-card__description";
      descriptionEl.textContent = description;
      body.appendChild(descriptionEl);
    }

    card.appendChild(body);
    return card;
  }

  function renderEmpty(state) {
    showElement(state.status, false);
    showElement(state.cards, false);
    showElement(state.empty, true);
    showElement(state.pagination, false);
  }

  function renderError(state, message) {
    showElement(state.status, true);
    showElement(state.cards, false);
    showElement(state.empty, false);
    showElement(state.pagination, false);
    state.status.classList.add("gc-news-feed__status--error");
    state.status.textContent = message || "Unable to load news items right now.";
  }

  function renderPagination(state, totalPages, currentPage) {
    var pagination = state.pagination;
    var fragment = document.createDocumentFragment();
    var prev = document.createElement("button");
    var next = document.createElement("button");
    var pageItems = getPageList(totalPages, currentPage, PAGINATION_SIZE);
    var i;

    pagination.innerHTML = "";

    prev.type = "button";
    prev.className = "gc-news-feed__page-control";
    prev.textContent = "< Prev";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", function () {
      state.renderPage(currentPage - 1);
    });
    fragment.appendChild(prev);

    for (i = 0; i < pageItems.length; i += 1) {
      (function (item) {
        if (!item) {
          var dots = document.createElement("span");
          dots.className = "gc-news-feed__page-dots";
          dots.textContent = "...";
          fragment.appendChild(dots);
          return;
        }

        var pageButton = document.createElement("button");
        pageButton.type = "button";
        pageButton.className = "gc-news-feed__page-number";
        if (item === currentPage) {
          pageButton.className += " is-active";
          pageButton.setAttribute("aria-current", "page");
        }
        pageButton.textContent = String(item);
        pageButton.addEventListener("click", function () {
          state.renderPage(item);
        });
        fragment.appendChild(pageButton);
      })(pageItems[i]);
    }

    next.type = "button";
    next.className = "gc-news-feed__page-control";
    next.textContent = "Next >";
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", function () {
      state.renderPage(currentPage + 1);
    });
    fragment.appendChild(next);

    pagination.appendChild(fragment);
    showElement(pagination, true);
  }

  function initializeNewsFeed(root) {
    var state = {
      cards: root.querySelector("[data-gc-news-cards]"),
      empty: root.querySelector("[data-gc-news-empty]"),
      pagination: root.querySelector("[data-gc-news-pagination]"),
      status: root.querySelector("[data-gc-news-status]"),
      items: [],
      currentPage: 1,
      renderPage: null,
    };

    state.renderPage = function (page) {
      var totalPages = Math.max(1, Math.ceil(state.items.length / ITEMS_PER_PAGE));
      var safePage = Math.min(Math.max(page, 1), totalPages);
      var start = (safePage - 1) * ITEMS_PER_PAGE;
      var end = start + ITEMS_PER_PAGE;
      var fragment = document.createDocumentFragment();
      var visibleItems = state.items.slice(start, end);
      var i;

      state.currentPage = safePage;
      state.cards.innerHTML = "";

      for (i = 0; i < visibleItems.length; i += 1) {
        fragment.appendChild(createCard(visibleItems[i]));
      }

      state.cards.appendChild(fragment);
      showElement(state.status, false);
      showElement(state.empty, false);
      showElement(state.cards, true);
      renderPagination(state, totalPages, safePage);
    };

    fetch(ENDPOINT, { method: "GET" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Request failed with status " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        var rows = Array.isArray(payload && payload.values) ? payload.values : [];
        var items = [];
        var i;

        for (i = 0; i < rows.length; i += 1) {
          var row = rows[i] || [];
          var title = normalizeText(row[0]);
          var date = normalizeText(row[1]);
          var description = normalizeText(row[2]);
          var link = normalizeText(row[3]);
          var category = normalizeText(row[4]);

          if (!title && !date && !description && !link && !category) {
            continue;
          }

          if (!title && !description && !link) {
            continue;
          }

          items.push([title, date, description, link, category || "News"]);
        }

        state.items = items;

        if (!state.items.length) {
          renderEmpty(state);
          return;
        }

        state.status.textContent = "";
        state.renderPage(1);
      })
      .catch(function (error) {
        renderError(state, "Unable to load news items right now.");
        if (window.console && window.console.error) {
          window.console.error(error);
        }
      });
  }

  function boot() {
    var roots = document.querySelectorAll("[data-gc-news-feed]");
    var i;

    for (i = 0; i < roots.length; i += 1) {
      initializeNewsFeed(roots[i]);
    }
  }

  window.GCNewsFeed = {
    ENDPOINT: ENDPOINT,
    ITEMS_PER_PAGE: ITEMS_PER_PAGE,
    PAGINATION_SIZE: PAGINATION_SIZE,
    categoryClass: categoryClass,
    getPageList: getPageList,
    initializeNewsFeed: initializeNewsFeed,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
