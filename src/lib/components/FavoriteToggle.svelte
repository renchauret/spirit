<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';

	let { favorite }: { favorite: boolean } = $props();

	let pending = $state<boolean | null>(null);
	let failed = $state(false);
	const shown = $derived(pending ?? favorite);

	const toggle: SubmitFunction = () => {
		pending = !favorite;
		failed = false;
		return async ({ result, update }) => {
			await update();
			pending = null;
			failed = result.type !== 'success';
		};
	};
</script>

<form method="POST" action="?/favorite" use:enhance={toggle}>
	<input type="hidden" name="favorite" value={String(!shown)} />
	<button
		type="submit"
		class:on={shown}
		aria-pressed={shown}
		aria-label="House favorite"
		disabled={pending !== null}>{shown ? '★' : '☆'}</button
	>
	{#if failed}<span class="error" role="alert">Couldn’t save the favorite.</span>{/if}
</form>

<style>
	form {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	button {
		border: 0;
		background: none;
		padding: 0 4px;
		min-width: 44px;
		min-height: 44px;
		font-size: 1.6rem;
		line-height: 1;
		color: var(--muted);
	}

	button.on {
		color: var(--gold);
	}

	button:disabled {
		cursor: default;
	}

	.error {
		font-size: 0.86rem;
		color: var(--accent);
	}
</style>
