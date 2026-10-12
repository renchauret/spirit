import { runWithRetries } from '../src/lib/server/retry.ts';

const [command, ...args] = process.argv.slice(2);

if (!command) {
	console.error('Usage: node scripts/retry.ts <command> [args...]');
	process.exit(1);
}

process.exit(await runWithRetries(command, args, { attempts: 3, delayMs: 5000 }));
