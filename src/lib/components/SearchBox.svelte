<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { browseHref, type RecipeFilter } from '#lib/filter.ts';
	import { pickSuggestion, type Suggestion } from '#lib/search.ts';

	let { filter, suggestions }: { filter: RecipeFilter; suggestions: Suggestion[] } = $props();

	const DEBOUNCE_MS = 200;

	let input: HTMLInputElement;
	let text = $state(untrack(() => filter.query));
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect.pre(() => {
		const query = filter.query;
		if (document.activeElement !== input) text = query;
	});

	$effect(() => () => clearTimeout(timer));

	function search() {
		clearTimeout(timer);
		return goto(browseHref({ ...filter, query: text }), { replace: true, reset: false });
	}

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(search, DEBOUNCE_MS);
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		search();
		input.blur();
	}

	function clearSearch() {
		clearTimeout(timer);
		text = '';
	}

	function label(suggestion: Suggestion) {
		return suggestion.kind === 'ingredient' ? `Filter by ${suggestion.name}` : `Tag: ${suggestion.name}`;
	}
</script>

<form method="get" action="/" role="search" {onsubmit}>
	<input
		bind:this={input}
		bind:value={text}
		{oninput}
		class="search"
		type="search"
		name="q"
		placeholder="Search"
		aria-label="Search Recipes"
		autocomplete="off"
		enterkeyhint="search"
	/>
	{#each filter.ingredients as id (id)}
		<input type="hidden" name="i" value={id} />
	{/each}
	{#each filter.tags as tag (tag)}
		<input type="hidden" name="tag" value={tag} />
	{/each}
	{#if filter.favorites}
		<input type="hidden" name="fav" value="1" />
	{/if}
</form>

{#if suggestions.length}
	<div class="chips" data-sveltekit-replacestate data-sveltekit-noscroll>
		{#each suggestions as suggestion (`${suggestion.kind}:${suggestion.kind === 'ingredient' ? suggestion.id : suggestion.name}`)}
			<a class="chip sugg" href={browseHref(pickSuggestion(filter, suggestion))} onclick={clearSearch}
				>{label(suggestion)}</a
			>
		{/each}
	</div>
{/if}

<style>
	.search {
		width: 100%;
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 12px;
		padding: 12px 14px;
		min-height: 48px;
		font-size: 1rem;
	}

	.sugg {
		border-style: dashed;
	}
</style>
