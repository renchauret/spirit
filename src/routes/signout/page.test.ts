import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('Sign out page', () => {
	it('shows a single Sign out button that posts to the page', () => {
		const html = text(render(Page, { props: {} }).body);

		expect(html).toContain('<h1>Sign out</h1>');
		expect(html.match(/<form[^>]*method="POST"/g)).toHaveLength(1);
		expect(html).not.toContain('action=');
		expect(html.match(/>Sign out<\/button>/g)).toHaveLength(1);
	});
});
