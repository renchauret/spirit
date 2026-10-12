<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Spirit</title>
</svelte:head>

<main>
	<h1>Spirit</h1>
	<p>{data.recipeCount} {data.recipeCount === 1 ? 'Recipe' : 'Recipes'} in the database.</p>
</main>
