import { FAMILY_DEFAULT_GLASS, isFamilyTag, type FamilyTag, type Glass } from './domain.ts';

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function sortForBrowsing<T extends { name: string; favorite: boolean }>(recipes: readonly T[]): T[] {
	return [...recipes].sort(
		(a, b) => Number(b.favorite) - Number(a.favorite) || collator.compare(a.name, b.name)
	);
}

export function familyOf(tags: readonly string[]): FamilyTag | null {
	return tags.find(isFamilyTag) ?? null;
}

export function placeholderGlass(glass: Glass | null, family: FamilyTag | null): Glass {
	return glass ?? (family ? FAMILY_DEFAULT_GLASS[family] : 'coupe');
}

export function cardSubtitle(spirits: readonly string[], family: FamilyTag | null): string {
	return [spirits.join(', '), family].filter(Boolean).join(' · ');
}
