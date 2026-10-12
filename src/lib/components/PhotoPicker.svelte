<script lang="ts">
	import type { FamilyTag, Glass } from '#lib/domain.ts';
	import { resizePhoto, type ResizedPhoto } from '#lib/photo-resize.ts';
	import RecipeImage from './RecipeImage.svelte';

	let {
		value = $bindable(null),
		photo,
		name,
		glass,
		family,
		disabled = false
	}: {
		value: ResizedPhoto | null;
		photo: string | null;
		name: string;
		glass: Glass;
		family: FamilyTag | null;
		disabled?: boolean;
	} = $props();

	let preparing = $state(false);
	let error = $state('');

	let preview = $state<string | null>(null);

	$effect(() => {
		if (!value) return;
		const url = URL.createObjectURL(value.page);
		preview = url;
		return () => {
			URL.revokeObjectURL(url);
			preview = null;
		};
	});

	async function choose(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		preparing = true;
		error = '';
		try {
			value = await resizePhoto(file);
		} catch (e) {
			error = e instanceof Error ? e.message : 'That photo could not be prepared.';
		} finally {
			preparing = false;
		}
	}
</script>

<div class="picker">
	<RecipeImage photo={preview ?? photo} {name} {glass} {family} hero>
		<label class="target">
			<span class="sr">{preview ?? photo ? 'Replace photo' : 'Add photo'}</span>
			<input class="sr" type="file" accept="image/*" disabled={disabled || preparing} onchange={choose} />
		</label>
		<span class="badge" aria-hidden="true">
			{preparing ? 'Preparing…' : preview ?? photo ? 'Replace photo' : 'Add photo'}
		</span>
	</RecipeImage>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.target {
		position: absolute;
		inset: 0;
		cursor: pointer;
		border-radius: 14px;
	}

	.target:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.badge {
		position: absolute;
		right: 10px;
		bottom: 10px;
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 6px 12px;
		font-size: 0.85rem;
		pointer-events: none;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.error {
		margin: 0;
		color: var(--accent);
	}
</style>
