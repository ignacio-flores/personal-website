(function () {
  const COUNTRY_SYNC_MESSAGE = "gc:sync-country";
  const LEGACY_COUNTRY_SYNC_MESSAGE = "updateCountry";
  const embedReadyClass = "gc-embed-shell--ready";
  const embedFallbackClass = "gc-embed-shell--fallback";

  function setStatus(shell, message) {
    const status = shell.querySelector("[data-gc-embed-status]");

    if (status) {
      status.textContent = message;
    }
  }

  function wireEmbedShell(shell) {
    const frames = Array.from(shell.querySelectorAll("iframe[data-gc-embed-frame]"));

    if (!frames.length) {
      return;
    }

    let loadedFrames = 0;
    const fallbackTimer = window.setTimeout(() => {
      if (!shell.classList.contains(embedReadyClass)) {
        shell.classList.add(embedFallbackClass);
        setStatus(shell, "The preview is taking longer than expected. Use the open link if it stays blank.");
      }
    }, 15000);

    frames.forEach((frame) => {
      frame.addEventListener("load", () => {
        loadedFrames += 1;

        if (loadedFrames >= frames.length) {
          window.clearTimeout(fallbackTimer);
          shell.classList.add(embedReadyClass);
          setStatus(shell, "");
        }
      });
    });
  }

  function syncCountry(select) {
    const group = select.getAttribute("data-gc-sync-group");

    if (!group) {
      return;
    }

    const value = select.value;
    const selectedOption = select.selectedOptions?.[0];
    const displayValue = selectedOption?.dataset.gcDisplayCountry || value;
    const labels = Array.from(
      document.querySelectorAll(`[data-gc-selected-country="${group}"]`)
    );
    const frames = Array.from(
      document.querySelectorAll(`iframe[data-gc-sync-target="${group}"]`)
    );

    labels.forEach((label) => {
      label.textContent = displayValue;
    });

    frames.forEach((frame) => {
      try {
        frame.contentWindow?.postMessage(
          JSON.stringify({
            type: LEGACY_COUNTRY_SYNC_MESSAGE,
            country: value,
          }),
          "*"
        );
        frame.contentWindow?.postMessage(
          {
            type: LEGACY_COUNTRY_SYNC_MESSAGE,
            country: value,
            group,
          },
          "*"
        );
        frame.contentWindow?.postMessage(
          {
            type: COUNTRY_SYNC_MESSAGE,
            group,
            value,
          },
          "*"
        );
      } catch (error) {
        // External embeds may ignore postMessage or reject cross-origin access.
      }
    });

    const shell = select.closest("[data-gc-embed-shell]");
    if (shell && shell.classList.contains(embedFallbackClass)) {
      setStatus(shell, "");
      shell.classList.remove(embedFallbackClass);
    }
  }

  function wireCountrySelectors() {
    const selects = Array.from(
      document.querySelectorAll("[data-gc-sync-control][data-gc-sync-group]")
    );

    selects.forEach((select) => {
      select.addEventListener("change", () => syncCountry(select));
      syncCountry(select);
    });
  }

  function init() {
    document
      .querySelectorAll("[data-gc-embed-shell]")
      .forEach((shell) => wireEmbedShell(shell));
    wireCountrySelectors();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
