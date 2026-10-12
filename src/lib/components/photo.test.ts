import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PhotoPicker from './PhotoPicker.svelte';
import RecipeImage from './RecipeImage.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('RecipeImage', () => {
	it('shows the photo when the Recipe has one', () => {
		const html = text(
			render(RecipeImage, {
				props: { photo: '/photos/recipes/1/a-page.webp', name: 'Daiquiri', glass: 'coupe', family: 'sour', hero: true }
			}).body
		);

		expect(html).toMatch(/<img[^>]*src="\/photos\/recipes\/1\/a-page.webp"[^>]*alt="Photo of Daiquiri"/);
		expect(html).not.toContain('<svg');
	});

	it('leaves a card photo out of the accessibility tree, since the name follows it', () => {
		const html = text(
			render(RecipeImage, {
				props: { photo: '/photos/recipes/1/a-card.webp', name: 'Daiquiri', glass: 'coupe', family: 'sour' }
			}).body
		);

		expect(html).toMatch(/<img[^>]*alt=""[^>]*loading="lazy"/);
	});

	it('shows the glass placeholder without a photo', () => {
		const html = text(
			render(RecipeImage, { props: { photo: null, name: 'Daiquiri', glass: 'coupe', family: 'sour', hero: true } }).body
		);

		expect(html).not.toContain('<img');
		expect(html).toContain('aria-label="coupe glass"');
	});
});

describe('PhotoPicker', () => {
	it('offers to add a photo over the glass placeholder', () => {
		const html = text(
			render(PhotoPicker, { props: { value: null, photo: null, name: 'Daiquiri', glass: 'coupe', family: 'sour' } }).body
		);

		expect(html).toMatch(/<input[^>]*type="file"[^>]*accept="image\/\*"/);
		expect(html).not.toMatch(/<input[^>]*type="file"[^>]*name=/);
		expect(html).toContain('Add photo');
		expect(html).toContain('aria-label="coupe glass"');
	});

	it('offers to replace an existing photo', () => {
		const html = text(
			render(PhotoPicker, {
				props: { value: null, photo: '/photos/recipes/1/a-page.webp', name: 'Daiquiri', glass: 'coupe', family: 'sour' }
			}).body
		);

		expect(html).toContain('Replace photo');
		expect(html).toMatch(/<img[^>]*src="\/photos\/recipes\/1\/a-page.webp"/);
	});
});
