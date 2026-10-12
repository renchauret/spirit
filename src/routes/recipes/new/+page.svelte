<script lang="ts">
	import { goto } from '$app/navigation';
	import RecipeEditor from '#lib/components/RecipeEditor.svelte';
	import { emptyDraft } from '#lib/recipe-draft.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let draft = $state(emptyDraft());
</script>

<svelte:head>
	<title>New Recipe · Spirit</title>
</svelte:head>

<main class="stack">
	<RecipeEditor
		bind:draft
		ingredients={data.ingredients}
		existingTags={data.tagSuggestions}
		action="?/create"
		heading="New Recipe"
		oncancel={() => goto('/')}
	/>
</main>
