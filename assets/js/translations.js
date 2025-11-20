// ------------------ Translations (populate all editions) ------------------
async function loadTranslations() {
  // If there's no <select id="translationEdition">, nothing to do
  const translationEditionSel = $("#translationEdition");
  if (!translationEditionSel) return;

  // Capture the current value BEFORE we wipe it with "Loading..."
  const initialVal = translationEditionSel.value;

  // Temporary UI
  translationEditionSel.disabled = true;
  translationEditionSel.innerHTML = `<option value="">Loading translations…</option>`;

  try {
    // Pull ALL text translations from AlQuran Cloud
    // Docs: https://api.alquran.cloud/v1/edition?format=text&type=translation
    const res = await fetchRetry(
      "https://api.alquran.cloud/v1/edition?format=text&type=translation"
    );
    const json = await res.json();

    // The API sometimes returns `data` directly, sometimes nested as `data.editions`
    const raw = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.editions)
      ? json.data.editions
      : [];

    // Normalize and sort (by language code, then translator/name)
    const editions = raw
      .map((e) => {
        const id = String(e?.identifier || "").trim(); // e.g., "en.asad"
        const lang = String(e?.language || "").trim(); // e.g., "en"
        // Prefer englishName, fall back to name
        const display = String(e?.englishName || e?.name || "").trim();
        // Build a clean, informative label
        // Example:  "EN — Asad (en.asad)"
        const label = `${lang.toUpperCase()} — ${display || id} (${id})`;
        return id ? { id, lang, label } : null;
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.lang === b.lang
          ? a.label.localeCompare(b.label)
          : a.lang.localeCompare(b.lang)
      );

    if (!editions.length) {
      throw new Error("No translation editions found.");
    }

    // Fill the <select>
    translationEditionSel.innerHTML = editions
      .map((ed) => `<option value="${ed.id}">${ed.label}</option>`)
      .join("");

    // Choose a sensible default:
    // 1) Keep previously selected (if still present)
    // 2) Prefer a known English edition (sahih, daryabadi, etc.)
    // 3) Otherwise first item
    const current = (
      initialVal ||
      window.translationEdition ||
      ""
    ).trim();
    
    console.log("Current translation setting:", current);

    const prefer = [
      "en.sahih",
      "en.daryabadi",
      "en.asad",
      "en.muhammadtaqiuddinkhan",
      "en.pickthall",
      "en.yusufali",
      "en.maududi",
      "en.mubarakpuri",
    ];
    let toSelect = "";

    if (current && editions.some((e) => e.id === current)) {
      toSelect = current;
      console.log("Restoring current selection:", toSelect);
    } else {
      toSelect =
        prefer.find((p) => editions.some((e) => e.id === p)) ||
        editions.find((e) => e.lang === "en")?.id ||
        editions[0].id;
      console.log("Using preferred/default selection:", toSelect);
    }

    translationEditionSel.value = toSelect;
    if (window.translationEdition !== undefined) {
      window.translationEdition = toSelect; // keep the state in sync
    }
  } catch (err) {
    console.warn("Failed to load translations:", err);

    // Hard fallback to a minimal set so app keeps working
    const fallback = [
      { id: "en.sahih", label: "EN — Saheeh International (en.sahih)" },
      { id: "en.daryabadi", label: "EN — Daryabadi (en.daryabadi)" },
      { id: "en.asad", label: "EN — Asad (en.asad)" },
      { id: "en.yusufali", label: "EN — Yusuf Ali (en.yusufali)" },
    ];
    translationEditionSel.innerHTML = fallback
      .map((f) => `<option value="${f.id}">${f.label}</option>`)
      .join("");
    translationEditionSel.value = "en.sahih";
    if (window.translationEdition !== undefined) {
      window.translationEdition = "en.sahih";
    }
  } finally {
    translationEditionSel.disabled = false;
  }
}

// Export for use in other modules
window.translationsModule = {
  loadTranslations,
};

