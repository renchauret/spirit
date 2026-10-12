<script lang="ts">
	let { signedIn }: { signedIn: boolean } = $props();
</script>

{#if signedIn}
	<nav class="owner-row" aria-label="Owner">
		<form method="POST" action="/signout">
			<button type="submit">Sign out</button>
		</form>
	</nav>
{/if}

<style>
	.owner-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 0.85rem;
		border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
	}

	form {
		display: contents;
	}

	button {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
