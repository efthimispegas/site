import { insightCategories } from './insights-content.js';

/** Keep shared links recoverable without trusting arbitrary category/sort values. */
export function readInsightListState(input) {
  const url = new URL(input);
  const requestedCategory = url.searchParams.get('category');
  const requestedSort = url.searchParams.get('sort');
  const validCategory = insightCategories.some(
    ([id]) => id === requestedCategory,
  );
  const invalidCategory = requestedCategory !== null && !validCategory;
  const category = validCategory ? requestedCategory : 'all';
  const sort = requestedSort === 'oldest' ? 'oldest' : 'newest';
  if (category === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', category);
  if (sort === 'newest') url.searchParams.delete('sort');
  else url.searchParams.set('sort', sort);
  return { category, sort, invalidCategory, url };
}

export function articleCountLabel(count, language) {
  const singular = new Intl.PluralRules(language).select(count) === 'one';
  return language === 'el'
    ? `${count} ${singular ? 'άρθρο' : 'άρθρα'}`
    : `${count} ${singular ? 'article' : 'articles'}`;
}
