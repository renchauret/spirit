<script lang="ts">
	import type { Snippet } from 'svelte';
	import { swipeDown } from '#lib/swipe-down.ts';

	let { label, onclose, children }: { label: string; onclose: () => void; children: Snippet } = $props();

	const swipe = swipeDown(() => onclose());

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<button type="button" class="scrim" aria-label="Close" tabindex="-1" onclick={onclose}></button>
<div class="sheet" role="dialog" aria-modal="true" aria-label={label} {@attach swipe}>
	<div class="grip"></div>
	{@render children()}
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.35);
		z-index: 40;
		border: 0;
		padding: 0;
		cursor: default;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 41;
		background: var(--surface);
		border-radius: 18px 18px 0 0;
		padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
		max-height: 82%;
		overflow: auto;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 560px;
		margin: 0 auto;
	}

	.grip {
		width: 40px;
		height: 5px;
		border-radius: 3px;
		background: var(--line);
		align-self: center;
	}

	@media (prefers-reduced-motion: no-preference) {
		.sheet {
			animation: up 0.18s ease-out;
			transition: transform 0.2s ease-out;
		}

		@keyframes up {
			from {
				transform: translateY(24px);
				opacity: 0.6;
			}
		}
	}
</style>
