import { describe, expect, it } from 'vitest';
import { returnTo } from './return-to';

const origin = 'https://spirit.renchauret.com';

describe('returnTo', () => {
	it('returns to a page on this site', () => {
		expect(returnTo('/recipes/12?unit=ml', origin)).toBe('/recipes/12?unit=ml');
	});

	it('returns to the path of a same-site URL, such as the Referer', () => {
		expect(returnTo('https://spirit.renchauret.com/recipes/12?q=sour#top', origin)).toBe(
			'/recipes/12?q=sour'
		);
	});

	it('goes home when there is nowhere to return to', () => {
		expect(returnTo(null, origin)).toBe('/');
		expect(returnTo('', origin)).toBe('/');
	});

	it('never leaves the site', () => {
		expect(returnTo('https://evil.example/', origin)).toBe('/');
		expect(returnTo('//evil.example/', origin)).toBe('/');
		expect(returnTo('/\\evil.example/', origin)).toBe('/');
		expect(returnTo('javascript:alert(1)', origin)).toBe('/');
		expect(returnTo('https://spirit.renchauret.com//evil.example/', origin)).toBe('/');
		expect(returnTo('/./\\evil.example/', origin)).toBe('/');
	});

	it('does not return to the sign-in page itself', () => {
		expect(returnTo('/signin', origin)).toBe('/');
		expect(returnTo('https://spirit.renchauret.com/signin?redirectTo=/', origin)).toBe('/');
	});
});
