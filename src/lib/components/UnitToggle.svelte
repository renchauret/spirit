<script lang="ts">
	import type { UnitSystem } from '#lib/amounts.ts';
	import { getUnitPreference } from '#lib/units.svelte.ts';

	const units = getUnitPreference();
	const systems: UnitSystem[] = ['oz', 'ml'];
</script>

<div class="toggle" role="group" aria-label="Units">
	{#each systems as system (system)}
		<button type="button" aria-pressed={units.system === system} onclick={() => units.choose(system)}>
			{system}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 999px;
		overflow: hidden;
		background: var(--surface);
		flex: none;
	}

	button {
		border: 0;
		background: transparent;
		padding: 6px 12px;
		min-height: 36px;
		font-family: var(--mono);
		font-size: 0.85rem;
	}

	button[aria-pressed='true'] {
		background: var(--fg);
		color: var(--bg);
	}
</style>
