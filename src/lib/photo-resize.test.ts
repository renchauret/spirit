import { describe, expect, it } from 'vitest';
import type { PhotoType } from './photos.ts';
import { cardPlan, encodeBoth, pagePlan, type Encoder, type Plan } from './photo-resize.ts';

describe('cardPlan', () => {
	it('center-crops a landscape photo to a 600 px square', () => {
		expect(cardPlan(4032, 3024)).toEqual({
			source: { x: 504, y: 0, width: 3024, height: 3024 },
			width: 600,
			height: 600
		});
	});

	it('center-crops a portrait photo to a 600 px square', () => {
		expect(cardPlan(3024, 4032)).toEqual({
			source: { x: 0, y: 504, width: 3024, height: 3024 },
			width: 600,
			height: 600
		});
	});

	it('does not enlarge a small photo', () => {
		expect(cardPlan(400, 300)).toEqual({
			source: { x: 50, y: 0, width: 300, height: 300 },
			width: 300,
			height: 300
		});
	});
});

describe('pagePlan', () => {
	it('shrinks the long edge to 1600 px and keeps the whole photo', () => {
		expect(pagePlan(4032, 3024)).toEqual({
			source: { x: 0, y: 0, width: 4032, height: 3024 },
			width: 1600,
			height: 1200
		});
		expect(pagePlan(3024, 4032)).toMatchObject({ width: 1200, height: 1600 });
	});

	it('does not enlarge a small photo', () => {
		expect(pagePlan(800, 600)).toMatchObject({ width: 800, height: 600 });
	});
});

describe('encodeBoth', () => {
	const card = cardPlan(4032, 3024);
	const page = pagePlan(4032, 3024);

	const encoder =
		(supported: PhotoType[], calls: string[] = []): Encoder =>
		async (plan: Plan, type) => {
			calls.push(`${plan.width}:${type}`);
			return new Blob(['x'], { type: supported.includes(type) ? type : 'image/png' });
		};

	it('makes WebP images when the browser can encode WebP', async () => {
		const calls: string[] = [];
		const result = await encodeBoth(card, page, encoder(['image/webp', 'image/jpeg'], calls));

		expect(result.type).toBe('image/webp');
		expect(result.card.type).toBe('image/webp');
		expect(result.page.type).toBe('image/webp');
		expect(calls).toEqual(['600:image/webp', '1600:image/webp']);
	});

	it('falls back to JPEG when the browser silently returns another format for WebP', async () => {
		const result = await encodeBoth(card, page, encoder(['image/jpeg']));

		expect(result.type).toBe('image/jpeg');
		expect([result.card.type, result.page.type]).toEqual(['image/jpeg', 'image/jpeg']);
	});

	it('fails when the browser can encode neither', async () => {
		await expect(encodeBoth(card, page, encoder([]))).rejects.toThrow('could not prepare the photo');
	});

	it('fails when the canvas produces nothing', async () => {
		await expect(encodeBoth(card, page, async () => null)).rejects.toThrow('could not prepare the photo');
	});
});
