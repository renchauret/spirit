type OwnerCredentials = {
	email: string;
	passwordHash: string;
};

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function seedOwnerSql({ email, passwordHash }: OwnerCredentials): string {
	const userId = crypto.randomUUID();
	const accountId = crypto.randomUUID();
	const now = Date.now();
	return [
		`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (${quote(userId)}, 'Owner', ${quote(normalizeEmail(email))}, 1, ${now}, ${now});`,
		`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (${quote(accountId)}, ${quote(userId)}, 'credential', ${quote(userId)}, ${quote(passwordHash)}, ${now}, ${now});`
	].join('\n');
}

export function resetOwnerPasswordSql({ email, passwordHash }: OwnerCredentials): string {
	const owner = `(SELECT id FROM user WHERE email = ${quote(normalizeEmail(email))})`;
	return [
		`UPDATE account SET password = ${quote(passwordHash)}, updated_at = ${Date.now()} WHERE provider_id = 'credential' AND user_id = ${owner};`,
		`DELETE FROM session WHERE user_id = ${owner};`
	].join('\n');
}

export function countOwnerAccountsSql(email: string): string {
	return `SELECT COUNT(*) AS owners FROM user WHERE email = ${quote(normalizeEmail(email))};`;
}
