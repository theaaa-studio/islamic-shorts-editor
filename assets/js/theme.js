// ------------------ Theme (dark / light) ------------------
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  try {
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.textContent = t === "light" ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
  }
  try {
    localStorage.setItem("theme", t);
  } catch (e) {}
}

(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    applyTheme(theme);
  } catch (e) {
    /* ignore */
  }
})();

// Toggle via the button (delegated click handler)
document.addEventListener("click", (ev) => {
  const t = ev.target;
  if (t && t.id === "themeToggle") {
    const cur =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  }
});

