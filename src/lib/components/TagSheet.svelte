<script lang="ts">
	import { normalizeTag, suggestTags } from '#lib/recipe-draft.ts';
	import BottomSheet from './BottomSheet.svelte';

	let {
		tags,
		existing,
		onadd,
		onclose
	}: { tags: string[]; existing: string[]; onadd: (tag: string) => void; onclose: () => void } = $props();

	let typed = $state('');
	const suggestions = $derived(suggestTags(existing, tags, typed));
	const canAdd = $derived(normalizeTag(typed) !== '');

	function focus(input: HTMLInputElement) {
		input.focus();
	}

	function add(tag: string) {
		if (normalizeTag(tag)) onadd(normalizeTag(tag));
		onclose();
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		if (canAdd) add(typed);
	}
</script>

<BottomSheet label="Add Tag" {onclose}>
	<h3>Add Tag</h3>
	<form class="stack" {onsubmit}>
		<input
			class="field"
			aria-label="Tag"
			placeholder="e.g. sour, tiki, stirred"
			autocomplete="off"
			autocapitalize="none"
			enterkeyhint="done"
			bind:value={typed}
			{@attach focus}
		/>
		{#if suggestions.length}
			<div class="chips">
				{#each suggestions as tag (tag)}
					<button type="button" class="chip" onclick={() => add(tag)}>{tag}</button>
				{/each}
			</div>
		{/if}
		<button type="submit" class="btn primary" disabled={!canAdd}>Add</button>
	</form>
</BottomSheet>

<style>
	.stack {
		gap: 14px;
	}

	.btn {
		justify-content: center;
	}

	.chip {
		background: var(--soft);
		border: 0;
		color: var(--fg);
	}
</style>
