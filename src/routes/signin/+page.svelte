<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Sign in · Spirit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<h1>Sign in</h1>
	<form method="POST">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />
		<label>
			Email
			<input
				type="email"
				name="email"
				autocomplete="username"
				required
				value={form?.email ?? ''}
			/>
		</label>
		<label>
			Password
			<input type="password" name="password" autocomplete="current-password" required />
		</label>
		{#if form?.message}
			<p role="alert">{form.message}</p>
		{/if}
		<button type="submit">Sign in</button>
	</form>
</main>

<style>
	main {
		max-width: 22rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	form {
		display: grid;
		gap: 1rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	input,
	button {
		font: inherit;
		padding: 0.6rem 0.75rem;
	}
</style>
