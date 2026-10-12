import type { Attachment } from 'svelte/attachments';

export type SwipeState = {
	phase: 'idle' | 'dragging';
	startY: number;
	offset: number;
	lastY: number;
	lastTime: number;
	velocity: number;
};

const IDLE_SWIPE: SwipeState = {
	phase: 'idle',
	startY: 0,
	offset: 0,
	lastY: 0,
	lastTime: 0,
	velocity: 0
};

const DISMISS_DISTANCE_FRACTION = 0.3;
const FLICK_VELOCITY = 0.6;
const FLICK_MIN_DISTANCE = 24;
const FLICK_HOLD_TIME = 100;

export function beginSwipe(atTop: boolean, y: number, time: number): SwipeState {
	if (!atTop) return IDLE_SWIPE;
	return { phase: 'dragging', startY: y, offset: 0, lastY: y, lastTime: time, velocity: 0 };
}

export function dragSwipe(state: SwipeState, y: number, time: number): SwipeState {
	if (state.phase === 'idle') return state;
	const elapsed = time - state.lastTime;
	return {
		...state,
		offset: Math.max(0, y - state.startY),
		lastY: y,
		lastTime: time,
		velocity: elapsed > 0 ? (y - state.lastY) / elapsed : state.velocity
	};
}

export function releaseSwipe(
	state: SwipeState,
	{ height, cancelled = false, time }: { height: number; cancelled?: boolean; time?: number }
): { dismiss: boolean; state: SwipeState } {
	if (state.phase === 'idle') return { dismiss: false, state };
	const draggedFar = height > 0 && state.offset >= height * DISMISS_DISTANCE_FRACTION;
	const held = time !== undefined && time - state.lastTime > FLICK_HOLD_TIME;
	const flicked = !held && state.velocity >= FLICK_VELOCITY && state.offset >= FLICK_MIN_DISTANCE;
	return { dismiss: !cancelled && (draggedFar || flicked), state: IDLE_SWIPE };
}

export function swipeDown(onDismiss: () => void): Attachment<HTMLElement> {
	return (element) => {
		let state = IDLE_SWIPE;
		let pointer: number | null = null;

		function onPointerDown(event: PointerEvent) {
			if (event.button !== 0) return;
			state = beginSwipe(element.scrollTop <= 0, event.clientY, event.timeStamp);
			if (state.phase === 'idle') return;
			pointer = event.pointerId;
			element.style.transition = 'none';
			element.setPointerCapture(event.pointerId);
		}

		function onPointerMove(event: PointerEvent) {
			if (pointer !== event.pointerId) return;
			state = dragSwipe(state, event.clientY, event.timeStamp);
			if (state.offset > 0) {
				element.style.transform = `translateY(${state.offset}px)`;
			} else {
				element.style.transform = '';
			}
		}

		function onTouchMove(event: TouchEvent) {
			const touch = event.touches[0];
			if (!touch || state.phase === 'idle') return;
			if (touch.clientY - state.startY > 0) event.preventDefault();
		}

		function finish(event: PointerEvent, cancelled: boolean) {
			if (pointer !== event.pointerId) return;
			const { dismiss } = releaseSwipe(state, {
				height: element.offsetHeight,
				cancelled,
				time: event.timeStamp
			});
			state = IDLE_SWIPE;
			pointer = null;
			if (dismiss) onDismiss();
			element.style.transition = '';
			element.style.transform = '';
		}

		const onPointerUp = (event: PointerEvent) => finish(event, false);
		const onPointerCancel = (event: PointerEvent) => finish(event, true);

		element.addEventListener('pointerdown', onPointerDown);
		element.addEventListener('pointermove', onPointerMove);
		element.addEventListener('pointerup', onPointerUp);
		element.addEventListener('pointercancel', onPointerCancel);
		element.addEventListener('touchmove', onTouchMove, { passive: false });

		return () => {
			element.removeEventListener('pointerdown', onPointerDown);
			element.removeEventListener('pointermove', onPointerMove);
			element.removeEventListener('pointerup', onPointerUp);
			element.removeEventListener('pointercancel', onPointerCancel);
			element.removeEventListener('touchmove', onTouchMove);
		};
	};
}
