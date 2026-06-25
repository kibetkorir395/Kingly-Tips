// Conversion rates from KES → currency. Approximate; admin can refine later.
export const CURRENCIES = {
  KES: { symbol: "KSh", rate: 1, label: "Kenyan Shilling" },
  USD: { symbol: "$", rate: 0.0078, label: "US Dollar" },
  EUR: { symbol: "€", rate: 0.0072, label: "Euro" },
  GBP: { symbol: "£", rate: 0.0061, label: "British Pound" },
  NGN: { symbol: "₦", rate: 12.5, label: "Nigerian Naira" },
  GHS: { symbol: "₵", rate: 0.12, label: "Ghanaian Cedi" },
  UGX: { symbol: "USh", rate: 29, label: "Ugandan Shilling" },
  TZS: { symbol: "TSh", rate: 20, label: "Tanzanian Shilling" },
  ZAR: { symbol: "R", rate: 0.14, label: "South African Rand" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// Map ISO country to default currency
export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  KE: "KES", NG: "NGN", GH: "GHS", UG: "UGX", TZ: "TZS", ZA: "ZAR",
  US: "USD", GB: "GBP",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
};

export function convertFromKES(kes: number, to: CurrencyCode): number {
  const rate = CURRENCIES[to].rate;
  const v = kes * rate;
  if (to === "KES" || to === "NGN" || to === "UGX" || to === "TZS") return Math.round(v);
  return Math.round(v * 100) / 100;
}

export function formatPrice(kes: number, code: CurrencyCode): string {
  const { symbol } = CURRENCIES[code];
  const amt = convertFromKES(kes, code);
  return `${symbol} ${amt.toLocaleString()}`;
}

export const CURRENCY_TO_COUNTRY: Record<CurrencyCode, string> = {
  KES: "KE", NGN: "NG", GHS: "GH", UGX: "UG", TZS: "TZ", ZAR: "ZA",
  USD: "US", GBP: "GB", EUR: "EU",
};

export function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code === "EU") return "🇪🇺";
  const offset = 127397;
  return code
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

export async function detectCountry(): Promise<CurrencyCode> {
  try {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!r.ok) return "KES";
    const j = await r.json();
    const cc: string | undefined = j.country_code;
    if (cc && COUNTRY_TO_CURRENCY[cc]) return COUNTRY_TO_CURRENCY[cc];
  } catch {}
  return "KES";
}

export async function detectCountryCode(): Promise<string> {
  try {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!r.ok) return "KE";
    const j = await r.json();
    const cc: string | undefined = j.country_code;
    if (cc) return cc;
  } catch {}
  return "KE";
}
