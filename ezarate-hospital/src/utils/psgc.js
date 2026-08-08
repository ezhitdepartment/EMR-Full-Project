// Live Philippine Standard Geographic Code (PSGC) data — every region,
// province, city/municipality, and barangay — served by the public PSGC
// Cloud API (https://psgc.cloud), which republishes the Philippine
// Statistics Authority's official PSGC dataset.
//
// We fetch this live instead of bundling it, because the full dataset is
// ~40,000+ barangays — too large to hand-embed reliably, and it would go
// stale the next time PSA republishes.
//
// v2's nested endpoints (regions/{code}/provinces, provinces/{code}/
// cities-municipalities, ...) validate ancestry server-side — a city that
// doesn't actually belong to the given province simply isn't returned
// (mismatches 404). That guarantees the City dropdown only ever shows
// cities inside the chosen Province/Region.
const V1 = "https://psgc.cloud/api";
const V2 = "https://psgc.cloud/api/v2";

// Small in-memory cache (cleared on page reload) so switching between
// patients, or re-opening the create/EMR modal, doesn't re-fetch the same
// region/province/city more than once in a session.
const cache = new Map();

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PSGC request failed (${res.status})`);
  }
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.data || [];
  cache.set(url, list);
  return list;
}

// --- Name repair -----------------------------------------------------
//
// Some entries in the upstream dataset come back with garbled names for
// places that contain accented characters (e.g. "Las Piñas" showing up
// mangled) — classic "mojibake" from UTF-8 bytes being decoded as
// Latin-1 somewhere in the data pipeline before it reached us. This
// repairs that automatically wherever it happens, instead of only
// patching the one place we noticed it.
//
// It's intentionally conservative: it only touches strings that contain
// the tell-tale "Ã"/"Â" markers left behind by that specific mistake, and
// backs out immediately (via `fatal: true`) if reversing it would produce
// invalid UTF-8 — so a name that was never broken is never touched.
function fixMojibake(str) {
  if (!str) return str;
  let result = str;
  for (let i = 0; i < 2; i++) {
    if (!/[ÃÂ]/.test(result)) break;
    try {
      const bytes = Uint8Array.from(result, (c) => c.charCodeAt(0));
      const fixed = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (fixed && fixed !== result) {
        result = fixed;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return result;
}

function fixNames(list) {
  return list.map((item) => (item?.name ? { ...item, name: fixMojibake(item.name) } : item));
}

function sortByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

function clean(list) {
  return sortByName(fixNames(list));
}

export async function fetchRegions() {
  return clean(await getJSON(`${V2}/regions`));
}

export async function fetchProvinces(regionCode) {
  // NCR's 4 districts come back here as regular "provinces" — no special
  // casing needed. Ancestry-validated: only provinces that actually belong
  // to this region are returned.
  return clean(await getJSON(`${V2}/regions/${encodeURIComponent(regionCode)}/provinces`));
}

export async function fetchCitiesMunicipalities(provinceCode) {
  return clean(await getJSON(`${V2}/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`));
}

// Some regions (NCR being the main one) have no "provinces" in this API at
// all — cities/municipalities sit directly under the region. Used as a
// fallback once fetchProvinces() comes back empty for a region.
export async function fetchCitiesByRegion(regionCode) {
  return clean(await getJSON(`${V2}/regions/${encodeURIComponent(regionCode)}/cities-municipalities`));
}

export async function fetchBarangays(cityCode) {
  return clean(await getJSON(`${V1}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays?per_page=1000`));
}

// --- Zip code lookup ---------------------------------------------------
//
// v2 doesn't expose zip codes. v1 does, via a single combined
// /cities-municipalities/{code_or_name} endpoint (confirmed in PSGC
// Cloud's own docs) — we look up by NAME rather than code, since v1 and
// v2 don't reliably share the same code for the same place, which is what
// caused zip auto-fill to only work for some cities and silently fail for
// most others.
//
// A handful of well-known places with accented names (mostly Metro Manila,
// where this hospital actually is) are hardcoded below as a verified
// safety net, so they resolve correctly even if the upstream API's own
// data for that specific record is still off. Every other city/municipality
// in the country still resolves live from the API — hardcoding all ~1,600
// of them isn't practical or reliably verifiable by hand.
const ZIP_OVERRIDES = {
  manila: "1000",
  "quezon city": "1100",
  caloocan: "1400",
  "las piñas": "1740",
  "las pinas": "1740",
  makati: "1200",
  malabon: "1470",
  mandaluyong: "1550",
  marikina: "1800",
  muntinlupa: "1770",
  navotas: "1485",
  "parañaque": "1700",
  paranaque: "1700",
  pasay: "1300",
  pasig: "1600",
  pateros: "1620",
  "san juan": "1500",
  taguig: "1630",
  valenzuela: "1440",
  "dasmariñas": "4114",
  dasmarinas: "4114",
  "los baños": "4030",
  "los banos": "4030",
  "muñoz": "3119",
  munoz: "3119",
  "science city of muñoz": "3119",
  "science city of munoz": "3119",
};

function normalizeCityKey(name) {
  return fixMojibake(name || "")
    .toLowerCase()
    .replace(/^city of /, "")
    .replace(/ city$/, "")
    .trim();
}

export async function fetchCityZip(cityName) {
  const key = normalizeCityKey(cityName);
  if (ZIP_OVERRIDES[key]) return ZIP_OVERRIDES[key];

  if (!cityName) return "";
  try {
    const res = await fetch(`${V1}/cities-municipalities/${encodeURIComponent(fixMojibake(cityName))}`);
    if (!res.ok) return "";
    const body = await res.json();
    return body?.zip_code || "";
  } catch {
    return "";
  }
}
