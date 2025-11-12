// ===================================================================
// ===================== RECITERS + DEDUP LOGIC ======================
// ===================================================================

// Complete list (can be extended later)
const RECITERS = [
  "AbdulSamad_64kbps_QuranExplorer.Com",
  "Abdul_Basit_Mujawwad_128kbps",
  "Abdul_Basit_Murattal_192kbps",
  "Abdul_Basit_Murattal_64kbps",
  "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
  "Abdullah_Basfar_192kbps",
  "Abdullah_Basfar_32kbps",
  "Abdullah_Basfar_64kbps",
  "Abdullah_Matroud_128kbps",
  "Abdurrahmaan_As-Sudais_192kbps",
  "Abdurrahmaan_As-Sudais_64kbps",
  "Abu Bakr Ash-Shaatree_128kbps",
  "Abu_Bakr_Ash-Shaatree_128kbps",
  "Abu_Bakr_Ash-Shaatree_64kbps",
  "Ahmed_Neana_128kbps",
  "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net",
  "Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com",
  "Akram_AlAlaqimy_128kbps",
  "Alafasy_128kbps",
  "Alafasy_64kbps",
  "Ali_Hajjaj_AlSuesy_128kbps",
  "Ali_Jaber_64kbps",
  "Ayman_Sowaid_64kbps",
  "Fares_Abbad_64kbps",
  "Ghamadi_40kbps",
  "Hani_Rifai_192kbps",
  "Hani_Rifai_64kbps",
  "Hudhaify_128kbps",
  "Hudhaify_32kbps",
  "Hudhaify_64kbps",
  "Husary_128kbps",
  "Husary_128kbps_Mujawwad",
  "Husary_64kbps",
  "Husary_Muallim_128kbps",
  "Husary_Mujawwad_64kbps",
  "Ibrahim_Akhdar_32kbps",
  "Ibrahim_Akhdar_64kbps",
  "Karim_Mansoori_40kbps",
  "Khaalid_Abdullaah_al-Qahtaanee_192kbps",
  "MaherAlMuaiqly128kbps",
  "Maher_AlMuaiqly_64kbps",
  "Menshawi_16kbps",
  "Menshawi_32kbps",
  "Minshawy_Mujawwad_192kbps",
  "Minshawy_Mujawwad_64kbps",
  "Minshawy_Murattal_128kbps",
  "Minshawy_Teacher_128kbps",
  "Mohammad_al_Tablaway_128kbps",
  "Mohammad_al_Tablaway_64kbps",
  "Muhammad_AbdulKareem_128kbps",
  "Muhammad_Ayyoub_128kbps",
  "Muhammad_Ayyoub_32kbps",
  "Muhammad_Ayyoub_64kbps",
  "Muhammad_Jibreel_128kbps",
  "Muhammad_Jibreel_64kbps",
  "Muhsin_Al_Qasim_192kbps",
  "Mustafa_Ismail_48kbps",
  "Nabil_Rifa3i_48kbps",
  "Nasser_Alqatami_128kbps",
  "Parhizgar_48kbps",
  "Sahl_Yassin_128kbps",
  "Salaah_AbdulRahman_Bukhatir_128kbps",
  "Salah_Al_Budair_128kbps",
  "Saood bin Ibraaheem Ash-Shuraym_128kbps",
  "Saood_ash-Shuraym_128kbps",
  "Saood_ash-Shuraym_64kbps",
  "Yaser_Salamah_128kbps",
  "Yasser_Ad-Dussary_128kbps",
  "ahmed_ibn_ali_al_ajamy_128kbps",
  "aziz_alili_128kbps",
  "khalefa_al_tunaiji_64kbps",
  "mahmoud_ali_al_banna_32kbps",
];

// ---------- Reciter helpers: bitrate + normalization (FULL) ----------
function parseBitrate(reciterId) {
  // Finds "...128kbps" even without underscores (e.g., "MaherAlMuaiqly128kbps")
  const m = String(reciterId)
    .toLowerCase()
    .match(/(\d+)\s*kbps/);
  return m ? Number(m[1]) : 0;
}

function stripHostSuffix(str) {
  // Remove known host/source suffixes that don't define identity
  return String(str)
    .replace(/_?QuranExplorer\.Com$/i, "")
    .replace(/_?ketaballah\.net$/i, "");
}

function canonicalBase(reciterId) {
  // 1) Remove host/source suffixes
  let base = stripHostSuffix(reciterId);

  // 2) Remove the bitrate token (`_128kbps`, `64kbps`, etc.) while keeping style words
  base = base.replace(/_?\d+\s*kbps/gi, "");

  // 3) Normalize underscores/spaces; trim any trailing separators
  base = base
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .replace(/_+$/g, "")
    .trim();

  // Lower-case for grouping key (labeling handled separately)
  return base.toLowerCase();
}

function humanizeReciterId(reciterId) {
  // Make a readable label; drop hosts; keep style words (Mujawwad, Murattal, Teacher, etc.)
  let label = stripHostSuffix(reciterId);

  // Remove bitrate token from label text for a cleaner display
  label = label.replace(/_?\d+\s*kbps/gi, "");

  // Beautify
  label = label.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  // Basic capitalization fixes for common tokens
  label = label
    .replace(/\bkbps\b/gi, "kbps")
    .replace(/\bMurattal\b/gi, "Murattal")
    .replace(/\bMujawwad\b/gi, "Mujawwad")
    .replace(/\bTeacher\b/gi, "Teacher");

  return label;
}

function pickHighestBitrateReciters(reciters) {
  // Group by canonical base (same name/style), keep highest bitrate
  const byBase = new Map();

  for (const rid of reciters) {
    const base = canonicalBase(rid);
    const br = parseBitrate(rid);

    const prev = byBase.get(base);
    if (!prev) {
      byBase.set(base, { id: rid, bitrate: br });
      continue;
    }

    // Prefer the entry with higher bitrate; if tie, prefer the one without host suffix
    if (br > prev.bitrate) {
      byBase.set(base, { id: rid, bitrate: br });
    } else if (br === prev.bitrate) {
      const prevHasHost = /_?(QuranExplorer\.Com|ketaballah\.net)$/i.test(
        prev.id
      );
      const curHasHost = /_?(QuranExplorer\.Com|ketaballah\.net)$/i.test(rid);
      if (prevHasHost && !curHasHost) {
        byBase.set(base, { id: rid, bitrate: br });
      }
    }
  }

  // Return the winning reciter IDs, sorted by readable label
  const winners = Array.from(byBase.values()).map((v) => v.id);
  winners.sort((a, b) =>
    humanizeReciterId(a).localeCompare(humanizeReciterId(b))
  );
  return winners;
}

// ---------- Reciter loader (FULL) ----------
function loadReciters() {
  const reciterSel = $("#reciter");
  if (!reciterSel) return;

  // Deduplicate by highest bitrate per reciter/style
  const DEDUPED = pickHighestBitrateReciters(RECITERS);

  const html = DEDUPED.map((rid) => {
    const label = humanizeReciterId(rid);
    return `<option value="${rid}">${label}</option>`;
  }).join("");

  reciterSel.innerHTML = html;

  // Choose a sensible default (try these in order)
  const preferredOrder = [
    "Alafasy_128kbps",
    "Abdurrahmaan_As-Sudais_192kbps",
    "Maher_AlMuaiqly_64kbps",
    "MaherAlMuaiqly128kbps",
  ];
  const preferred = preferredOrder.find((p) => DEDUPED.includes(p));

  reciterSel.value = preferred || DEDUPED[0];

  // Keep session reciter name aligned for filenames, etc.
  const opt = reciterSel.options[reciterSel.selectedIndex];
  if (window.sessionReciterName !== undefined) {
    window.sessionReciterName = opt ? opt.text : humanizeReciterId(reciterSel.value);
  }
}

// Export for use in other modules
window.recitersModule = {
  loadReciters,
};

