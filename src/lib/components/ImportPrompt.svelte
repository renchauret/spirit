<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';

	let {
		value = $bindable(),
		reading = false,
		error = null,
		submit,
		onstart,
		oncancel
	}: {
		value: string;
		reading?: boolean;
		error?: string | null;
		submit: SubmitFunction;
		onstart: () => void;
		oncancel: () => void;
	} = $props();
</script>

<form class="stack" method="POST" action="?/import" use:enhance={submit}>
	<label for="import-source">Paste a link or the recipe text</label>
	<textarea
		id="import-source"
		name="text"
		class="field source"
		rows="8"
		bind:value
		disabled={reading}
	></textarea>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if reading}
		<p class="reading">Reading the recipe…</p>
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
	{:else}
		<button type="submit" class="btn primary">Import</button>
		<button type="button" class="btn ghost start" onclick={onstart}>Start from scratch</button>
	{/if}
</form>

<style>
	.stack {
		gap: 12px;
	}

	.source {
		resize: vertical;
		min-height: 180px;
	}

	.error {
		margin: 0;
		color: var(--accent);
	}

	.reading {
		margin: 0;
		color: var(--muted);
	}

	.btn {
		justify-content: center;
	}

	.start {
		align-self: center;
	}
</style>
