// ------------------ Metadata ------------------
let meta = { surahs: [] };

async function loadMeta() {
  try {
    const m = await (
      await fetchRetry("https://api.alquran.cloud/v1/meta")
    ).json();
    const e = await (
      await fetchRetry("https://api.quran.com/api/v4/chapters")
    ).json();
    const chapters = Array.isArray(e?.chapters) ? e.chapters : [];
    const engById = new Map(chapters.map((c) => [c.id, c]));
    const refs = m?.data?.surahs?.references || [];
    meta.surahs = refs.map((s) => ({
      number: s.number,
      nameAr: s.name,
      englishName:
        engById.get(s.number)?.name_simple || s.englishName || s.name,
      ayahCount: s.numberOfAyahs,
    }));
    if (!meta.surahs.length) throw new Error("Surah metadata missing");

    const surahSel = $("#surah");
    if (surahSel) {
      surahSel.innerHTML = meta.surahs
        .map(
          (s) =>
            `<option value="${s.number}">${s.number}. ${s.englishName} (${s.nameAr})</option>`
        )
        .join("");
    }
    updateAyahRange();
  } catch (err) {
    console.error(err);
  }
}

function updateAyahRange() {
  const surahSel = $("#surah");
  const ayahStartSel = $("#ayahStart");
  const ayahEndSel = $("#ayahEnd");
  if (!surahSel || !ayahStartSel || !ayahEndSel) return;
  const sNum = +surahSel.value || 1;
  const s = meta.surahs.find((x) => x.number === sNum) || meta.surahs[0];
  if (!s) return;
  const opts = Array.from(
    { length: s.ayahCount },
    (_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`
  ).join("");
  ayahStartSel.innerHTML = opts;
  ayahEndSel.innerHTML = opts;
  ayahStartSel.value = "1";
  ayahEndSel.value = String(Math.min(5, s.ayahCount));
  if (window.sessionSurahName !== undefined) {
    window.sessionSurahName = s.englishName;
  }

  const handler = () => {
    if (+ayahEndSel.value < +ayahStartSel.value)
      ayahEndSel.value = ayahStartSel.value;
    if (window.updatePictureSaveCount) {
      window.updatePictureSaveCount();
    }
  };
  ayahStartSel.addEventListener("change", handler, { once: true });
  if (window.onAnyInputChange) {
    window.onAnyInputChange();
  }
  // Update picture count on initial load
  if (window.updatePictureSaveCount) {
    window.updatePictureSaveCount();
  }
}

// Export for use in other modules
window.metadataModule = {
  meta,
  loadMeta,
  updateAyahRange,
};

