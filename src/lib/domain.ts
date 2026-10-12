export const UNITS = [
	'oz',
	'ml',
	'cl',
	'cup',
	'tbsp',
	'tsp',
	'barspoon',
	'dash',
	'drop',
	'slice',
	'wedge',
	'leaf',
	'sprig',
	'whole',
	'top',
	'rinse',
	'to taste'
] as const;
export type Unit = (typeof UNITS)[number];

export const UNITS_WITHOUT_AMOUNT: readonly Unit[] = ['top', 'rinse', 'to taste'];

export const GLASSES = ['coupe', 'cocktail', 'rocks', 'collins', 'highball', 'flute', 'hurricane'] as const;
export type Glass = (typeof GLASSES)[number];

export const GLASS_LABELS: Record<Glass, string> = {
	coupe: 'coupe',
	cocktail: 'cocktail',
	rocks: 'rocks',
	collins: 'Collins',
	highball: 'highball',
	flute: 'flute',
	hurricane: 'hurricane'
};

export const INGREDIENT_TYPES = [
	'spirit',
	'liqueur',
	'fortified wine',
	'wine',
	'bitters',
	'syrup',
	'juice',
	'mixer',
	'fresh',
	'dairy & egg',
	'pantry'
] as const;
export type IngredientType = (typeof INGREDIENT_TYPES)[number];

export const FAMILY_TAGS = ['sour', 'daisy', 'highball', 'old fashioned', 'martini', 'flip', 'tiki', 'sparkling'] as const;
export type FamilyTag = (typeof FAMILY_TAGS)[number];

export const FAMILY_DEFAULT_GLASS: Record<FamilyTag, Glass> = {
	sour: 'coupe',
	daisy: 'coupe',
	flip: 'coupe',
	highball: 'collins',
	'old fashioned': 'rocks',
	martini: 'cocktail',
	tiki: 'hurricane',
	sparkling: 'flute'
};

export function isFamilyTag(tag: string): tag is FamilyTag {
	return (FAMILY_TAGS as readonly string[]).includes(tag);
}

export function isGlass(value: unknown): value is Glass {
	return (GLASSES as readonly unknown[]).includes(value);
}

export function isUnit(value: unknown): value is Unit {
	return (UNITS as readonly unknown[]).includes(value);
}

export function isIngredientType(value: unknown): value is IngredientType {
	return (INGREDIENT_TYPES as readonly unknown[]).includes(value);
}
