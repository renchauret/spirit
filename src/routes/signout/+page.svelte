<svelte:head>
	<title>Sign out · Spirit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<h1>Sign out</h1>
	<form method="POST">
		<button type="submit">Sign out</button>
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

	button {
		font: inherit;
		padding: 0.6rem 0.75rem;
	}
</style>
