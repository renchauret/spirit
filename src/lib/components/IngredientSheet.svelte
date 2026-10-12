<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { INGREDIENT_TYPES, type IngredientType } from '#lib/domain.ts';
	import { outsideOf, recipeCountLabel, type CatalogEntry } from '#lib/ingredient-catalog.ts';
	import type { IngredientOption } from '#lib/ingredient-search.ts';
	import BottomSheet from './BottomSheet.svelte';
	import IngredientSearch from './IngredientSearch.svelte';

	type Step = 'edit' | 'pick parent' | 'pick merge' | 'confirm merge' | 'confirm delete';

	let {
		entry,
		catalog,
		step: startStep = 'edit',
		onclose
	}: { entry: CatalogEntry; catalog: CatalogEntry[]; step?: Step; onclose: () => void } = $props();

	const id = $props.id();
	const start = untrack(() => entry);

	let step = $state<Step>(untrack(() => startStep));
	let name = $state(start.name);
	let type = $state<IngredientType>(start.type);
	let parentId = $state<number | null>(start.parentId);
	let mergeInto = $state<IngredientOption | null>(null);
	let busy = $state(false);
	let error = $state('');

	const related = $derived(outsideOf(catalog, entry.id));
	const parent = $derived(catalog.find((i) => i.id === parentId) ?? null);

	function pickParent(option: IngredientOption) {
		parentId = option.id;
		type = catalog.find((i) => i.id === option.id)?.type ?? type;
		step = 'edit';
	}

	function pickMerge(option: IngredientOption) {
		mergeInto = option;
		step = 'confirm merge';
	}

	function go(next: Step) {
		error = '';
		step = next;
	}

	const submit: SubmitFunction = () => {
		busy = true;
		error = '';
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				error = String(result.data?.error ?? 'That change could not be saved.');
			} else if (result.type === 'error') {
				error = result.error?.message ?? 'That change could not be saved.';
				await invalidateAll();
			} else {
				await update();
				if (result.type === 'success') onclose();
			}
			busy = false;
		};
	};
</script>

<BottomSheet label="Edit {start.name}" {onclose}>
	{#if step === 'edit'}
		<form class="stack" method="POST" action="?/update" use:enhance={submit}>
			<input type="hidden" name="id" value={entry.id} />
			<input type="hidden" name="type" value={type} />
			<input type="hidden" name="parent" value={parentId ?? ''} />

			<div class="head">
				<h3>Edit Ingredient</h3>
				<button type="submit" class="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
			</div>

			{#if error}<p class="error" role="alert">{error}</p>{/if}

			<div>
				<label class="label" for="{id}-name">Name</label>
				<input class="field" id="{id}-name" name="name" autocomplete="off" required bind:value={name} />
			</div>

			<div>
				<span class="label" id="{id}-type">Ingredient type</span>
				<div class="pills" role="group" aria-labelledby="{id}-type">
					{#each INGREDIENT_TYPES as choice (choice)}
						<button type="button" aria-pressed={type === choice} onclick={() => (type = choice)}>{choice}</button>
					{/each}
				</div>
			</div>

			<div>
				<span class="label" id="{id}-parent">Parent Ingredient (optional)</span>
				<div class="row">
					<button type="button" class="btn picked" aria-describedby="{id}-parent" onclick={() => go('pick parent')}>
						<span>{parent ? parent.name : 'Nothing'}</span>
						<span class="muted small">Change</span>
					</button>
					{#if parent}
						<button type="button" class="icon-btn" aria-label="Remove Parent Ingredient" onclick={() => (parentId = null)}>
							✕
						</button>
					{/if}
				</div>
			</div>
		</form>

		<section class="stack danger" aria-label="Merge or delete">
			<p class="muted small">
				{entry.recipes ? `Used in ${recipeCountLabel(entry.recipes)}.` : 'No Recipe uses it, so it can be deleted.'}
			</p>
			<div class="row">
				<button type="button" class="btn" onclick={() => go('pick merge')}>Merge into…</button>
				{#if entry.recipes === 0}
					<button type="button" class="btn ghost" onclick={() => go('confirm delete')}>Delete</button>
				{/if}
			</div>
		</section>
	{:else if step === 'pick parent'}
		<div class="head">
			<h3>Parent Ingredient of {start.name}</h3>
			<button type="button" class="btn" onclick={() => go('edit')}>Back</button>
		</div>
		<IngredientSearch ingredients={related} label="Parent Ingredient" onpick={pickParent} />
	{:else if step === 'pick merge'}
		<div class="head">
			<h3>Merge {start.name} into…</h3>
			<button type="button" class="btn" onclick={() => go('edit')}>Back</button>
		</div>
		<IngredientSearch ingredients={related} label="Merge into" onpick={pickMerge} />
	{:else if step === 'confirm merge' && mergeInto}
		<form class="stack confirm" method="POST" action="?/merge" use:enhance={submit}>
			<input type="hidden" name="id" value={entry.id} />
			<input type="hidden" name="into" value={mergeInto.id} />
			<p>Merge {start.name} into {mergeInto.name}? This can’t be undone.</p>
			<p class="small">
				Every Recipe line using {start.name} will use {mergeInto.name}, and Ingredients under {start.name} move under {mergeInto.name}.
			</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<div class="row">
				<button type="submit" class="btn primary" disabled={busy}>Merge</button>
				<button type="button" class="btn" disabled={busy} onclick={() => go('edit')}>Keep</button>
			</div>
		</form>
	{:else if step === 'confirm delete'}
		<form class="stack confirm" method="POST" action="?/delete" use:enhance={submit}>
			<input type="hidden" name="id" value={entry.id} />
			<p>Delete {start.name}? This can’t be undone.</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<div class="row">
				<button type="submit" class="btn primary" disabled={busy}>Delete</button>
				<button type="button" class="btn" disabled={busy} onclick={() => go('edit')}>Keep</button>
			</div>
		</form>
	{/if}
</BottomSheet>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.label {
		font-size: 0.8rem;
		color: var(--muted);
		display: block;
		margin-bottom: 4px;
	}

	.error {
		margin: 0;
		color: var(--accent);
		font-weight: 400;
	}

	.row {
		flex-wrap: nowrap;
	}

	.picked {
		flex: 1;
		justify-content: space-between;
		gap: 8px;
		text-align: left;
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.pills button {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 999px;
		padding: 6px 12px;
		min-height: 38px;
	}

	.pills button[aria-pressed='true'] {
		background: var(--fg);
		color: var(--bg);
		border-color: var(--fg);
	}

	.danger {
		gap: 8px;
		border-top: 1px solid var(--line);
		padding-top: 14px;
	}

	.danger p {
		margin: 0;
	}

	.confirm {
		gap: 10px;
		border: 1px solid var(--accent);
		background: var(--soft);
		border-radius: 10px;
		padding: 12px;
	}

	.confirm p {
		margin: 0;
	}

	.confirm p:first-of-type {
		font-weight: 700;
	}

	.confirm .btn {
		flex: 1;
		justify-content: center;
	}
</style>
