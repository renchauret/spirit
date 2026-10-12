<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import DeleteRecipe from '#lib/components/DeleteRecipe.svelte';
	import FavoriteToggle from '#lib/components/FavoriteToggle.svelte';
	import RecipeEditor from '#lib/components/RecipeEditor.svelte';
	import RecipeImage from '#lib/components/RecipeImage.svelte';
	import RecipeLines from '#lib/components/RecipeLines.svelte';
	import { GLASS_LABELS } from '#lib/domain.ts';
	import { tagBrowseHref } from '#lib/filter.ts';
	import { draftFrom, type RecipeDraft } from '#lib/recipe-draft.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const recipe = $derived(data.recipe);

	let draft = $state<RecipeDraft | null>(null);

	function startEditing() {
		if (!data.editor) return;
		draft = draftFrom({ ...recipe, ownerNotes: data.editor.ownerNotes });
		scrollTo({ top: 0 });
	}

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
	{#if draft && data.editor}
		<RecipeEditor
			bind:draft
			ingredients={data.editor.ingredients}
			existingTags={data.editor.tagSuggestions}
			action="?/save"
			photo={recipe.photo}
			oncancel={() => (draft = null)}
			onsaved={() => (draft = null)}
		/>
		<DeleteRecipe name={recipe.name} />
	{:else}
		<div class="top">
			<div class="page-header">
				<a class="btn" href="/" onclick={back}>‹ Back</a>
				{#if data.editor}<button type="button" class="btn primary" onclick={startEditing}>Edit</button>{/if}
			</div>
		</div>

		<RecipeImage photo={recipe.photo} name={recipe.name} glass={recipe.placeholderGlass} family={recipe.family} hero />

		{#if data.editor}
			<div class="title">
				<h1>{recipe.name}</h1>
				<FavoriteToggle favorite={recipe.favorite} />
			</div>
		{:else}
			<h1>
				{recipe.name}
				{#if recipe.favorite}<span class="fav" aria-label="House favorite">★</span>{/if}
			</h1>
		{/if}

		{#if recipe.tags.length || recipe.favorite}
			<div class="chips">
				{#each recipe.tags as tag (tag)}
					<a class="chip" href={tagBrowseHref(tag)}>#{tag}</a>
				{/each}
				{#if recipe.favorite}<span class="chip">★ House favorite</span>{/if}
			</div>
		{/if}

		{#if recipe.description}
			<p class="description">{recipe.description}</p>
		{/if}

		<section class="stack section">
			<h2>Recipe lines</h2>
			<RecipeLines lines={recipe.lines} highlighted={data.highlighted} />
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

		{#if data.editor?.ownerNotes}
			<section class="stack section">
				<h2>Owner notes</h2>
				<p class="notes">{data.editor.ownerNotes}</p>
			</section>
		{/if}
	{/if}
</main>

<style>
	.title {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.description {
		margin: 0;
		white-space: pre-line;
	}

	.notes {
		margin: 0;
		white-space: pre-line;
	}

	.section {
		gap: 6px;
	}

	.method-one {
		margin: 0;
		padding-inline: 6px;
	}

	.method {
		margin: 0;
		padding-inline: calc(1.3rem + 6px) 6px;
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
