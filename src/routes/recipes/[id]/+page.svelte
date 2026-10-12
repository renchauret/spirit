<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { formatLineAmount } from '#lib/amounts.ts';
	import GlassPlaceholder from '#lib/components/GlassPlaceholder.svelte';
	import OwnerRow from '#lib/components/OwnerRow.svelte';
	import UnitToggle from '#lib/components/UnitToggle.svelte';
	import { GLASS_LABELS } from '#lib/domain.ts';
	import { getUnitPreference } from '#lib/units.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const recipe = $derived(data.recipe);
	const units = getUnitPreference();

	let cameFromList = false;
	afterNavigate(({ from }) => {
		cameFromList = from?.route.id === '/';
	});

	function back(event: MouseEvent) {
		if (!cameFromList) return;
		event.preventDefault();
		history.back();
	}

	const details = $derived(
		[
			['Glass', recipe.glass || recipe.family ? GLASS_LABELS[recipe.placeholderGlass] : null],
			['Garnish', recipe.garnish],
			['Ice/serve', recipe.iceServe],
			['Source', recipe.source]
		].filter((entry): entry is [string, string] => entry[1] !== null)
	);
</script>

<svelte:head>
	<title>{recipe.name} · Spirit</title>
</svelte:head>

<main class="stack">
	<div class="top">
		<a class="btn" href="/" onclick={back}>‹ Back</a>
		<UnitToggle />
	</div>
	<OwnerRow signedIn={data.signedIn} />

	<GlassPlaceholder glass={recipe.placeholderGlass} family={recipe.family} hero />

	<h1>
		{recipe.name}
		{#if recipe.favorite}<span class="fav" aria-label="House favorite">★</span>{/if}
	</h1>

	{#if recipe.tags.length || recipe.favorite}
		<div class="chips">
			{#each recipe.tags as tag (tag)}
				<span class="chip">#{tag}</span>
			{/each}
			{#if recipe.favorite}<span class="chip">★ House favorite</span>{/if}
		</div>
	{/if}

	{#if recipe.description}
		<p class="description">{recipe.description}</p>
	{/if}

	<section class="stack section">
		<h2>Recipe lines</h2>
		<ul class="lines">
			{#each recipe.lines as line, i (i)}
				<li class:hit={data.highlighted.includes(i)}>
					<span class="amt">{formatLineAmount(line, units.system)}</span>
					<span>
						{line.ingredient}
						{#if line.note}<span class="muted small">· {line.note}</span>{/if}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	{#if recipe.method.length}
		<section class="stack section">
			<h2>Method</h2>
			{#if recipe.method.length === 1}
				<p class="method-one">{recipe.method[0]}</p>
			{:else}
				<ol class="method">
					{#each recipe.method as instruction, i (i)}
						<li>{instruction}</li>
					{/each}
				</ol>
			{/if}
		</section>
	{/if}

	{#if details.length}
		<dl class="kv">
			{#each details as [label, value] (label)}
				<dt>{label}</dt>
				<dd>{value}</dd>
			{/each}
		</dl>
	{/if}
</main>

<style>
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		background: var(--bg);
		padding-block: 6px;
		z-index: 3;
	}

	.description {
		margin: 0;
	}

	.section {
		gap: 6px;
	}

	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.lines li {
		display: grid;
		grid-template-columns: 6rem 1fr;
		gap: 10px;
		padding: 9px 0;
		border-bottom: 1px solid var(--line);
	}

	.lines li.hit {
		background: var(--soft);
		border-radius: 8px;
		padding-inline: 6px;
	}

	.amt {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	.method-one {
		margin: 0;
	}

	.method {
		margin: 0;
		padding-left: 1.3rem;
	}

	.kv {
		display: grid;
		grid-template-columns: 6rem 1fr;
		gap: 6px 12px;
		margin: 0;
	}

	.kv dt {
		color: var(--muted);
	}

	.kv dd {
		margin: 0;
		min-width: 0;
	}
</style>
