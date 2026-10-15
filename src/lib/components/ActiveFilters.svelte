<script lang="ts">
	import {
		browseHref,
		EMPTY_FILTER,
		isFilterActive,
		toggleFavorites,
		toggleIngredient,
		toggleTag,
		type FilterSection,
		type RecipeFilter
	} from '#lib/filter.ts';

	let { filter, sections }: { filter: RecipeFilter; sections: FilterSection[] } = $props();

	const names = $derived(new Map(sections.flatMap((s) => s.ingredients.map((i) => [i.id, i.name]))));
</script>

{#if isFilterActive(filter)}
	<div class="chips" data-sveltekit-replacestate data-sveltekit-noscroll>
		{#each filter.ingredients as id (id)}
			<a class="chip sel" rel="nofollow" href={browseHref(toggleIngredient(filter, id))} aria-label="Remove {names.get(id)}">
				{names.get(id)} ✕
			</a>
		{/each}
		{#each filter.tags as tag (tag)}
			<a class="chip sel" rel="nofollow" href={browseHref(toggleTag(filter, tag))} aria-label="Remove Tag {tag}">#{tag} ✕</a>
		{/each}
		{#if filter.favorites}
			<a class="chip sel" rel="nofollow" href={browseHref(toggleFavorites(filter))} aria-label="Remove favorites">★ favorites ✕</a>
		{/if}
		<a class="clear" href={browseHref(EMPTY_FILTER)}>Clear all</a>
	</div>
{/if}

<style>
	.clear {
		color: var(--accent);
		font-weight: 700;
		padding: 6px 0;
		align-self: center;
	}
</style>
