// 4-layer weighted fuzzy search engine for anime

const ALIASES: Record<string, string[]> = {
	fma: ['fullmetal alchemist', 'brotherhood'],
	fmab: ['fullmetal alchemist: brotherhood'],
	aot: ['attack on titan', 'shingeki no kyojin'],
	jjk: ['jujutsu kaisen'],
	mha: ['my hero academia', 'boku no hero academia'],
	ds: ['demon slayer', 'kimetsu no yaiba'],
	hxh: ['hunter x hunter'],
	op: ['one piece'],
	sao: ['sword art online'],
	tg: ['tokyo ghoul'],
	narto: ['naruto', 'naruto shippuden'],
	titan: ['attack on titan', 'shingeki no kyojin'],
	slime: ['that time i got reincarnated as a slime', 'tensei shitara slime datta ken'],
	opm: ['one punch man'],
	csm: ['chainsaw man'],
	spy: ['spy x family'],
	bc: ['black clover'],
	'dr stone': ['dr. stone'],
	're zero': ['re:zero'],
	konosuba: ['kono subarashii sekai ni shukufuku wo'],
	danmachi: ['is it wrong to try to pick up girls in a dungeon']
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');

/** Expand alias/abbreviation to a better search query for the API */
export function expandAlias(query: string): string {
	const q = query.toLowerCase().trim();
	const mapped = ALIASES[q];
	if (mapped && mapped.length > 0) return mapped[0];
	return query;
}

function titleStrings(anime: any): string[] {
	const t = anime.title;
	if (typeof t === 'string') return [t, ...(anime.synonyms ?? [])].filter(Boolean) as string[];
	const obj = t ?? {};
	return [obj.english, obj.romaji, obj.native, obj.userPreferred, ...(anime.synonyms ?? [])].filter(Boolean) as string[];
}

// --- Layer 1: Alias/Synonym matching (weight 0.35) ---

function aliasScore(query: string, anime: any): number {
	const q = norm(query);
	const titles = titleStrings(anime).map(norm);
	let best = 0;

	// Check alias dictionary
	const expanded = ALIASES[q];
	if (expanded) {
		for (const alias of expanded) {
			const a = norm(alias);
			for (const t of titles) {
				if (t === a || t.includes(a) || a.includes(t)) {
					best = Math.max(best, 1.0);
				}
			}
		}
	}

	// Check first-letter abbreviation (e.g. "aot" → "Attack On Titan")
	for (const t of titles) {
		const initials = t.split(/\s+/).map((w) => w[0]).join('');
		if (initials === q) best = Math.max(best, 0.95);

		// Exact / substring with length ratio
		if (t === q) best = Math.max(best, 1.0);
		else if (t.includes(q)) best = Math.max(best, q.length / t.length);
		else if (q.includes(t)) best = Math.max(best, t.length / q.length);
	}

	return best;
}

// --- Layer 2: Sørensen-Dice trigram overlap (weight 0.25) ---

function trigrams(s: string): Set<string> {
	const n = norm(s).replace(/\s+/g, '');
	const set = new Set<string>();
	for (let i = 0; i <= n.length - 3; i++) set.add(n.slice(i, i + 3));
	return set;
}

function dice(a: Set<string>, b: Set<string>): number {
	if (!a.size || !b.size) return 0;
	let intersection = 0;
	for (const t of a) if (b.has(t)) intersection++;
	return (2 * intersection) / (a.size + b.size);
}

function diceScore(query: string, anime: any): number {
	const qTri = trigrams(query);
	let best = 0;
	for (const t of titleStrings(anime)) {
		best = Math.max(best, dice(qTri, trigrams(t)));
	}
	return best;
}

// --- Layer 3: Levenshtein edit distance (weight 0.20) ---

function levenshtein(a: string, b: string): number {
	const m = a.length, n = b.length;
	if (!m) return n;
	if (!n) return m;
	let prev = Array.from({ length: n + 1 }, (_, i) => i);
	for (let i = 1; i <= m; i++) {
		const curr = [i];
		for (let j = 1; j <= n; j++) {
			curr[j] = a[i - 1] === b[j - 1]
				? prev[j - 1]
				: 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
		}
		prev = curr;
	}
	return prev[n];
}

function levSimilarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	return maxLen ? (maxLen - levenshtein(a, b)) / maxLen : 1;
}

function levScore(query: string, anime: any): number {
	const q = norm(query);
	let best = 0;
	for (const raw of titleStrings(anime)) {
		const t = norm(raw);
		// Full-string similarity
		best = Math.max(best, levSimilarity(q, t));
		// Word-level: for each query word, find best matching target word
		const qWords = q.split(/\s+/);
		const tWords = t.split(/\s+/);
		if (qWords.length && tWords.length) {
			let wordSum = 0;
			for (const qw of qWords) {
				let wordBest = 0;
				for (const tw of tWords) wordBest = Math.max(wordBest, levSimilarity(qw, tw));
				wordSum += wordBest;
			}
			best = Math.max(best, wordSum / qWords.length);
		}
	}
	return best;
}

// --- Layer 4: TF-IDF for description/genres (weight 0.20) ---

function tfidfScore(query: string, anime: any): number {
	const words = norm(query).split(/\s+/).filter(Boolean);
	if (!words.length) return 0;
	const genres = (anime.genres ?? []).map((g: string) => norm(g));
	const desc = norm(stripHtml(anime.description ?? ''));
	let score = 0;

	for (const w of words) {
		// Genre match: high weight
		if (genres.some((g: string) => g.includes(w) || w.includes(g))) {
			score += 2.0;
			continue;
		}
		// Description frequency, capped at 1.5
		if (desc) {
			const regex = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
			const count = (desc.match(regex) ?? []).length;
			if (count > 0) score += Math.min(1.5, 0.5 + count * 0.25);
		}
	}
	return Math.min(1, score / words.length);
}

// --- Fused score ---

export function getFusedScore(query: string, anime: any): number {
	if (!query?.trim()) return 0;
	return (
		0.35 * aliasScore(query, anime) +
		0.25 * diceScore(query, anime) +
		0.20 * levScore(query, anime) +
		0.20 * tfidfScore(query, anime)
	);
}

export function searchAndRankAnime(query: string, animes: any[]): any[] {
	return animes
		.map((a) => ({ ...a, _score: getFusedScore(query, a) }))
		.filter((a) => a._score >= 0.05)
		.sort((a, b) => b._score - a._score);
}
