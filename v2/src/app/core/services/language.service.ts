import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Languages the dashboards ship translations for. This is intentionally a
 * subset of activity-tracker's list; grow it as locale catalogs are added
 * under src/assets/i18n. Keeping the same shape as the tracker's
 * LanguageService means Phase C can swap this for the DB-backed version with
 * no change to callers.
 */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ko' | 'zh';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

const STORAGE_KEY = 'era8_lang';

/**
 * Manages the active UI language.
 *
 * Phase A persists the choice to localStorage (shared key with 1.0 so the
 * language carries across the beta cutover). Priority on init:
 *   stored preference → browser language → English.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly availableLanguages: LanguageInfo[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  readonly currentLanguage = signal<SupportedLanguage>('en');

  /** Resolve and apply the initial language. Call once at app start. */
  initialize(): void {
    this.translate.addLangs(this.availableLanguages.map(l => l.code));

    const stored = this.readStored();
    if (stored) {
      this.setLanguage(stored);
      return;
    }

    const browser = this.translate.getBrowserLang();
    if (browser && this.isSupported(browser)) {
      this.setLanguage(browser);
      return;
    }

    this.setLanguage('en');
  }

  /** Switch the active language and persist the choice. */
  setLanguage(language: string): void {
    const lang: SupportedLanguage = this.isSupported(language) ? language : 'en';
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.writeStored(lang);
  }

  getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
    return this.availableLanguages.find(l => l.code === code);
  }

  private isSupported(language: string): language is SupportedLanguage {
    return this.availableLanguages.some(l => l.code === language);
  }

  private readStored(): SupportedLanguage | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v && this.isSupported(v) ? v : null;
    } catch {
      return null;
    }
  }

  private writeStored(lang: SupportedLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable (private mode) — non-fatal */
    }
  }
}
