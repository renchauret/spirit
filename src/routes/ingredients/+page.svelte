<script lang="ts">
	import IngredientSheet from '#lib/components/IngredientSheet.svelte';
	import OwnerRow from '#lib/components/OwnerRow.svelte';
	import { groupByType, recipeCountLabel } from '#lib/ingredient-catalog.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let openId = $state<number | null>(null);
	const sections = $derived(groupByType(data.catalog));
	const open = $derived(data.catalog.find((i) => i.id === openId) ?? null);
</script>

<svelte:head>
	<title>Ingredients · Spirit</title>
</svelte:head>

<main class="stack">
	<div class="page-header">
		<a class="btn" href="/">‹ Back</a>
	</div>
	<OwnerRow signedIn={data.signedIn} />

	<h1>Ingredients</h1>

	{#each sections as section (section.type)}
		<section class="stack section" aria-label={section.type}>
			<div class="row heading">
				<h2>{section.type}</h2>
				<span class="count">{section.ingredients.length}</span>
			</div>
			<ul class="list">
				{#each section.ingredients as ingredient (ingredient.id)}
					<li>
						<button type="button" onclick={() => (openId = ingredient.id)}>
							<span class="name">
								{ingredient.name}
								{#if ingredient.parent}<span class="muted small">a kind of {ingredient.parent}</span>{/if}
							</span>
							<span class="muted small uses">
								{recipeCountLabel(ingredient.recipes)}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="muted">No Ingredients yet.</p>
	{/each}
</main>

{#if open}
	{#key open.id}
		<IngredientSheet entry={open} catalog={data.catalog} onclose={() => (openId = null)} />
	{/key}
{/if}

<style>
	.section {
		gap: 6px;
	}

	.heading {
		justify-content: space-between;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
	}

	.list li + li {
		border-top: 1px solid var(--line);
	}

	.list button {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		border: 0;
		background: transparent;
		text-align: left;
		padding: 10px 14px;
		min-height: 48px;
	}

	.uses {
		flex: none;
	}

	.name {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
</style>
