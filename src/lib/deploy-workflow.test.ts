import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

type Step = { name?: string; run?: string; env?: Record<string, string> };
type Job = {
	needs?: string | string[];
	if?: string;
	concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
	steps: Step[];
};

const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as {
	jobs: Record<string, Job>;
};

const deploy = workflow.jobs.deploy;

function needs(job: Job): string[] {
	if (!job.needs) return [];
	return Array.isArray(job.needs) ? job.needs : [job.needs];
}

function stepRunning(job: Job, command: string): Step {
	const step = job.steps.find((candidate) => candidate.run === command);
	expect(step, `a step runs \`${command}\``).toBeDefined();
	return step!;
}

describe('deploy workflow', () => {
	it('has a deploy job', () => {
		expect(deploy).toBeDefined();
	});

	it('runs only on a push to main, never on a pull request', () => {
		expect(deploy.if).toContain("github.event_name == 'push'");
		expect(deploy.if).toContain("github.ref == 'refs/heads/main'");
	});

	it('runs only after the checks and tests pass', () => {
		expect(needs(deploy)).toContain('checks-and-tests');
	});

	it('serialises deploys without cancelling one that has already started', () => {
		expect(deploy.concurrency?.group).toBeTruthy();
		expect(deploy.concurrency?.['cancel-in-progress']).toBe(false);
	});

	it('deploys with npm run deploy and the Cloudflare credentials', () => {
		const step = stepRunning(deploy, 'npm run deploy');
		expect(step.env).toMatchObject({
			CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
			CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}'
		});
	});
});
