<script lang="ts">
	import { tick } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { familyOf, placeholderGlass } from '#lib/browse.ts';
	import { GLASSES, GLASS_LABELS } from '#lib/domain.ts';
	import type { IngredientOption } from '#lib/ingredient-search.ts';
	import type { ResizedPhoto } from '#lib/photo-resize.ts';
	import { PHOTO_VARIANTS } from '#lib/photos.ts';
	import type { RecipeDraft } from '#lib/recipe-draft.ts';
	import Editable from './Editable.svelte';
	import GlassPlaceholder from './GlassPlaceholder.svelte';
	import PhotoPicker from './PhotoPicker.svelte';
	import RecipeLineEditor from './RecipeLineEditor.svelte';
	import TagSheet from './TagSheet.svelte';

	let {
		draft = $bindable(),
		ingredients,
		existingTags,
		action,
		photo = null,
		photoUpload = false,
		oncancel,
		onsaved
	}: {
		draft: RecipeDraft;
		ingredients: IngredientOption[];
		existingTags: string[];
		action: string;
		photo?: string | null;
		photoUpload?: boolean;
		oncancel: () => void;
		onsaved: () => void;
	} = $props();

	let saving = $state(false);
	let errors = $state<string[]>([]);
	let tagSheetOpen = $state(false);
	let newPhoto = $state<ResizedPhoto | null>(null);
	let stepElements = $state<HTMLElement[]>([]);

	const family = $derived(familyOf(draft.tags));
	const familyGlass = $derived(placeholderGlass(null, family));

	async function addStep(at = draft.method.length) {
		draft.method.splice(at, 0, '');
		await tick();
		stepElements[at]?.focus();
	}

	function removeStep(at: number) {
		draft.method.splice(at, 1);
		stepElements.length = draft.method.length;
	}

	function removeTag(at: number) {
		draft.tags.splice(at, 1);
	}

	function addTag(tag: string) {
		if (!draft.tags.includes(tag)) draft.tags.push(tag);
	}

	const save: SubmitFunction = ({ formData }) => {
		if (newPhoto) {
			formData.set(PHOTO_VARIANTS.card.field, newPhoto.card, 'card');
			formData.set(PHOTO_VARIANTS.page.field, newPhoto.page, 'page');
		}
		saving = true;
		errors = [];
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'failure') {
				errors = (result.data?.errors as string[] | undefined) ?? ['That edit could not be saved.'];
			} else if (result.type === 'error') {
				errors = [result.error?.message ?? 'That edit could not be saved.'];
			} else {
				await update();
				if (result.type === 'success') onsaved();
			}
		};
	};
</script>

<form class="mode" method="POST" {action} use:enhance={save}>
	<input type="hidden" name="recipe" value={JSON.stringify(draft)} />
	<button type="button" class="btn" disabled={saving} onclick={oncancel}>Cancel</button>
	<strong>Editing</strong>
	<button type="submit" class="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Done'}</button>
</form>

{#if errors.length}
	<div class="errors" role="alert">
		{#each errors as message (message)}
			<p>{message}</p>
		{/each}
	</div>
{/if}

<div class="stack">
	{#if photoUpload}
		<PhotoPicker bind:value={newPhoto} {photo} name={draft.name} glass={draft.glass || familyGlass} {family} disabled={saving} />
	{:else}
		<GlassPlaceholder glass={draft.glass || familyGlass} {family} hero />
	{/if}

	<Editable as="h1" label="Name" bind:value={draft.name} />

	<div class="chips">
		{#each draft.tags as tag, i (tag)}
			<button type="button" class="chip tag" aria-label="Remove Tag {tag}" onclick={() => removeTag(i)}>
				{tag} <span aria-hidden="true">✕</span>
			</button>
		{/each}
		<button type="button" class="chip tag" onclick={() => (tagSheetOpen = true)}>+ Tag</button>
	</div>

	<Editable as="p" label="Description" multiline bind:value={draft.description} />

	<section class="stack section">
		<h2>Recipe lines</h2>
		<RecipeLineEditor bind:lines={draft.lines} {ingredients} />
	</section>

	<section class="stack section">
		<h2>Method</h2>
		{#if draft.method.length}
			<ol class="method">
				{#each draft.method as _, i (i)}
					<li>
						<div class="step-row">
							<Editable
								label="Method step {i + 1}"
								placeholder="Describe this step"
								class="step"
								bind:value={draft.method[i]}
								bind:element={stepElements[i]}
								onenter={() => addStep(i + 1)}
							/>
							<button type="button" class="icon-btn" aria-label="Remove step {i + 1}" onclick={() => removeStep(i)}>
								✕
							</button>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
		<button type="button" class="btn ghost add" onclick={() => addStep()}>+ Add step</button>
	</section>

	<dl class="kv">
		<dt><label for="glass">Glass</label></dt>
		<dd>
			<select id="glass" class="field" bind:value={draft.glass}>
				<option value="">Default ({GLASS_LABELS[familyGlass]})</option>
				{#each GLASSES as glass (glass)}
					<option value={glass}>{GLASS_LABELS[glass]}</option>
				{/each}
			</select>
		</dd>
		<dt>Garnish</dt>
		<Editable as="dd" label="Garnish" bind:value={draft.garnish} />
		<dt>Ice/serve</dt>
		<Editable as="dd" label="Ice/serve" bind:value={draft.iceServe} />
		<dt>Source</dt>
		<Editable as="dd" label="Source" bind:value={draft.source} />
	</dl>

	<section class="stack section">
		<h2>Owner notes</h2>
		<Editable as="p" label="Owner notes" placeholder="Only you can see these" multiline bind:value={draft.ownerNotes} />
	</section>
</div>

{#if tagSheetOpen}
	<TagSheet tags={draft.tags} existing={existingTags} onadd={addTag} onclose={() => (tagSheetOpen = false)} />
{/if}

<style>
	.mode {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 5;
		background: var(--bg);
		padding-block: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--line);
		margin-bottom: 4px;
	}

	.errors {
		border: 1px solid var(--accent);
		background: var(--soft);
		border-radius: 10px;
		padding: 8px 12px;
	}

	.errors p {
		margin: 0;
	}

	.section {
		gap: 6px;
	}

	.add {
		align-self: flex-start;
	}

	.tag {
		background: var(--soft);
		border: 0;
		color: var(--fg);
	}

	.method {
		margin: 0;
		padding-left: 1.3rem;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.step-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.step-row > :global(.step) {
		flex: 1;
	}

	.stack > :global(p),
	.section > :global(p) {
		margin: 0;
	}

	.kv {
		display: grid;
		grid-template-columns: 6rem 1fr;
		align-items: center;
		gap: 10px 12px;
		margin: 0;
	}

	.kv dt {
		color: var(--muted);
	}

	.kv dd,
	.kv > :global(dd) {
		margin: 0;
		min-width: 0;
	}
</style>
