import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  return { category: params.category };
};
