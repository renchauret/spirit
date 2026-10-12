<script lang="ts">
	import { searchIngredients, type IngredientOption } from '#lib/ingredient-search.ts';

	let {
		ingredients,
		label,
		onpick
	}: { ingredients: IngredientOption[]; label: string; onpick: (ingredient: IngredientOption) => void } = $props();

	let typed = $state('');
	const matches = $derived(searchIngredients(ingredients, typed));

	function focus(input: HTMLInputElement) {
		input.focus();
	}
</script>

<input
	class="field"
	type="search"
	aria-label={label}
	placeholder="Search the catalog"
	autocomplete="off"
	autocapitalize="none"
	enterkeyhint="search"
	bind:value={typed}
	{@attach focus}
/>
<ul class="pick-list">
	{#each matches as ingredient (ingredient.id)}
		<li>
			<button type="button" onclick={() => onpick(ingredient)}>
				<span>{ingredient.name}</span>
				{#if ingredient.parent}<span class="parent">a kind of {ingredient.parent}</span>{/if}
			</button>
		</li>
	{:else}
		{#if typed.trim()}<li class="muted small none">No Ingredient called “{typed.trim()}”.</li>{/if}
	{/each}
</ul>

<style>
	.pick-list {
		list-style: none;
		padding: 0;
		margin: 4px 0 0;
		display: flex;
		flex-direction: column;
	}

	.pick-list button {
		width: 100%;
		text-align: left;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		padding: 12px 4px;
		min-height: 48px;
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}

	.parent {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.none {
		padding: 12px 4px;
	}
</style>
