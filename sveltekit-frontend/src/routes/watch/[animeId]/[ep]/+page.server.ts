import type { PageServerLoad } from './$types';

// Anime metadata lives in the parent [animeId] layout, so changing only the
// episode does not refetch identical detail data from Oracle/AniList.
export const load: PageServerLoad = ({ params }) => ({
	animeId: params.animeId,
	ep: params.ep
});
