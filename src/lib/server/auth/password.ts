const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		key,
		KEY_BITS
	);
	return new Uint8Array(bits);
}

function equalInConstantTime(a: Uint8Array, b: Uint8Array) {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
	return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const derived = await derive(password, salt, ITERATIONS);
	return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(derived)].join('$');
}

export async function verifyPassword({
	hash,
	password
}: {
	hash: string;
	password: string;
}): Promise<boolean> {
	const [algorithm, iterations, salt, expected] = hash.split('$');
	const iterationCount = Number(iterations);
	if (algorithm !== ALGORITHM || !Number.isInteger(iterationCount) || !salt || !expected) {
		return false;
	}
	try {
		const derived = await derive(password, fromBase64(salt), iterationCount);
		return equalInConstantTime(derived, fromBase64(expected));
	} catch {
		return false;
	}
}
