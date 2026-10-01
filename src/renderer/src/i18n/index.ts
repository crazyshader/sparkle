import i18n from "i18next"
import type { InitOptions } from "i18next"
import { initReactI18next } from "react-i18next"
import zhCN from "./locales/zh-CN.json"

/** localStorage key for the user's language preference. */
export const LANGUAGE_STORAGE_KEY = "sparkle:language"

/** The value stored in localStorage: "auto" or a concrete language. */
export type LanguageChoice = "auto" | "en" | "zh-CN"

/** Concrete languages the app can display in. */
export type ResolvedLanguage = "en" | "zh-CN"

/** Map the OS region (e.g. from navigator.language) to a supported language. */
export function resolveSystemLanguage(): ResolvedLanguage {
  const lang = (navigator.language || "en").toLowerCase()
  return lang.startsWith("zh") ? "zh-CN" : "en"
}

/**
 * Resolve the language to display: the user's stored preference wins;
 * "auto" (or no preference) follows the OS region.
 */
export function resolveLanguage(): ResolvedLanguage {
  let choice: LanguageChoice = "auto"
  try {
    choice = (localStorage.getItem(LANGUAGE_STORAGE_KEY) || "auto") as LanguageChoice
  } catch {
    choice = "auto"
  }
  if (choice !== "en" && choice !== "zh-CN") {
    choice = "auto"
  }
  if (choice === "auto") return resolveSystemLanguage()
  return choice
}

/**
 * Apply the resolved language to the UI and tell the main process so the
 * tray menu can follow. Safe to call on startup and after every change.
 */
export async function applyLanguage(): Promise<ResolvedLanguage> {
  const resolved = resolveLanguage()
  if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved)
  }
  try {
    const { invoke } = await import("@/lib/electron")
    await invoke({ channel: "locale:set", payload: resolved })
  } catch {
    // Non-electron environment (e.g. tests): nothing to notify.
  }
  return resolved
}

// Initialize with the resolved language up front so the very first render
// is already in the right language (resources are bundled, no async load).
// i18next 26's InitOptions type omits the runtime `warn` flag, so extend it.
type InitOptionsWithWarn = InitOptions & { warn?: { missingKey?: boolean } }

const initOptions: InitOptionsWithWarn = {
  resources: { "zh-CN": { translation: zhCN } },
  lng: resolveLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "zh-CN"],
  // Keys ARE the English strings; no path-style key separation.
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  // Missing keys simply render the English key itself - keep the console quiet.
  warn: { missingKey: false },
  interpolation: { escapeValue: false },
}

i18n.use(initReactI18next).init(initOptions)

export default i18n
