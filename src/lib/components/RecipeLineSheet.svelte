<script lang="ts">
	import { untrack } from 'svelte';
	import { UNITS, UNITS_WITHOUT_AMOUNT, type Unit } from '#lib/domain.ts';
	import type { IngredientOption } from '#lib/ingredient-search.ts';
	import type { DraftLine } from '#lib/recipe-draft.ts';
	import { parseAmount, writtenAmount } from '#lib/recipe-lines.ts';
	import BottomSheet from './BottomSheet.svelte';
	import IngredientSearch from './IngredientSearch.svelte';

	const SHORTCUTS = ['¼', '⅓', '½', '⅔', '¾', '1', '1½', '2'];

	let {
		line,
		ingredients,
		onsave,
		onclose
	}: {
		line: DraftLine | null;
		ingredients: IngredientOption[];
		onsave: (line: DraftLine) => void;
		onclose: () => void;
	} = $props();

	const id = $props.id();
	const start = untrack(
		() => line ?? { ingredientId: null, amountMin: null, amountMax: null, unit: 'oz' as Unit, note: '' }
	);

	let ingredientId = $state<number | null>(start.ingredientId);
	let picking = $state(start.ingredientId === null);
	const startText = writtenAmount(start);
	const title = start.ingredientId === null ? 'New Recipe line' : 'Edit Recipe line';

	let amountText = $state(startText);
	let unit = $state<Unit>(start.unit);
	let note = $state(start.note);
	let error = $state('');

	const picked = $derived(ingredients.find((i) => i.id === ingredientId) ?? null);
	const amountless = $derived(UNITS_WITHOUT_AMOUNT.includes(unit));

	function pick(ingredient: IngredientOption) {
		ingredientId = ingredient.id;
		picking = false;
		error = '';
	}

	function chooseUnit(choice: Unit) {
		unit = choice;
		if (UNITS_WITHOUT_AMOUNT.includes(choice)) amountText = '';
	}

	function done() {
		const amount =
			amountText === startText ? { amountMin: start.amountMin, amountMax: start.amountMax } : parseAmount(amountText);
		if (ingredientId === null) error = 'Pick an Ingredient first.';
		else if (!amount) error = 'Write the amount like ¾, 1½ or 1-2.';
		else if (amount.amountMin === null && !amountless) error = 'Add an amount, or choose top, rinse or to taste.';
		else {
			onsave({ ingredientId, ...amount, unit, note: note.trim() });
			onclose();
		}
	}
</script>

<BottomSheet label={title} {onclose}>
	<div class="head">
		<h3>{title}</h3>
		<button type="button" class="btn primary" onclick={done}>Done</button>
	</div>

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<div>
		<span class="label" id="{id}-ingredient">Ingredient</span>
		{#if picked && !picking}
			<button
				type="button"
				class="btn picked"
				aria-describedby="{id}-ingredient"
				onclick={() => (picking = true)}
			>
				<span>
					{picked.name}
					{#if picked.parent}<span class="muted small">· a kind of {picked.parent}</span>{/if}
				</span>
				<span class="muted small">Change</span>
			</button>
		{:else}
			<IngredientSearch {ingredients} label="Ingredient" onpick={pick} />
		{/if}
	</div>

	<div>
		<label class="label" for="{id}-amount">Amount</label>
		<input
			class="field amt"
			id="{id}-amount"
			placeholder={amountless ? `No amount for ${unit}` : 'e.g. ¾ or 1-2'}
			autocomplete="off"
			enterkeyhint="done"
			disabled={amountless}
			bind:value={amountText}
		/>
		<div class="fracs">
			{#each SHORTCUTS as shortcut (shortcut)}
				<button type="button" disabled={amountless} onclick={() => (amountText = shortcut)}>{shortcut}</button>
			{/each}
			<button type="button" aria-label="Clear amount" disabled={amountless} onclick={() => (amountText = '')}>⌫</button>
		</div>
	</div>

	<div>
		<span class="label" id="{id}-unit">Unit</span>
		<div class="units" role="group" aria-labelledby="{id}-unit">
			{#each UNITS as choice (choice)}
				<button type="button" aria-pressed={unit === choice} onclick={() => chooseUnit(choice)}>{choice}</button>
			{/each}
		</div>
	</div>

	<div>
		<label class="label" for="{id}-note">Note (optional)</label>
		<input
			class="field"
			id="{id}-note"
			placeholder="e.g. fresh, chilled"
			autocomplete="off"
			enterkeyhint="done"
			bind:value={note}
		/>
	</div>
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
	}

	.picked {
		width: 100%;
		justify-content: space-between;
		gap: 8px;
		text-align: left;
	}

	.amt {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
	}

	.field:disabled {
		opacity: 0.6;
	}

	.fracs {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 6px;
	}

	.fracs button {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 8px;
		min-width: 44px;
		min-height: 44px;
		font-family: var(--mono);
	}

	.fracs button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.units {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.units button {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 999px;
		padding: 6px 12px;
		min-height: 38px;
	}

	.units button[aria-pressed='true'] {
		background: var(--fg);
		color: var(--bg);
		border-color: var(--fg);
	}
</style>
