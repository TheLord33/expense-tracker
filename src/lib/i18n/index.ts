import en from "./en";
import es from "./es";
import pt from "./pt";
import fr from "./fr";

export type Language = "en" | "es" | "pt" | "fr";

export const LANGUAGES: { value: Language; label: string; flag: string; locale: string }[] = [
  { value: "en", label: "English",    flag: "🇺🇸", locale: "en-US" },
  { value: "es", label: "Español",    flag: "🇪🇸", locale: "es-ES" },
  { value: "pt", label: "Português",  flag: "🇧🇷", locale: "pt-BR" },
  { value: "fr", label: "Français",   flag: "🇫🇷", locale: "fr-FR" },
];

export const TRANSLATIONS = { en, es, pt, fr };

type Variables = Record<string, string | number>;

export function translate(
  language: Language,
  key: string,
  vars?: Variables
): string {
  const dict = TRANSLATIONS[language] as Record<string, unknown>;
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = dict;
  for (const part of parts) val = val?.[part];

  if (typeof val !== "string") {
    // Fall back to English
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = en;
    for (const part of parts) fallback = fallback?.[part];
    val = typeof fallback === "string" ? fallback : key;
  }

  if (!vars) return val as string;
  return (val as string).replace(
    /\{(\w+)\}/g,
    (_, k: string) => String(vars[k] ?? `{${k}}`)
  );
}
