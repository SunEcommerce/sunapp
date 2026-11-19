import { Image, type ImageRef } from 'expo-image';
import { Platform } from 'react-native';

export const WELCOME_IMAGE_TIMEOUT_MS = 1000;
export type WelcomeArtworkSource = number | { uri: string; width?: number; height?: number } | { url: string };
// Metro exports bundled assets as a URI object on web and a resource ID on native.
export const DEFAULT_WELCOME_ARTWORK: WelcomeArtworkSource = require('@/assets/images/welcome-tech.png');

/** Future API callers can warm the next launch without changing this launch. */
export async function cacheWelcomeArtwork(url: string): Promise<boolean> {
  try { return await Image.prefetch(url, 'disk'); } catch { return false; }
}

/** Remote sources may resolve ONLY from an existing local cache, never the URL. */
export async function prepareWelcomeArtwork(source: WelcomeArtworkSource = DEFAULT_WELCOME_ARTWORK): Promise<ImageRef | null> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  const load = async (): Promise<ImageRef | null> => {
    try {
      let local: number | { uri: string } = 'object' === typeof source && 'url' in source ? 0 : source;
      if (typeof source === 'object' && 'url' in source) {
        // expo-image's disk-path API is native-only. Web skips uncached remote artwork.
        const path = Platform.OS === 'web' ? null : await Image.getCachePathAsync(source.url);
        if (expired) return null;
        if (!path) { void cacheWelcomeArtwork(source.url); return null; }
        local = { uri: path.startsWith('/') ? `file://${path}` : path };
      }
      if (expired) return null;
      const image = await Image.loadAsync(local);
      if (expired || !image.width || !image.height) { image.release(); return null; }
      return image;
    } catch { return null; }
  };
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => { expired = true; resolve(null); }, WELCOME_IMAGE_TIMEOUT_MS);
  });
  try { return await Promise.race([load(), timeout]); }
  finally { clearTimeout(timer!); }
}
