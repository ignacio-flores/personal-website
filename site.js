(function () {
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
  citationMenus.forEach(function (menu) {
    menu.addEventListener("toggle", function () {
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

  var sections = Array.from(document.querySelectorAll("[data-research-section]"));
  var directoryLinks = Array.from(document.querySelectorAll("[data-research-target]"));
  if (!sections.length || !directoryLinks.length) return;

  function setCurrent(sectionId) {
    directoryLinks.forEach(function (link) {
      if (link.dataset.researchTarget === sectionId) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  setCurrent(sections[0].id);

  if ("IntersectionObserver" in window) {
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
