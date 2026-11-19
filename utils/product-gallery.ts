type ProductMedia = {
  preview?: unknown;
  original_url?: unknown;
  thumb?: unknown;
  custom_properties?: { product_attribute_option_id?: unknown } | null;
};

function mediaItems(value: unknown): ProductMedia[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function imageUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function productGalleryImages(product: { image?: unknown; images?: unknown; images_meta?: unknown }): string[] {
  const images = [product.image, ...(Array.isArray(product.images) ? product.images : []),
    ...mediaItems(product.images_meta).map(media => imageUrl(media.preview) || imageUrl(media.original_url) || imageUrl(media.thumb))];
  return [...new Set(images.map(imageUrl).filter((url): url is string => !!url))];
}

/** Use the same explicit option-to-media mapping as the storefront. Never guess by color name. */
export function variationImageIndex(optionId: unknown, metadata: unknown, images: string[]): number {
  const id = Number(optionId);
  if (!Number.isInteger(id) || id <= 0) return -1;
  for (const media of mediaItems(metadata)) {
    if (Number(media.custom_properties?.product_attribute_option_id) !== id) continue;
    for (const candidate of [media.preview, media.original_url, media.thumb]) {
      const url = imageUrl(candidate);
      const index = url ? images.indexOf(url) : -1;
      if (index >= 0) return index;
    }
  }
  return -1;
}
