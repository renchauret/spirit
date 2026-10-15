<script lang="ts">
	import { FAMILY_TAGS } from '#lib/domain.ts';
	import {
		browseHref,
		toggleFavorites,
		toggleIngredient,
		toggleTag,
		type FilterSection,
		type RecipeFilter
	} from '#lib/filter.ts';
	import { swipeDown } from '#lib/swipe-down.ts';

	let {
		open = $bindable(),
		filter,
		sections,
		count
	}: { open: boolean; filter: RecipeFilter; sections: FilterSection[]; count: number } = $props();

	let dialog: HTMLDialogElement;

	const swipe = swipeDown(() => (open = false));

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) open = false;
	}
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	aria-label="Filter"
	onclose={() => (open = false)}
	onclick={closeOnBackdrop}
	{@attach swipe}
>
	<div class="body" data-sveltekit-replacestate data-sveltekit-noscroll data-sveltekit-keepfocus>
		<div class="grip" aria-hidden="true"></div>
		<div class="head">
			<h3>Filter</h3>
			<button type="button" class="btn primary" onclick={() => (open = false)}>Show {count}</button>
		</div>

		<div class="chips">
			<a
				class="chip"
				class:on={filter.favorites}
				aria-current={filter.favorites ? 'true' : undefined}
				rel="nofollow"
				href={browseHref(toggleFavorites(filter))}>★ House favorites</a
			>
		</div>

		<section>
			<h2>Family</h2>
			<div class="chips">
				{#each FAMILY_TAGS as tag (tag)}
					{@const picked = filter.tags.includes(tag)}
					<a class="chip" class:sel={picked} aria-current={picked ? 'true' : undefined} rel="nofollow" href={browseHref(toggleTag(filter, tag))}
						>{tag}</a
					>
				{/each}
			</div>
		</section>

		{#each sections as section (section.type)}
			<section>
				<h2>{section.type}</h2>
				<div class="chips">
					{#each section.ingredients as ingredient (ingredient.id)}
						{@const picked = filter.ingredients.includes(ingredient.id)}
						<a
							class="chip"
							class:sel={picked}
							aria-current={picked ? 'true' : undefined}
							rel="nofollow"
							href={browseHref(toggleIngredient(filter, ingredient.id))}>{ingredient.name}</a
						>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</dialog>

<style>
	.sheet {
		position: fixed;
		inset: auto 0 0 0;
		width: 100%;
		max-width: 560px;
		max-height: 86%;
		margin: 0 auto;
		padding: 0;
		border: 0;
		border-radius: 18px 18px 0 0;
		background: var(--bg);
		color: var(--fg);
		overflow: auto;
		overscroll-behavior: contain;
	}

	.sheet::backdrop {
		background: rgb(0 0 0 / 0.35);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
	}

	.grip {
		width: 40px;
		height: 5px;
		border-radius: 3px;
		background: var(--line);
		align-self: center;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	section .chips {
		margin-top: 6px;
	}

	.primary {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: var(--accent);
		font-weight: 700;
	}

	.on {
		background: var(--fg);
		color: var(--bg);
		border-color: var(--fg);
	}

	@media (prefers-reduced-motion: no-preference) {
		.sheet[open] {
			animation: up 0.18s ease-out;
			transition: transform 0.2s ease-out;
		}

		@keyframes up {
			from {
				transform: translateY(24px);
				opacity: 0.6;
			}
		}
	}
</style>
