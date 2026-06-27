// Conversion rates from KES → currency. Approximate; admin can refine later.
export const CURRENCIES = {
  KES: { rate: 1, symbol: "KSh" },
  USD: { rate: 0.0075, symbol: "$" },
  EUR: { rate: 0.007, symbol: "€" },
  GBP: { rate: 0.006, symbol: "£" },
  NGN: { rate: 11.5, symbol: "₦" },
  GHS: { rate: 0.08, symbol: "₵" },
  UGX: { rate: 28, symbol: "USh" },
  TZS: { rate: 20, symbol: "TSh" },
  ZAR: { rate: 0.14, symbol: "R" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

// Map ISO country to default currency
export const COUNTRY_TO_CURRENCY = {
  KE: "KES", NG: "NGN", GH: "GHS", UG: "UGX", TZ: "TZS", ZA: "ZAR",
  US: "USD", GB: "GBP",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
};

export function convertFromKES(kes, to) {
  const rate = CURRENCIES[to]?.rate;
  if (!rate) return kes;
  const v = kes * rate;
  if (to === "KES" || to === "NGN" || to === "UGX" || to === "TZS") return Math.round(v);
  return Math.round(v * 100) / 100;
}

export function formatPrice(kes, code) {
  const symbol = CURRENCIES[code]?.symbol || "KSh";
  const amt = convertFromKES(kes, code);
  return `${symbol} ${amt.toLocaleString()}`;
}

export const CURRENCY_TO_COUNTRY = {
  KES: "KE", NGN: "NG", GHS: "GH", UGX: "UG", TZS: "TZ", ZAR: "ZA",
  USD: "US", GBP: "GB", EUR: "DE",
};

export function getFlagEmoji(countryCode) {
  const code = countryCode.toUpperCase();
  if (code === "EU") return "🇪🇺";
  const offset = 127397;
  return code
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

export async function detectCountry() {
  try {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!r.ok) return "KES";
    const j = await r.json();
    const cc = j.country_code;
    if (cc && COUNTRY_TO_CURRENCY[cc]) return COUNTRY_TO_CURRENCY[cc];
  } catch {}
  return "KES";
}

export async function detectCountryCode() {
  try {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!r.ok) return "KE";
    const j = await r.json();
    const cc = j.country_code;
    if (cc) return cc;
  } catch {}
  return "KE";
}
