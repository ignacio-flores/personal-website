(function () {
  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getEntries(library) {
    return Array.from(library.querySelectorAll(".gc-library-entry"));
  }

  function entrySortValue(entry, mode) {
    if (mode === "year-desc") {
      return entry.dataset.yearSort || "0000";
    }
    if (mode === "title") {
      return entry.dataset.titleSort || "";
    }
    return entry.dataset.authorSort || "";
  }

  function compareEntries(mode) {
    return function (a, b) {
      if (mode === "year-desc") {
        const yearDiff = Number(entrySortValue(b, mode)) - Number(entrySortValue(a, mode));
        if (yearDiff !== 0) return yearDiff;
      } else {
        const valueDiff = entrySortValue(a, mode).localeCompare(entrySortValue(b, mode));
        if (valueDiff !== 0) return valueDiff;
      }
      const authorDiff = (a.dataset.authorSort || "").localeCompare(b.dataset.authorSort || "");
      if (authorDiff !== 0) return authorDiff;
      const titleDiff = (a.dataset.titleSort || "").localeCompare(b.dataset.titleSort || "");
      if (titleDiff !== 0) return titleDiff;
      return Number(a.dataset.originalOrder || 0) - Number(b.dataset.originalOrder || 0);
    };
  }

  function captureOpenGroups(library) {
    const states = new Map();
    library.querySelectorAll(".gc-library-year-group").forEach((group) => {
      states.set(group.dataset.groupKey || "", group.open);
    });
    return states;
  }

  function sortedYearLabels(entries) {
    const labels = Array.from(new Set(entries.map((entry) => entry.dataset.yearLabel || "No year")));
    return labels.sort((a, b) => {
      const aYear = /^\d+$/.test(a) ? Number(a) : -1;
      const bYear = /^\d+$/.test(b) ? Number(b) : -1;
      if (aYear !== bYear) return bYear - aYear;
      return a.localeCompare(b);
    });
  }

  function createYearGroup(label, entries, openStates) {
    const group = document.createElement("details");
    group.className = "gc-library-year-group";
    group.dataset.groupKey = label;
    group.open = openStates.has(label) ? openStates.get(label) : true;

    const summary = document.createElement("summary");
    const labelSpan = document.createElement("span");
    labelSpan.className = "gc-library-year-group__label";
    labelSpan.textContent = label;
    const countSpan = document.createElement("span");
    countSpan.className = "gc-library-year-group__count";
    countSpan.append("(", document.createElement("span"), ")");
    countSpan.querySelector("span").dataset.groupVisibleCount = "";
    countSpan.querySelector("span").textContent = String(entries.length);
    summary.append(labelSpan, " ", countSpan);

    const list = document.createElement("ol");
    list.className = "gc-library-list";
    entries.forEach((entry) => list.appendChild(entry));
    group.append(summary, list);
    return group;
  }

  function renderLayout(library) {
    const container = library.querySelector(".gc-library-groups");
    const groupSelect = library.querySelector(".gc-library-group");
    const sortSelect = library.querySelector(".gc-library-sort");
    if (!container) return;

    const entries = getEntries(library);
    const openStates = captureOpenGroups(library);
    const sortMode = sortSelect ? sortSelect.value || "author" : "author";
    const groupMode = groupSelect ? groupSelect.value || "year" : "year";
    container.textContent = "";

    if (groupMode === "none") {
      const flat = document.createElement("div");
      flat.className = "gc-library-flat-group";
      const list = document.createElement("ol");
      list.className = "gc-library-list";
      entries.sort(compareEntries(sortMode)).forEach((entry) => list.appendChild(entry));
      flat.appendChild(list);
      container.appendChild(flat);
      return;
    }

    const grouped = new Map();
    entries.forEach((entry) => {
      const label = entry.dataset.yearLabel || "No year";
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(entry);
    });
    sortedYearLabels(entries).forEach((label) => {
      const groupEntries = grouped.get(label).sort(compareEntries(sortMode));
      container.appendChild(createYearGroup(label, groupEntries, openStates));
    });
  }

  function updateVisibleCount(library) {
    const entries = getEntries(library);
    const visible = entries.filter((entry) => !entry.hidden).length;
    const count = library.querySelector("[data-visible-count]");
    const empty = library.querySelector(".gc-library-empty");
    if (count) count.textContent = String(visible);
    if (empty) empty.hidden = visible !== 0;
    library.querySelectorAll(".gc-library-year-group").forEach((group) => {
      const groupEntries = Array.from(group.querySelectorAll(".gc-library-entry"));
      const groupVisible = groupEntries.filter((entry) => !entry.hidden).length;
      const groupCount = group.querySelector("[data-group-visible-count]");
      if (groupCount) groupCount.textContent = String(groupVisible);
      group.hidden = groupVisible === 0;
    });
  }

  function filterEntries(library) {
    const input = library.querySelector(".gc-library-search");
    const query = normalize(input ? input.value : "");
    library.querySelectorAll(".gc-library-entry").forEach((entry) => {
      const haystack = entry.dataset.search || normalize(entry.textContent);
      entry.hidden = query.length > 0 && !haystack.includes(query);
    });
    updateVisibleCount(library);
  }

  function sortEntries(library) {
    renderLayout(library);
    filterEntries(library);
  }

  function downloadVisibleBibtex(library) {
    const entries = getEntries(library).filter((entry) => !entry.hidden);
    const bibtex = entries
      .map((entry) => {
        const source = entry.querySelector(".gc-library-bibtex-source");
        return source ? source.textContent.trim() : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (!bibtex) return;

    const button = library.querySelector(".gc-library-download");
    const fileName = button && button.dataset.downloadName ? button.dataset.downloadName : "digital-library.bib";
    const blob = new Blob([bibtex + "\n"], { type: "application/x-bibtex;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 0);
  }

  function toggleEntryPanel(button) {
    const panelId = button.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    panel.hidden = isOpen;
  }

  function initLibrary(library) {
    const search = library.querySelector(".gc-library-search");
    const group = library.querySelector(".gc-library-group");
    const sort = library.querySelector(".gc-library-sort");
    const download = library.querySelector(".gc-library-download");
    if (search) {
      search.addEventListener("input", function () {
        filterEntries(library);
      });
    }
    if (group) {
      group.addEventListener("change", function () {
        sortEntries(library);
      });
    }
    if (sort) {
      sort.addEventListener("change", function () {
        sortEntries(library);
      });
    }
    if (download) {
      download.addEventListener("click", function () {
        downloadVisibleBibtex(library);
      });
    }
    library.querySelectorAll("[data-library-toggle]").forEach((button) => {
      button.addEventListener("click", function () {
        toggleEntryPanel(button);
      });
    });
    renderLayout(library);
    updateVisibleCount(library);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".gc-library-output").forEach(initLibrary);
  });
})();
