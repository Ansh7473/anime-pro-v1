const GENRES = [
	'Action','Adventure','Comedy','Drama','Fantasy','Horror','Mecha','Mystery',
	'Romance','Sci-Fi','Slice of Life','Sports','Thriller','Supernatural'
] as const;

/** Convert anime to a 16-dimensional feature vector */
export function getFeatureVector(anime: any): number[] {
	const genres: string[] = anime?.genres ?? [];
	const vec: number[] = GENRES.map(g => genres.includes(g) ? 1 : 0);
	vec.push((anime?.averageScore ?? 70) / 100);
	vec.push(anime?.status === 'RELEASING' ? 1.0 : 0.0);
	return vec;
}

/** Compute user profile as weighted centroid of recently watched anime.
 *  More recent items get higher weight (1/(index+1)).
 */
export function getUserProfileVector(recentlyWatched: any[]): number[] {
	if (!recentlyWatched?.length) return Array(16).fill(0.5);
	let totalWeight = 0;
	const sum = Array(16).fill(0);
	recentlyWatched.forEach((anime, i) => {
		const w = 1 / (i + 1);
		totalWeight += w;
		const fv = getFeatureVector(anime);
		for (let d = 0; d < 16; d++) sum[d] += fv[d] * w;
	});
	return sum.map(v => v / totalWeight);
}

/** Euclidean distance between two vectors */
export function getDistance(v1: number[], v2: number[]): number {
	let sum = 0;
	for (let i = 0; i < v1.length; i++) sum += (v1[i] - v2[i]) ** 2;
	return Math.sqrt(sum);
}

/** Sort anime list by similarity to user's watch profile (closest first).
 *  Returns the reordered array (does not mutate input).
 *  If recentlyWatched is empty, returns the original list unchanged.
 */
export function rankByPreference(animes: any[], recentlyWatched: any[]): any[] {
	if (!recentlyWatched?.length) return animes;
	const profile = getUserProfileVector(recentlyWatched);
	return [...animes]
		.map(a => ({ a, d: getDistance(getFeatureVector(a), profile) }))
		.sort((x, y) => x.d - y.d)
		.map(({ a }) => a);
}
