// ------------------ Utils ------------------
const $ = (s) => document.querySelector(s);
const pad3 = (n) => String(Number(n) || 0).padStart(3, "0");
const safe = (s) => (s || "").replace(/[^\w-]+/g, "_");
const timestampStr = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(
    d.getHours()
  )}${z(d.getMinutes())}${z(d.getSeconds())}`;
};

async function fetchRetry(url, opts = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", ...opts });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

