const OMITTED = /<(script|style|head|nav|header|footer|aside|menu)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const JSON_LD = /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;
const TITLE = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<[^>]*>/g;

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith('#')) {
			const hex = entity[1] === 'x' || entity[1] === 'X';
			const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
		}
		return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
	});
}

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

function extractJsonLd(html: string): string[] {
	return [...html.matchAll(JSON_LD)].map((match) => match[1].trim()).filter(Boolean);
}

export type PageContent = {
	title: string;
	jsonLd: string[];
	text: string;
};

export function reducePage(html: string): PageContent {
	const title = collapse(decodeEntities((TITLE.exec(html)?.[1] ?? '').replace(TAG, ' ')));
	const readable = html.replace(OMITTED, ' ').replace(COMMENT, ' ').replace(TAG, ' ');
	return { title, jsonLd: extractJsonLd(html), text: collapse(decodeEntities(readable)) };
}
