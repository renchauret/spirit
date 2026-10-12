export type IngredientOption = { id: number; name: string; parent: string | null };

function foldName(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchIngredients(
	catalog: readonly IngredientOption[],
	typed: string,
	limit = 8
): IngredientOption[] {
	const query = foldName(typed);
	const rank = (name: string) => {
		const folded = foldName(name);
		if (folded === query) return 0;
		if (folded.startsWith(query)) return 1;
		return folded.includes(query) ? 2 : 3;
	};
	return catalog
		.map((option) => ({ option, rank: rank(option.name) }))
		.filter((match) => match.rank < 3)
		.sort((a, b) => a.rank - b.rank)
		.slice(0, limit)
		.map((match) => match.option);
}
