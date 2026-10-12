<script lang="ts">
	let {
		value = $bindable(),
		label,
		as = 'div',
		multiline = false,
		placeholder = label,
		class: className = '',
		element = $bindable(),
		onenter
	}: {
		value: string;
		label: string;
		as?: string;
		multiline?: boolean;
		placeholder?: string;
		class?: string;
		element?: HTMLElement;
		onenter?: () => void;
	} = $props();

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || multiline || event.isComposing) return;
		event.preventDefault();
		if (onenter) onenter();
		else (event.currentTarget as HTMLElement).blur();
	}
</script>

<svelte:element
	this={as}
	bind:this={element}
	bind:textContent={value}
	contenteditable="plaintext-only"
	role="textbox"
	tabindex="0"
	aria-label={label}
	aria-multiline={multiline}
	data-placeholder={placeholder}
	spellcheck="true"
	class="editable {className}"
	class:multiline
	{onkeydown}
></svelte:element>

<style>
	.editable {
		border-radius: 8px;
		outline: 1px dashed var(--line);
		outline-offset: 3px;
		min-width: 3ch;
		min-height: 1.45em;
		cursor: text;
	}

	.editable:focus {
		outline: 2px solid var(--accent);
	}

	.editable:empty::before {
		content: attr(data-placeholder);
		color: var(--muted);
		opacity: 0.7;
	}

	.multiline {
		white-space: pre-line;
	}
</style>
