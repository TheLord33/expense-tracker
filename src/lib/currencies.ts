export interface Currency {
  code: string;
  symbol: string;
  label: string;
  symbolPosition: "prefix" | "suffix";
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",   label: "US Dollar",         symbolPosition: "prefix", decimals: 2 },
  { code: "EUR", symbol: "€",   label: "Euro",              symbolPosition: "suffix", decimals: 2 },
  { code: "GBP", symbol: "£",   label: "British Pound",     symbolPosition: "prefix", decimals: 2 },
  { code: "BRL", symbol: "R$",  label: "Real Brasileiro",   symbolPosition: "prefix", decimals: 2 },
  { code: "MXN", symbol: "MX$", label: "Peso Mexicano",     symbolPosition: "prefix", decimals: 2 },
  { code: "ARS", symbol: "AR$", label: "Peso Argentino",    symbolPosition: "prefix", decimals: 2 },
  { code: "COP", symbol: "CO$", label: "Peso Colombiano",   symbolPosition: "prefix", decimals: 0 },
  { code: "CLP", symbol: "CL$", label: "Peso Chileno",      symbolPosition: "prefix", decimals: 0 },
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
