(function () {
  function updateHeaderHeight() {
    var measuredOffset = parseFloat(document.body.getAttribute("data-bs-offset"));
    var header = document.getElementById("quarto-header");
    var height = Number.isFinite(measuredOffset) && measuredOffset >= 0
      ? measuredOffset
      : header ? header.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--site-header-height", height + "px");
  }

  updateHeaderHeight();
  window.addEventListener("quarto-hrChanged", updateHeaderHeight);

  var backToTop = document.getElementById("quarto-back-to-top");
  if (backToTop) {
    backToTop.tabIndex = 0;
    backToTop.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      backToTop.click();
    });
  }

  function fallbackCopy(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Copy command failed");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    }
    return new Promise(function (resolve, reject) {
      try {
        fallbackCopy(text);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  document.querySelectorAll(".citation-copy").forEach(function (button) {
    button.addEventListener("click", function () {
      var label = button.querySelector("span");
      var icon = button.querySelector("i");
      var format = button.dataset.format;
      var originalLabel = label.textContent;
      var originalAriaLabel = button.getAttribute("aria-label");

      copyText(button.dataset.citation).then(function () {
        label.textContent = format + " copied";
        icon.className = "bi bi-check2";
        button.setAttribute("aria-label", format + " citation copied");
        window.setTimeout(function () {
          label.textContent = originalLabel;
          icon.className = "bi bi-clipboard";
          button.setAttribute("aria-label", originalAriaLabel);
        }, 1600);
      }).catch(function () {
        label.textContent = "Copy failed";
        button.setAttribute("aria-label", "Citation could not be copied");
        window.setTimeout(function () {
          label.textContent = originalLabel;
          button.setAttribute("aria-label", originalAriaLabel);
        }, 2000);
      });
    });
  });

  var citationMenus = Array.from(document.querySelectorAll(".citation-menu"));

  function positionCitationMenu(menu) {
    menu.style.removeProperty("--citation-offset");
    if (!menu.open || window.innerWidth < 992) return;

    var options = menu.querySelector(".citation-options");
    if (!options) return;

    var content = document.querySelector(".content-block");
    var contentGutter = content ? parseFloat(window.getComputedStyle(content).paddingLeft) : 0;
    var gutter = Math.max(16, Number.isFinite(contentGutter) ? contentGutter : 0);
    var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    var bounds = options.getBoundingClientRect();
    var left = Math.max(gutter, Math.min(bounds.left, viewportWidth - gutter - bounds.width));
    menu.style.setProperty("--citation-offset", (left - bounds.left) + "px");
  }

  citationMenus.forEach(function (menu) {
    menu.addEventListener("toggle", function () {
      positionCitationMenu(menu);
      if (!menu.open) return;
      citationMenus.forEach(function (otherMenu) {
        if (otherMenu !== menu) otherMenu.removeAttribute("open");
      });
    });
  });

  document.addEventListener("click", function (event) {
    citationMenus.forEach(function (menu) {
      if (menu.open && !menu.contains(event.target)) menu.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    citationMenus.forEach(function (menu) {
      if (!menu.open) return;
      menu.removeAttribute("open");
      var summary = menu.querySelector("summary");
      if (summary) summary.focus();
      event.preventDefault();
    });
  });

  window.addEventListener("resize", function () {
    updateHeaderHeight();
    citationMenus.forEach(positionCitationMenu);
  });

  var sections = Array.from(document.querySelectorAll("[data-research-section]"));
  var directoryLinks = Array.from(document.querySelectorAll("[data-research-target]"));

  function setCurrent(sectionId) {
    directoryLinks.forEach(function (link) {
      if (link.dataset.researchTarget === sectionId) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (sections.length && directoryLinks.length) setCurrent(sections[0].id);

  if (sections.length && directoryLinks.length && "IntersectionObserver" in window) {
    var visibleSections = new Map();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleSections.set(entry.target.id, entry.boundingClientRect.top);
        } else {
          visibleSections.delete(entry.target.id);
        }
      });

      var current = sections
        .filter(function (section) { return visibleSections.has(section.id); })
        .sort(function (a, b) {
          return Math.abs(visibleSections.get(a.id)) - Math.abs(visibleSections.get(b.id));
        })[0];

      if (current) setCurrent(current.id);
    }, { rootMargin: "-12% 0px -68% 0px", threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }
})();
