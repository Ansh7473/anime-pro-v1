import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  return { animeId: params.animeId, ep: params.ep };
};
