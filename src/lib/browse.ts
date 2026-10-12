import { FAMILY_DEFAULT_GLASS, isFamilyTag, type FamilyTag, type Glass } from './domain.ts';

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function compareNames(a: string, b: string): number {
	return collator.compare(a, b);
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
