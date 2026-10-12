<script lang="ts">
	import type { Snippet } from 'svelte';
	import { GLASS_LABELS, type FamilyTag, type Glass } from '#lib/domain.ts';

	let {
		glass,
		family,
		hero = false,
		children
	}: { glass: Glass; family: FamilyTag | null; hero?: boolean; children?: Snippet } = $props();

	const fill = $derived(`var(--family-${family ? family.replace(' ', '-') : 'none'})`);
</script>

<div class="ph" class:hero data-family={family ?? 'none'}>
	<svg
		viewBox="0 0 100 100"
		role={hero ? 'img' : undefined}
		aria-label={hero ? `${GLASS_LABELS[glass]} glass` : undefined}
		aria-hidden={!hero}
	>
		<g {fill}>
			{#if glass === 'coupe'}
				<path class="liq" d="M27 35 Q50 60 73 35 Z" />
				<path class="g" d="M20 30 L80 30 Q72 58 50 60 Q28 58 20 30 Z" />
				<path class="g" d="M50 60 L50 84 M36 86 Q50 82 64 86" />
			{:else if glass === 'cocktail'}
				<path class="liq" d="M28 31 L72 31 L50 54 Z" />
				<path class="g" d="M18 24 L82 24 L50 58 Z" />
				<path class="g" d="M50 58 L50 84 M36 86 Q50 82 64 86" />
				<circle class="ice" cx="58" cy="28" r="3" />
			{:else if glass === 'rocks'}
				<path class="liq" d="M31.4 52 L33.4 81 L66.6 81 L68.6 52 Z" />
				<path class="g" d="M29 34 L71 34 L67.5 84 L32.5 84 Z" />
				<path class="g" d="M33 80 L67 80" />
				<rect class="ice" x="38" y="44" width="16" height="16" rx="2" transform="rotate(-10 46 52)" />
			{:else if glass === 'collins'}
				<path class="liq" d="M38.3 34 L39 85 L61 85 L61.7 34 Z" />
				<path class="g" d="M36 14 L64 14 L63 88 L37 88 Z" />
				<path class="g" d="M55 6 L48 60" />
				<rect class="ice" x="42" y="44" width="12" height="12" rx="2" />
				<rect class="ice" x="45" y="60" width="12" height="12" rx="2" transform="rotate(12 51 66)" />
			{:else if glass === 'highball'}
				<path class="liq" d="M34.6 40 L35.6 85 L64.4 85 L65.4 40 Z" />
				<path class="g" d="M33 22 L67 22 L65.5 88 L34.5 88 Z" />
				<rect class="ice" x="40" y="48" width="13" height="13" rx="2" />
				<rect class="ice" x="47" y="64" width="13" height="13" rx="2" transform="rotate(-8 53 70)" />
			{:else if glass === 'flute'}
				<path class="liq" d="M43.4 26 Q42.5 52 50 58 Q57.5 52 56.6 26 Z" />
				<path class="g" d="M42 12 L58 12 Q60 52 50 60 Q40 52 42 12 Z" />
				<path class="g" d="M50 60 L50 86 M38 88 Q50 84 62 88" />
			{:else if glass === 'hurricane'}
				<path
					class="liq"
					d="M38 36 Q33 46 41 54 Q35 64 41 74 L59 74 Q65 64 59 54 Q67 46 62 36 Z"
				/>
				<path
					class="g"
					d="M36 16 Q30 40 40 52 Q33 66 40 78 L60 78 Q67 66 60 52 Q70 40 64 16 Z"
				/>
				<path class="g" d="M50 78 L50 86 M38 88 Q50 84 62 88" />
			{/if}
		</g>
	</svg>
	{@render children?.()}
</div>

<style>
	.ph {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1 / 1;
		background: var(--soft);
	}

	.ph[data-family='sour'] {
		background: color-mix(in oklab, var(--soft) 70%, #e8d36a 30%);
	}
	.ph[data-family='highball'] {
		background: color-mix(in oklab, var(--soft) 60%, #8fc6d9 40%);
	}
	.ph[data-family='old fashioned'] {
		background: color-mix(in oklab, var(--soft) 55%, #c98a3a 45%);
	}
	.ph[data-family='martini'] {
		background: color-mix(in oklab, var(--soft) 60%, #b9c2a3 40%);
	}
	.ph[data-family='daisy'] {
		background: color-mix(in oklab, var(--soft) 60%, #e59a7a 40%);
	}
	.ph[data-family='flip'] {
		background: color-mix(in oklab, var(--soft) 55%, #e9dcc0 45%);
	}
	.ph[data-family='tiki'] {
		background: color-mix(in oklab, var(--soft) 58%, #7fd0bf 42%);
	}
	.ph[data-family='sparkling'] {
		background: color-mix(in oklab, var(--soft) 50%, #ddc47e 50%);
	}

	.hero {
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: 14px;
	}

	svg {
		width: 72%;
		height: 72%;
	}

	.hero svg {
		width: 46%;
		height: 82%;
	}

	svg .g {
		fill: none;
		stroke: var(--glass-ink);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.8;
	}

	svg .liq {
		stroke: none;
		opacity: 0.9;
	}

	svg .ice {
		fill: none;
		stroke: var(--glass-ink);
		stroke-width: 1.4;
		opacity: 0.45;
	}
</style>
