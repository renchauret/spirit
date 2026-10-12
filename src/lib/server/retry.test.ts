import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runWithRetries } from './retry.ts';

let dir: string;
let attemptsFile: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'retry-test-'));
	attemptsFile = join(dir, 'attempts');
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

function commandFailingTimes(failures: number, exitCode = 3): [string, string[]] {
	const script = `
		const fs = require('node:fs');
		fs.appendFileSync(${JSON.stringify(attemptsFile)}, 'x');
		const attempt = fs.readFileSync(${JSON.stringify(attemptsFile)}, 'utf8').length;
		process.exit(attempt <= ${failures} ? ${exitCode} : 0);
	`;
	return [process.execPath, ['-e', script]];
}

function attemptsMade() {
	try {
		return readFileSync(attemptsFile, 'utf8').length;
	} catch {
		return 0;
	}
}

function recordingRetries() {
	const delays: number[] = [];
	const messages: string[] = [];
	return {
		delays,
		messages,
		options: {
			attempts: 3,
			delayMs: 1000,
			sleep: async (ms: number) => {
				delays.push(ms);
			},
			log: (message: string) => {
				messages.push(message);
			}
		}
	};
}

describe('runWithRetries', () => {
	it('runs a succeeding command once', async () => {
		const [command, args] = commandFailingTimes(0);
		const { options, delays } = recordingRetries();

		expect(await runWithRetries(command, args, options)).toBe(0);
		expect(attemptsMade()).toBe(1);
		expect(delays).toEqual([]);
	});

	it('retries a failing command with a growing backoff until it succeeds', async () => {
		const [command, args] = commandFailingTimes(2);
		const { options, delays, messages } = recordingRetries();

		expect(await runWithRetries(command, args, options)).toBe(0);
		expect(attemptsMade()).toBe(3);
		expect(delays).toEqual([1000, 2000]);
		expect(messages).toEqual([
			'Attempt 1 of 3 failed with exit code 3. Retrying in 1s.',
			'Attempt 2 of 3 failed with exit code 3. Retrying in 2s.'
		]);
	});

	it('stops with the last exit code when every attempt fails', async () => {
		const [command, args] = commandFailingTimes(99, 7);
		const { options, delays, messages } = recordingRetries();

		expect(await runWithRetries(command, args, options)).toBe(7);
		expect(attemptsMade()).toBe(3);
		expect(delays).toEqual([1000, 2000]);
		expect(messages.at(-1)).toBe('Attempt 3 of 3 failed with exit code 7. Giving up.');
	});

	it('fails without retrying when the command cannot be started', async () => {
		const missing = join(dir, 'missing-command');
		const { options, delays, messages } = recordingRetries();

		expect(await runWithRetries(missing, [], options)).toBe(1);
		expect(delays).toEqual([]);
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatch(`Could not run ${missing}:`);
	});
});
