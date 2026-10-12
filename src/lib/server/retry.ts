import { spawn } from 'node:child_process';

type RetryOptions = {
	attempts: number;
	delayMs: number;
	sleep?: (ms: number) => Promise<void>;
	log?: (message: string) => void;
};

type Outcome = { code: number } | { error: Error };

function run(command: string, args: string[]): Promise<Outcome> {
	return new Promise((resolve) => {
		const child = spawn(command, args, { stdio: 'inherit' });
		child.on('error', (error) => resolve({ error }));
		child.on('close', (code) => resolve({ code: code ?? 1 }));
	});
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runWithRetries(
	command: string,
	args: string[],
	{ attempts, delayMs, sleep = wait, log = console.error }: RetryOptions
) {
	for (let attempt = 1; ; attempt++) {
		const outcome = await run(command, args);
		if ('error' in outcome) {
			log(`Could not run ${command}: ${outcome.error.message}`);
			return 1;
		}
		const { code } = outcome;
		if (code === 0) return 0;
		if (attempt >= attempts) {
			log(`Attempt ${attempt} of ${attempts} failed with exit code ${code}. Giving up.`);
			return code;
		}
		const delay = delayMs * attempt;
		log(`Attempt ${attempt} of ${attempts} failed with exit code ${code}. Retrying in ${delay / 1000}s.`);
		await sleep(delay);
	}
}
