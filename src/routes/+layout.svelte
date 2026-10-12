<script lang="ts">
	import '../app.css';
	import { untrack } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { setUnitPreference, UnitPreference } from '#lib/units.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	setUnitPreference(new UnitPreference(untrack(() => data.units)));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="wrap">
	{@render children()}
</div>
