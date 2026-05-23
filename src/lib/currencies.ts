export interface Currency {
  code: string;
  symbol: string;
  label: string;
  localizedNames?: Record<string, string>;
  symbolPosition: "prefix" | "suffix";
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "ARS", symbol: "AR$", label: "Argentine Peso",    localizedNames: { es: "Peso Argentino",       pt: "Peso Argentino",    fr: "Peso argentin",      de: "Argentinischer Peso",   it: "Peso argentino"       }, symbolPosition: "prefix", decimals: 2 },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar", localizedNames: { es: "Dólar australiano",    pt: "Dólar australiano", fr: "Dollar australien",  de: "Australischer Dollar",  it: "Dollaro australiano"  }, symbolPosition: "prefix", decimals: 2 },
  { code: "BRL", symbol: "R$",  label: "Brazilian Real",    localizedNames: { es: "Real Brasileño",       pt: "Real Brasileiro",   fr: "Réal brésilien",     de: "Brasilianischer Real",  it: "Real brasiliano"      }, symbolPosition: "prefix", decimals: 2 },
  { code: "GBP", symbol: "£",   label: "British Pound",     localizedNames: { es: "Libra esterlina",      pt: "Libra esterlina",   fr: "Livre sterling",     de: "Britisches Pfund",      it: "Sterlina britannica"  }, symbolPosition: "prefix", decimals: 2 },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar",   localizedNames: { es: "Dólar canadiense",     pt: "Dólar canadense",   fr: "Dollar canadien",    de: "Kanadischer Dollar",    it: "Dollaro canadese"     }, symbolPosition: "prefix", decimals: 2 },
  { code: "CLP", symbol: "CL$", label: "Chilean Peso",      localizedNames: { es: "Peso Chileno",         pt: "Peso Chileno",      fr: "Peso chilien",       de: "Chilenischer Peso",     it: "Peso cileno"          }, symbolPosition: "prefix", decimals: 0 },
  { code: "CNY", symbol: "¥",   label: "Chinese Yuan",      localizedNames: { es: "Yuan chino",           pt: "Yuan chinês",       fr: "Yuan chinois",       de: "Chinesischer Yuan",     it: "Yuan cinese"          }, symbolPosition: "prefix", decimals: 2 },
  { code: "COP", symbol: "CO$", label: "Colombian Peso",    localizedNames: { es: "Peso Colombiano",      pt: "Peso Colombiano",   fr: "Peso colombien",     de: "Kolumbianischer Peso",  it: "Peso colombiano"      }, symbolPosition: "prefix", decimals: 0 },
  { code: "DOP", symbol: "RD$", label: "Dominican Peso",    localizedNames: { es: "Peso Dominicano",      pt: "Peso Dominicano",   fr: "Peso dominicain",    de: "Dominikanischer Peso",  it: "Peso dominicano"      }, symbolPosition: "prefix", decimals: 2 },
  { code: "EUR", symbol: "€",   label: "Euro",              localizedNames: { es: "Euro",                 pt: "Euro",              fr: "Euro",               de: "Euro",                  it: "Euro"                 }, symbolPosition: "suffix", decimals: 2 },
  { code: "INR", symbol: "₹",   label: "Indian Rupee",      localizedNames: { es: "Rupia india",          pt: "Rúpia indiana",     fr: "Roupie indienne",    de: "Indische Rupie",        it: "Rupia indiana"        }, symbolPosition: "prefix", decimals: 2 },
  { code: "JPY", symbol: "¥",   label: "Japanese Yen",      localizedNames: { es: "Yen japonés",          pt: "Iene japonês",      fr: "Yen japonais",       de: "Japanischer Yen",       it: "Yen giapponese"       }, symbolPosition: "prefix", decimals: 0 },
  { code: "KRW", symbol: "₩",   label: "Korean Won",        localizedNames: { es: "Won surcoreano",       pt: "Won sul-coreano",   fr: "Won sud-coréen",     de: "Südkoreanischer Won",   it: "Won sudcoreano"       }, symbolPosition: "prefix", decimals: 0 },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso",      localizedNames: { es: "Peso Mexicano",        pt: "Peso Mexicano",     fr: "Peso mexicain",      de: "Mexikanischer Peso",    it: "Peso messicano"       }, symbolPosition: "prefix", decimals: 2 },
  { code: "CHF", symbol: "Fr.", label: "Swiss Franc",       localizedNames: { es: "Franco suizo",         pt: "Franco suíço",      fr: "Franc suisse",       de: "Schweizer Franken",     it: "Franco svizzero"      }, symbolPosition: "prefix", decimals: 2 },
  { code: "USD", symbol: "$",   label: "US Dollar",         localizedNames: { es: "Dólar estadounidense", pt: "Dólar americano",   fr: "Dollar américain",   de: "US-Dollar",             it: "Dollaro statunitense" }, symbolPosition: "prefix", decimals: 2 },
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

export const DEFAULT_CURRENCY = CURRENCIES.find((c) => c.code === "USD")!;
