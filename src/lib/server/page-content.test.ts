import { describe, expect, it } from 'vitest';
import { reducePage } from './page-content.ts';

describe('reducePage', () => {
	it('pulls out the title, JSON-LD and readable text', () => {
		const html = `<!doctype html><html><head>
			<title>Daiquiri &amp; more</title>
			<script type="application/ld+json">{"@type":"Recipe","name":"Daiquiri"}</script>
			<script>console.log('nope')</script>
			<style>.x { color: red }</style>
		</head><body>
			<nav><a href="/">Home</a></nav>
			<h1>Daiquiri</h1>
			<p>Shake with ice &amp; strain.</p>
			<!-- a comment -->
		</body></html>`;

		expect(reducePage(html)).toEqual({
			title: 'Daiquiri & more',
			jsonLd: ['{"@type":"Recipe","name":"Daiquiri"}'],
			text: 'Daiquiri Shake with ice & strain.'
		});
	});

	it('keeps every JSON-LD block, whatever its @type', () => {
		const html = `<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
			<script type='application/ld+json'>{"@type":"Recipe"}</script>`;

		expect(reducePage(html).jsonLd).toEqual(['{"@type":"BreadcrumbList"}', '{"@type":"Recipe"}']);
	});

	it('leaves pages with no title or JSON-LD empty', () => {
		expect(reducePage('<p>Just text</p>')).toEqual({ title: '', jsonLd: [], text: 'Just text' });
	});

	it('decodes numeric and named entities', () => {
		expect(reducePage('<p>2&nbsp;oz &lt;rum&gt; &#189; &#x2044;</p>').text).toBe('2 oz <rum> ½ ⁄');
	});
});
