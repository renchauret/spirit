import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import {
	countOwnerAccountsSql,
	resetOwnerPasswordSql,
	seedOwnerSql
} from '../src/lib/server/auth/owner-account.ts';
import { hashPassword } from '../src/lib/server/auth/password.ts';

const MIN_PASSWORD_LENGTH = 12;

const usage = `Usage:
  npm run owner -- seed  --email <email> [--remote]
  npm run owner -- reset --email <email> [--remote]

Prompts for the password, or reads it from stdin when piped.
Runs against the local D1 database unless --remote is given.`;

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

async function readPassword(prompt: string): Promise<string> {
	if (!process.stdin.isTTY) {
		const lines = createInterface({ input: process.stdin });
		for await (const line of lines) return line;
		return '';
	}
	process.stdout.write(prompt);
	const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
	(rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = () => {};
	const answer = await new Promise<string>((resolve) => rl.question('', resolve));
	rl.close();
	process.stdout.write('\n');
	return answer;
}

async function askForPassword(): Promise<string> {
	const password = await readPassword('Password: ');
	if (password.length < MIN_PASSWORD_LENGTH) {
		fail(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
	}
	if (process.stdin.isTTY && (await readPassword('Repeat password: ')) !== password) {
		fail('The passwords do not match.');
	}
	return password;
}

function execute(sql: string, remote: boolean) {
	const result = spawnSync(
		'npx',
		['wrangler', 'd1', 'execute', 'spirit', remote ? '--remote' : '--local', '--json', '--command', sql],
		{ encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
	);
	if (result.status !== 0) fail(`wrangler d1 execute failed.\n${result.stdout}`);
	return JSON.parse(result.stdout) as { results: Record<string, unknown>[] }[];
}

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: { email: { type: 'string' }, remote: { type: 'boolean', default: false } }
});
const [command] = positionals;
const email = values.email?.trim();

if ((command !== 'seed' && command !== 'reset') || !email) fail(usage);

const where = values.remote ? 'production' : 'local';

if (command === 'reset') {
	const [{ results }] = execute(countOwnerAccountsSql(email), values.remote);
	if (results[0]?.owners !== 1) fail(`No Owner account with the email ${email} in the ${where} database.`);
}

const passwordHash = await hashPassword(await askForPassword());

if (command === 'seed') {
	execute(seedOwnerSql({ email, passwordHash }), values.remote);
	console.log(`Created the Owner account ${email} in the ${where} database.`);
} else {
	execute(resetOwnerPasswordSql({ email, passwordHash }), values.remote);
	console.log(`Reset the password for ${email} in the ${where} database and signed it out everywhere.`);
}
