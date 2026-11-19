export const WELCOME_HIDDEN_DATE_KEY = 'welcomeHiddenDate';
export const WELCOME_DURATION_MS = 5000;

export function safeWelcomeTarget(value?: string | string[]): string {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith('/') || target.startsWith('//') || /^\/interstitial(?:[/?#]|$)/.test(target)) return '/(tabs)';
  return target;
}

/** Preserve browser, Expo development and custom-scheme deep links. */
export function resolveWelcomeTarget(initialUrl: string | null, fallback = '/(tabs)'): string {
  if (!initialUrl) return safeWelcomeTarget(fallback);
  if (initialUrl.startsWith('/')) return safeWelcomeTarget(initialUrl);
  try {
    const url = new URL(initialUrl);
    const customScheme = !['http:', 'https:', 'exp:', 'exps:'].includes(url.protocol);
    const path = (customScheme ? '/' + url.hostname : '') + url.pathname;
    return safeWelcomeTarget(path.replace(/^\/--(?=\/|$)/, '') + url.search);
  } catch {
    return safeWelcomeTarget(fallback);
  }
}
