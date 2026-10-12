<script lang="ts">
	import { tick } from 'svelte';
	import { formatLineAmountAsWritten } from '#lib/amounts.ts';
	import type { IngredientOption } from '#lib/ingredient-search.ts';
	import type { DraftLine } from '#lib/recipe-draft.ts';
	import { dropIndex, moveLine } from '#lib/recipe-lines.ts';
	import RecipeLineSheet from './RecipeLineSheet.svelte';

	let { lines = $bindable(), ingredients }: { lines: DraftLine[]; ingredients: IngredientOption[] } = $props();

	let list = $state<HTMLUListElement>();
	let dragging = $state<number | null>(null);
	let sheet = $state<{ editing: number | null } | null>(null);

	const names = $derived(new Map(ingredients.map((i) => [i.id, i.name])));
	const nameOf = (line: DraftLine) => names.get(line.ingredientId) ?? 'Unknown Ingredient';

	function rows() {
		return [...(list?.children ?? [])].map((row) => row.getBoundingClientRect());
	}

	const EDGE = 56;
	let fingerY = 0;
	let frame = 0;

	function follow() {
		if (dragging === null) return;
		const to = dropIndex(rows(), dragging, fingerY);
		if (to !== dragging) {
			moveLine(lines, dragging, to);
			dragging = to;
		}
	}

	function autoScroll() {
		const speed = fingerY < EDGE ? -8 : fingerY > innerHeight - EDGE ? 8 : 0;
		if (speed) {
			scrollBy(0, speed);
			follow();
		}
		frame = requestAnimationFrame(autoScroll);
	}

	$effect(() => () => cancelAnimationFrame(frame));

	function startDrag(event: PointerEvent, at: number) {
		if (event.button !== 0) return;
		event.preventDefault();
		dragging = at;
		fingerY = event.clientY;
		frame = requestAnimationFrame(autoScroll);
	}

	function drag(event: PointerEvent) {
		if (dragging === null) return;
		event.preventDefault();
		fingerY = event.clientY;
		follow();
	}

	function endDrag() {
		dragging = null;
		cancelAnimationFrame(frame);
	}

	async function nudge(event: KeyboardEvent, at: number) {
		const to = event.key === 'ArrowUp' ? at - 1 : event.key === 'ArrowDown' ? at + 1 : null;
		if (to === null || to < 0 || to >= lines.length) return;
		event.preventDefault();
		moveLine(lines, at, to);
		await tick();
		list?.querySelectorAll<HTMLElement>('.handle')[to]?.focus();
	}

	function save(line: DraftLine) {
		if (sheet?.editing == null) lines.push(line);
		else lines[sheet.editing] = line;
	}
</script>

<svelte:window onpointermove={drag} onpointerup={endDrag} onpointercancel={endDrag} />

<ul class="lines" bind:this={list}>
	{#each lines as line, i (line)}
		<li class="line" class:dragging={dragging === i}>
			<button
				type="button"
				class="handle"
				aria-label="Move {nameOf(line)}. Use the up and down arrow keys."
				onpointerdown={(event) => startDrag(event, i)}
				onkeydown={(event) => nudge(event, i)}
			>
				⠿
			</button>
			<button type="button" class="tap" aria-label="Edit {nameOf(line)}" onclick={() => (sheet = { editing: i })}>
				<span class="amt">{formatLineAmountAsWritten(line)}</span>
				<span>
					{nameOf(line)}
					{#if line.note}<span class="muted small">· {line.note}</span>{/if}
				</span>
			</button>
			<button type="button" class="icon-btn" aria-label="Remove {nameOf(line)}" onclick={() => lines.splice(i, 1)}>
				✕
			</button>
		</li>
	{/each}
</ul>
<button type="button" class="btn ghost add" onclick={() => (sheet = { editing: null })}>+ Add Recipe line</button>

{#if sheet}
	<RecipeLineSheet
		line={sheet.editing === null ? null : lines[sheet.editing]}
		{ingredients}
		onsave={save}
		onclose={() => (sheet = null)}
	/>
{/if}

<style>
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.line {
		display: grid;
		grid-template-columns: 32px 1fr 44px;
		align-items: center;
		gap: 6px;
		padding: 8px 0;
		border-bottom: 1px solid var(--line);
		background: var(--bg);
	}

	.line.dragging {
		background: var(--soft);
		border-radius: 10px;
	}

	.handle {
		width: 32px;
		height: 44px;
		display: grid;
		place-items: center;
		color: var(--muted);
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		border: 0;
		background: transparent;
		font-size: 1.2rem;
	}

	.dragging .handle {
		cursor: grabbing;
	}

	.tap {
		text-align: left;
		border: 0;
		background: transparent;
		padding: 6px 0;
		display: grid;
		grid-template-columns: 5.5rem 1fr;
		gap: 10px;
		width: 100%;
		min-width: 0;
	}

	.amt {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	.add {
		align-self: flex-start;
	}
</style>
