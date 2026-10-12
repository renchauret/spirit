<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '$app/forms';
	import ImportPrompt from '#lib/components/ImportPrompt.svelte';
	import RecipeEditor from '#lib/components/RecipeEditor.svelte';
	import { emptyDraft, type RecipeDraft } from '#lib/recipe-draft.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formData = () => form as { draft?: RecipeDraft; text?: string; errors?: string[] } | null;

	let mode = $state<'prompt' | 'editor'>(formData()?.draft ? 'editor' : 'prompt');
	let draft = $state<RecipeDraft>(formData()?.draft ?? emptyDraft());
	let text = $state(formData()?.text ?? '');
	let reading = $state(false);
	let error = $state<string | null>(formData()?.errors?.[0] ?? null);
	let readingRequest = 0;
	let readingAbort: AbortController | null = null;

	function startFromScratch() {
		draft = emptyDraft();
		error = null;
		mode = 'editor';
	}

	function cancelReading() {
		readingAbort?.abort();
		readingAbort = null;
		readingRequest += 1;
		reading = false;
	}

	const importRecipe: SubmitFunction = ({ controller }) => {
		const token = ++readingRequest;
		readingAbort = controller;
		reading = true;
		error = null;
		return async ({ result, update }) => {
			if (token !== readingRequest) return;
			readingAbort = null;
			reading = false;
			if (result.type === 'failure') {
				error = (result.data as { errors?: string[] } | undefined)?.errors?.[0] ?? 'That Import could not be read.';
			} else if (result.type === 'error') {
				error = 'That Import could not be read.';
			} else if (result.type === 'success') {
				draft = (result.data as { draft: RecipeDraft }).draft;
				mode = 'editor';
			}
			await update();
		};
	};
</script>

<svelte:head>
	<title>New Recipe · Spirit</title>
</svelte:head>

<main class="stack">
	{#if mode === 'editor'}
		<RecipeEditor
			bind:draft
			ingredients={data.ingredients}
			existingTags={data.tagSuggestions}
			action="?/create"
			heading="New Recipe"
			oncancel={() => goto('/')}
		/>
	{:else}
		<h1>New Recipe</h1>
		<ImportPrompt bind:value={text} {reading} {error} submit={importRecipe} onstart={startFromScratch} oncancel={cancelReading} />
	{/if}
</main>
