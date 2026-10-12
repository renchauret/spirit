<script lang="ts">
	let { count, onclick }: { count: number; onclick: () => void } = $props();
</script>

<button type="button" class="btn" class:sel={count > 0} aria-haspopup="dialog" {onclick}>
	{count ? `Filter · ${count}` : 'Filter'}
</button>

<style>
	button {
		flex: none;
	}

	button.sel {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: var(--accent);
	}
</style>
