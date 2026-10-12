<script lang="ts">
	let { count, onclick }: { count: number; onclick: () => void } = $props();
</script>

<button type="button" class="chip" class:sel={count > 0} aria-haspopup="dialog" {onclick}>
	{count ? `Filter · ${count}` : 'Filter'}
</button>

<style>
	button {
		flex: none;
	}
</style>
