import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { handle } from './hooks.server';

const event = { url: new URL('https://spirit.renchauret.com/') } as RequestEvent;

describe('handle', () => {
	it('marks every server-rendered response as not cacheable', async () => {
		const response = await handle({
			event,
			resolve: async () => new Response('<h1>Spirit</h1>')
		});

		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('overrides a cache header set while rendering', async () => {
		const response = await handle({
			event,
			resolve: async () =>
				new Response('<h1>Spirit</h1>', { headers: { 'cache-control': 'max-age=3600' } })
		});

		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});
