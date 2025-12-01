// ------------------ Theme (dark / light) ------------------
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

function applyTheme(theme) {
  const t = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;

  // 1) Set attribute on <html>
  try {
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}

  // 2) Update button icon + aria to match the *current* theme
  const btn = document.getElementById("themeToggle");
  if (btn) {
    // Icon shows current theme: moon for dark, sun for light
    btn.textContent = t === THEME_DARK ? "🌙" : "☀️";

    // aria-pressed = true when dark mode is ON (you can flip if you prefer)
    btn.setAttribute("aria-pressed", t === THEME_DARK ? "true" : "false");
  }

  // 3) Persist
  try {
    localStorage.setItem("theme", t);
  } catch (e) {}
}

(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");

    // Default is LIGHT, but if OS prefers DARK, use DARK
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const theme = saved || (prefersDark ? THEME_DARK : THEME_LIGHT);
    applyTheme(theme);
  } catch (e) {
    /* ignore */
  }
})();

// Toggle via the button (delegated click handler)
document.addEventListener("click", (ev) => {
  const t = ev.target;
  if (t && t.id === "themeToggle") {
    // Always read current theme from the DOM so icon + color stay aligned
    const currentAttr =
      document.documentElement.getAttribute("data-theme") === THEME_DARK
        ? THEME_DARK
        : THEME_LIGHT;

    const nextTheme = currentAttr === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    applyTheme(nextTheme);
  }
});
