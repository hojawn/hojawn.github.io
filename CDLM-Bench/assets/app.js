(() => {
  "use strict";

  const nav = document.querySelector("#site-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  };
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(expanded));
    nav.classList.toggle("is-open", expanded);
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const observedSections = links.map(link => document.querySelector(link.getAttribute("href")));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-80px 0px -65% 0px", threshold: 0 });
  observedSections.forEach(section => observer.observe(section));

  document.querySelectorAll("[data-copy]").forEach(button => {
    const original = button.textContent;
    button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copy);
      const value = source.textContent;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const field = document.createElement("textarea");
          field.value = value;
          field.setAttribute("readonly", "");
          field.style.position = "fixed";
          field.style.left = "-9999px";
          document.body.appendChild(field);
          field.select();
          const copied = document.execCommand("copy");
          field.remove();
          if (!copied) throw new Error("Clipboard unavailable");
          button.focus();
        }
        button.textContent = "Copied ✓";
        document.querySelector(".copy-status").textContent = "Copied to clipboard.";
      } catch {
        button.textContent = "Select to copy";
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(source);
        selection.removeAllRanges();
        selection.addRange(range);
        document.querySelector(".copy-status").textContent = "Text selected. Use your device's copy command.";
      }
      window.setTimeout(() => { button.textContent = original; }, 2200);
    });
  });

  const dots = [];
  const ns = "http://www.w3.org/2000/svg";
  const dotGroup = document.querySelector("#support-dots");
  for (let index = 0; index < 48; index++) {
    const column = index % 12;
    const row = Math.floor(index / 12);
    const point = {
      x: 38 + column * 42 + Math.sin(index * 2.3) * 7,
      y: 26 + row * 36 + Math.cos(index * 1.7) * 8
    };
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", 4.3);
    dot.setAttribute("fill", "url(#dot-gradient)");
    dot.setAttribute("opacity", String(.45 + (index % 5) * .11));
    dotGroup.appendChild(dot);
    dots.push({ element: dot, point });
  }

  const labels = {
    control: "Independent real control",
    best_single_high_entropy: "One selected text × 512",
    unique_256: "256 texts × 2",
    unique_128: "128 texts × 4",
    unique_64: "64 texts × 8",
    unique_16: "16 texts × 32",
    unique_1: "First control text × 512",
    easy_quartile: "Judge-easiest quartile",
    topic_quartile: "Mean-feature-neighbor quartile",
    near_repeat: "64 texts + distinct numeric suffixes",
    splice_begin: "13-token splice · beginning",
    splice_middle: "13-token splice · middle",
    splice_end: "13-token splice · end",
    splice_rows_1pct: "Middle splice · 1% of rows",
    splice_rows_2pct: "Middle splice · 2% of rows",
    splice_rows_5pct: "Middle splice · 5% of rows",
    splice_rows_10pct: "Middle splice · 10% of rows",
    splice_rows_25pct: "Middle splice · 25% of rows",
    splice_rows_50pct: "Middle splice · 50% of rows",
    block_permute: "Four-block reordering",
    within_repeat: "Within-text 32-token repetition",
    whitespace: "Doubled spaces",
    reference_replay: "Scoring-reference replay"
  };
  const groups = {
    collapse: ["control", "best_single_high_entropy", "unique_256", "unique_64", "easy_quartile", "near_repeat"],
    corruption: ["control", "splice_begin", "splice_middle", "splice_end", "splice_rows_10pct", "block_permute", "within_repeat"],
    formatting: ["control", "whitespace"],
    all: Object.keys(labels)
  };
  const insights = {
    collapse: "Repeating one selected text improves both conventional scores, while MMD and MAUVE reveal the collapsed output distribution.",
    corruption: "Edit location changes metric sensitivity. Sparse corruption can stay close to the control on distribution scores while judge perplexity rises.",
    formatting: "Doubling spaces changes tokenization and produces a large distribution-score response. Score magnitude is not a direct scale of semantic damage.",
    all: "Each construction tests a specific failure mode. Interpret scores alongside their representation, sample budget, and experimental controls."
  };
  let dataset = null;

  const updateDemo = key => {
    if (!dataset) return;
    const selected = dataset.cases[key].mean;
    const collapsed = key !== "control";
    document.querySelector("#demo-title").replaceChildren(
      document.createTextNode(collapsed ? "One selected text." : "512 real texts."),
      document.createElement("br"),
      document.createTextNode(collapsed ? "512 identical outputs." : "A reference distribution.")
    );
    document.querySelectorAll("[data-demo]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.demo === key));
    });
    document.querySelector(".hero-demo").classList.toggle("is-collapsed", collapsed);
    document.querySelector("#demo-ppl").textContent = selected.gen_ppl.toFixed(3);
    document.querySelector("#demo-entropy").textContent = selected.H_row.toFixed(3);
    document.querySelector("#demo-mmd").textContent = selected.mmd_current.toFixed(5);
    document.querySelector("#support-count").textContent = collapsed ? "1 distinct text" : "512 distinct texts";
    document.querySelector("#demo-takeaway").textContent = collapsed
      ? "Gen PPL and within-text entropy look better. Output diversity disappears."
      : "An independent real sample provides a reference for finite-sample variation.";
    document.querySelector("#support-description").textContent = collapsed
      ? "Every output repeats one selected text: the output support has collapsed to one point. The point position is illustrative."
      : "Distinct source texts spread across a field. Point positions are schematic and are not an embedding projection.";
    dots.forEach(({ element, point }, index) => {
      element.setAttribute("cx", collapsed ? "270" : String(point.x));
      element.setAttribute("cy", collapsed ? "83" : String(point.y));
      element.setAttribute("r", collapsed && index === 0 ? "7" : "4.3");
      element.setAttribute("opacity", collapsed ? (index === 0 ? "1" : "0") : String(.45 + (index % 5) * .11));
    });
  };

  const addScore = (row, mean, deviation, decimals) => {
    const cell = document.createElement("td");
    cell.appendChild(document.createTextNode(mean.toFixed(decimals)));
    if (deviation !== null) {
      const small = document.createElement("small");
      small.textContent = " ± " + deviation.toFixed(decimals);
      cell.appendChild(small);
    }
    row.appendChild(cell);
  };
  const updateResults = filter => {
    if (!dataset) return;
    const body = document.querySelector("#results-body");
    const fragment = document.createDocumentFragment();
    groups[filter].forEach(key => {
      const result = dataset.cases[key];
      const row = document.createElement("tr");
      if (key === "control") row.classList.add("control-row");
      const label = document.createElement("th");
      label.setAttribute("scope", "row");
      label.textContent = labels[key];
      row.appendChild(label);
      addScore(row, result.mean.gen_ppl, null, 3);
      addScore(row, result.mean.H_row, null, 3);
      addScore(row, result.mean.mmd_current, result.sd.mmd_current, 5);
      addScore(row, result.mean.mauve, result.sd.mauve, 5);
      fragment.appendChild(row);
    });
    body.replaceChildren(fragment);
    document.querySelector("#filter-insight").textContent = insights[filter];
    document.querySelectorAll("[data-filter]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    });
  };
  document.querySelectorAll("[data-demo]").forEach(button => {
    button.addEventListener("click", () => updateDemo(button.dataset.demo));
  });
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => updateResults(button.dataset.filter));
  });
  fetch("./assets/benchmark-data.json")
    .then(response => {
      if (!response.ok) throw new Error("Benchmark data could not be loaded.");
      return response.json();
    })
    .then(data => {
      if (!data.cases.control || !data.cases.best_single_high_entropy) throw new Error("Invalid benchmark data.");
      dataset = data;
      updateDemo("control");
      updateResults("collapse");
      document.documentElement.dataset.benchmarkReady = "true";
    })
    .catch(() => {
      document.querySelectorAll("[data-demo], [data-filter]").forEach(button => { button.disabled = true; });
      document.querySelector("#filter-insight").textContent = "Saved control results are shown. Reload this page to load the interactive data.";
    });
})();
