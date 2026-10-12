<script lang="ts">
	import GlassPlaceholder from '#lib/components/GlassPlaceholder.svelte';
	import UnitToggle from '#lib/components/UnitToggle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Spirit</title>
</svelte:head>

<main class="stack">
	<header class="brand">
		<h1>Spirit</h1>
		<UnitToggle />
	</header>

	<div class="row heading">
		<h2>Favorites first</h2>
		<span class="count">{data.recipes.length}</span>
	</div>

	{#if data.recipes.length}
		<ul class="cards">
			{#each data.recipes as recipe (recipe.id)}
				<li>
					<a class="card" href="/recipes/{recipe.id}">
						<GlassPlaceholder glass={recipe.glass} family={recipe.family}>
							{#if recipe.favorite}
								<span class="star fav" aria-label="House favorite">★</span>
							{/if}
						</GlassPlaceholder>
						<span class="t">
							<b>{recipe.name}</b>
							{#if recipe.subtitle}
								<span class="muted small">{recipe.subtitle}</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">No Recipes yet.</p>
	{/if}
</main>

<style>
	.brand {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.brand h1 {
		font-size: 1.7rem;
	}

	.heading {
		justify-content: space-between;
	}

	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.card {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
	}

	.star {
		position: absolute;
		top: 8px;
		right: 8px;
		background: var(--surface);
		border-radius: 999px;
		padding: 2px 8px;
		font-size: 0.8rem;
	}

	.t {
		padding: 8px 10px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.t b {
		font-size: 0.95rem;
	}
</style>
