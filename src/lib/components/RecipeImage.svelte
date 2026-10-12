<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FamilyTag, Glass } from '#lib/domain.ts';
	import GlassPlaceholder from './GlassPlaceholder.svelte';

	let {
		photo,
		name,
		glass,
		family,
		hero = false,
		children
	}: {
		photo: string | null;
		name: string;
		glass: Glass;
		family: FamilyTag | null;
		hero?: boolean;
		children?: Snippet;
	} = $props();
</script>

{#if photo}
	<div class="photo" class:hero>
		<img src={photo} alt={hero ? `Photo of ${name}` : ''} loading={hero ? 'eager' : 'lazy'} decoding="async" />
		{@render children?.()}
	</div>
{:else}
	<GlassPlaceholder {glass} {family} {hero}>{@render children?.()}</GlassPlaceholder>
{/if}

<style>
	.photo {
		position: relative;
		aspect-ratio: 1 / 1;
		background: var(--soft);
		overflow: hidden;
	}

	.hero {
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: 14px;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
