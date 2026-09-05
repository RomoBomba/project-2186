export const supportedLocales = ['ru', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];

// Development-shell default only; product language selection is deferred.
export const defaultLocale: Locale = 'en';
