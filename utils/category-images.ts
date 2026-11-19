export type CategoryWithImages = {
  thumb?: string | null;
  cover?: string | null;
  image?: string | null;
  children?: CategoryWithImages[];
};

export function categoryImageSources(category: CategoryWithImages, parentSources: string[] = []): string[] {
  const own = [category.thumb, category.cover, category.image].filter((source): source is string =>
    typeof source === 'string' && !!source.trim() &&
    !/\/images\/default\/category\/(?:thumb|cover)\.png(?:[?#].*)?$/.test(source.trim())
  ).map(source => source.trim());
  return [...new Set([...own, ...parentSources])];
}

/** Carry the nearest parent's image through every depth of the flattened category tree. */
export function categoryDescendants<T extends CategoryWithImages>(category: T, ancestors: string[] = []): (T & { imageSources: string[] })[] {
  const parentSources = categoryImageSources(category, ancestors);
  return (category.children ?? []).flatMap(child => {
    const typedChild = child as T;
    const imageSources = categoryImageSources(typedChild, parentSources);
    return [{ ...typedChild, imageSources }, ...categoryDescendants(typedChild, parentSources)];
  });
}
