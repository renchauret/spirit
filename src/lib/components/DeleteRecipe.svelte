<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';

	let { name, confirming = false }: { name: string; confirming?: boolean } = $props();

	let asking = $derived(confirming);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	const remove: SubmitFunction = () => {
		deleting = true;
		deleteError = null;
		return async ({ result, update }) => {
			if (result.type === 'redirect') return update();
			deleting = false;
			deleteError = (result.type === 'error' && result.error?.message) || 'That Recipe could not be deleted.';
		};
	};
</script>

<section class="danger" aria-label="Delete Recipe">
	{#if asking}
		<form class="stack" method="POST" action="?/delete" use:enhance={remove}>
			<p>Delete {name}? This can’t be undone.</p>
			{#if deleteError}<p class="error" role="alert">{deleteError}</p>{/if}
			<div class="row">
				<button type="submit" class="btn primary" disabled={deleting}>Delete</button>
				<button type="button" class="btn" disabled={deleting} onclick={() => (asking = false)}>Keep</button>
			</div>
		</form>
	{:else}
		<button type="button" class="btn ghost" onclick={() => (asking = true)}>Delete Recipe</button>
	{/if}
</section>

<style>
	.danger {
		border-top: 1px solid var(--line);
		padding-top: 16px;
		margin-top: 8px;
	}

	.stack {
		gap: 10px;
		border: 1px solid var(--accent);
		background: var(--soft);
		border-radius: 10px;
		padding: 12px;
	}

	p {
		margin: 0;
		font-weight: 700;
	}

	.error {
		font-weight: 400;
	}

	.btn {
		flex: 1;
		justify-content: center;
	}

	.ghost {
		padding-inline: 0;
	}
</style>
