export interface Currency {
  code: string;
  symbol: string;
  label: string;
  localizedNames?: Record<string, string>;
  symbolPosition: "prefix" | "suffix";
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",   label: "US Dollar",         symbolPosition: "prefix", decimals: 2 },
  { code: "EUR", symbol: "€",   label: "Euro",              symbolPosition: "suffix", decimals: 2 },
  { code: "GBP", symbol: "£",   label: "British Pound",     symbolPosition: "prefix", decimals: 2 },
  { code: "BRL", symbol: "R$",  label: "Brazilian Real",    localizedNames: { es: "Real Brasileño",   pt: "Real Brasileiro",   fr: "Réal brésilien",      de: "Brasilianischer Real",    it: "Real brasiliano"    }, symbolPosition: "prefix", decimals: 2 },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso",      localizedNames: { es: "Peso Mexicano",   pt: "Peso Mexicano",     fr: "Peso mexicain",       de: "Mexikanischer Peso",      it: "Peso messicano"     }, symbolPosition: "prefix", decimals: 2 },
  { code: "ARS", symbol: "AR$", label: "Argentine Peso",    localizedNames: { es: "Peso Argentino",  pt: "Peso Argentino",    fr: "Peso argentin",       de: "Argentinischer Peso",     it: "Peso argentino"     }, symbolPosition: "prefix", decimals: 2 },
  { code: "COP", symbol: "CO$", label: "Colombian Peso",    localizedNames: { es: "Peso Colombiano", pt: "Peso Colombiano",   fr: "Peso colombien",      de: "Kolumbianischer Peso",    it: "Peso colombiano"    }, symbolPosition: "prefix", decimals: 0 },
  { code: "CLP", symbol: "CL$", label: "Chilean Peso",      localizedNames: { es: "Peso Chileno",    pt: "Peso Chileno",      fr: "Peso chilien",        de: "Chilenischer Peso",       it: "Peso cileno"        }, symbolPosition: "prefix", decimals: 0 },
  { code: "DOP", symbol: "RD$", label: "Dominican Peso",    localizedNames: { es: "Peso Dominicano", pt: "Peso Dominicano", fr: "Peso dominicain", de: "Dominikanischer Peso", it: "Peso dominicano" }, symbolPosition: "prefix", decimals: 2 },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar",   symbolPosition: "prefix", decimals: 2 },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar", symbolPosition: "prefix", decimals: 2 },
  { code: "CHF", symbol: "Fr.", label: "Swiss Franc",       symbolPosition: "prefix", decimals: 2 },
  { code: "JPY", symbol: "¥",   label: "Japanese Yen",      symbolPosition: "prefix", decimals: 0 },
  { code: "CNY", symbol: "¥",   label: "Chinese Yuan",      symbolPosition: "prefix", decimals: 2 },
  { code: "KRW", symbol: "₩",   label: "Korean Won",        symbolPosition: "prefix", decimals: 0 },
  { code: "INR", symbol: "₹",   label: "Indian Rupee",      symbolPosition: "prefix", decimals: 2 },
];

export function formatAmount(amount: number, currency: Currency): string {
  const n = amount.toFixed(currency.decimals);
  return currency.symbolPosition === "prefix"
    ? `${currency.symbol}${n}`
    : `${n} ${currency.symbol}`;
}

export function formatAmountCompact(amount: number, currency: Currency): string {
  if (Math.abs(amount) >= 1000) {
    const n = (amount / 1000).toFixed(1);
    return currency.symbolPosition === "prefix"
      ? `${currency.symbol}${n}k`
      : `${n}k ${currency.symbol}`;
  }
  return formatAmount(amount, currency);
}

export const DEFAULT_CURRENCY = CURRENCIES[0]; // USD
