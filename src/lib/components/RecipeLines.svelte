<script lang="ts">
	import { formatLineAmount } from '#lib/amounts.ts';
	import type { RecipeLineView } from '#lib/server/recipes.ts';

	let { lines, highlighted = [] }: { lines: RecipeLineView[]; highlighted?: number[] } = $props();
</script>

<ul class="lines">
	{#each lines as line, i (i)}
		<li class:hit={highlighted.includes(i)}>
			<span class="amt">{formatLineAmount(line)}</span>
			<span>
				{line.ingredient}
				{#if line.note}<span class="muted small">· {line.note}</span>{/if}
			</span>
		</li>
	{/each}
</ul>

<style>
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.lines li {
		display: grid;
		grid-template-columns: 6rem 1fr;
		gap: 10px;
		padding: 9px 0;
		border-bottom: 1px solid var(--line);
	}

	.lines li.hit {
		background: var(--soft);
		border-radius: 8px;
		padding-inline: 6px;
	}

	.amt {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
</style>
