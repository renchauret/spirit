import { describe, expect, it } from 'vitest';
import { beginSwipe, dragSwipe, releaseSwipe, type SwipeState } from '#lib/swipe-down.ts';

const SHEET_HEIGHT = 600;

function armed(): SwipeState {
	return beginSwipe(true, 100, 0);
}

describe('swipe down to close', () => {
	it('ignores a swipe that starts while the contents are scrolled down', () => {
		const state = beginSwipe(false, 100, 0);

		expect(state.phase).toBe('idle');
		expect(dragSwipe(state, 300, 50).offset).toBe(0);
		expect(releaseSwipe(state, { height: SHEET_HEIGHT }).dismiss).toBe(false);
	});

	it('follows the finger downward', () => {
		const state = dragSwipe(armed(), 180, 50);

		expect(state.offset).toBe(80);
	});

	it('never lifts the sheet above its resting place', () => {
		const state = dragSwipe(armed(), 40, 50);

		expect(state.offset).toBe(0);
	});

	it('springs back when released before the distance threshold', () => {
		const state = dragSwipe(armed(), 200, 600);
		const released = releaseSwipe(state, { height: SHEET_HEIGHT });

		expect(released.dismiss).toBe(false);
		expect(released.state.phase).toBe('idle');
	});

	it('closes when released past the distance threshold', () => {
		const state = dragSwipe(armed(), 320, 600);
		const released = releaseSwipe(state, { height: SHEET_HEIGHT });

		expect(released.dismiss).toBe(true);
	});

	it('closes on a quick downward flick even before the distance threshold', () => {
		const state = dragSwipe(armed(), 180, 50);
		const released = releaseSwipe(state, { height: SHEET_HEIGHT });

		expect(released.dismiss).toBe(true);
	});

	it('does not treat a slow short drag as a flick', () => {
		const state = dragSwipe(armed(), 120, 400);
		const released = releaseSwipe(state, { height: SHEET_HEIGHT });

		expect(released.dismiss).toBe(false);
	});

	it('springs back when the gesture is cancelled', () => {
		const state = dragSwipe(armed(), 320, 600);
		const released = releaseSwipe(state, { height: SHEET_HEIGHT, cancelled: true });

		expect(released.dismiss).toBe(false);
	});

	it('ignores a tap on the sheet', () => {
		const released = releaseSwipe(armed(), { height: SHEET_HEIGHT });

		expect(released.dismiss).toBe(false);
		expect(released.state.offset).toBe(0);
	});
});
