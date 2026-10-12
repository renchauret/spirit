# Spirit

A phone-first website of cocktail Recipes, served at https://spirit.renchauret.com. Domain language lives in [`CONTEXT.md`](CONTEXT.md).

## Stack

- SvelteKit with `@sveltejs/adapter-cloudflare`, running on Cloudflare Workers. Every page is server-rendered on each request and sent with `Cache-Control: no-store`.
- D1 through Drizzle ORM. Drizzle generates the migrations and Wrangler applies them. No FTS5 or other virtual tables, because they break `wrangler d1 export`.
- R2 for photos.
- Better Auth email + password for the Owner, with users, sessions and sign-in rate limits stored in D1. Sign-up is disabled, and the Owner account is created with a command (see [Owner account](#owner-account)).
- Vitest for tests. D1-backed tests run against a real local D1 database from Wrangler's `getPlatformProxy`.

Cloudflare configuration is in [`wrangler.jsonc`](wrangler.jsonc):

| Binding | Resource | Name |
| --- | --- | --- |
| `DB` | D1 database | `spirit` |
| `PHOTOS` | R2 bucket | `spirit-photos` |
| custom domain | Workers route | `spirit.renchauret.com` on the renchauret.com zone |
| `BETTER_AUTH_SECRET` | Worker secret | signs Owner session cookies |

Server code reads bindings with `import { env } from 'cloudflare:workers'`.

### Why Wrangler and not the `cf` CLI

The project would prefer `cf` with a `cloudflare.config.ts`, but `cf` 1.0.0-beta.14 refuses SvelteKit projects. Running `cf init .` in this app detects SvelteKit and stops with:

> cf does not support SvelteKit projects yet. You can still use Wrangler to develop and deploy this project.

So this project uses Wrangler (`wrangler.jsonc`) for local development, migrations and deploys. Because there is a Wrangler config and no `cloudflare.config.ts`, never run `cf dev`, `cf build`, `cf deploy` or `cf init` here. Ordinary `cf` API commands that don't build, such as `cf d1 list`, are fine. Revisit this when `cf` supports SvelteKit, using `cf migrate`.

## Develop locally

```sh
npm install
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)" > .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run owner -- seed --email <email>
npm run dev
```

`.dev.vars` holds local secrets and is ignored by git. `npm run db:seed:local` replaces every Recipe, Ingredient and Tag in the local database with the small fixture in [`seed/fixture.json`](seed/fixture.json).

`npm run dev` serves the app with local D1 and R2 simulations stored in `.wrangler/state`. To run the built Worker in the Workers runtime instead, use `npm run preview`.

## Checks

```sh
npm run check
npm test
npm run build
```

`worker-configuration.d.ts` holds the binding and runtime types generated from `wrangler.jsonc`. After changing `wrangler.jsonc`, regenerate it with `npm run cf-typegen` and commit it. The script removes the previous build first, because Wrangler adds a type import of the built Worker when one exists, and that makes `npm run check` type-check the build output.

## Database migrations

1. Change the schema in [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts).
2. Generate a migration into `drizzle/`:

   ```sh
   npm run db:generate -- --name <short_description>
   ```

3. Apply it to the local database:

   ```sh
   npm run db:migrate:local
   ```

4. Apply it to the production database. `npm run deploy` does this for you, but it can also be run on its own:

   ```sh
   npm run db:migrate:remote
   ```

Wrangler reads migrations from `drizzle/`, set by `migrations_dir` in `wrangler.jsonc`, and records applied ones in the `d1_migrations` table.

## Seed data

A seed file is JSON with an Ingredient catalog and a list of Recipes. [`seed/fixture.json`](seed/fixture.json) is a small example.

- **Ingredient:** `name`, plus `type` (an Ingredient type) and/or `parent` (the name of its Parent Ingredient). A child without a `type` takes its parent's.
- **Recipe:** `name` and `lines` are required. Optional: `favorite`, `tags`, `glass` (`coupe`, `cocktail`, `rocks`, `collins`, `highball`, `flute`, `hurricane`), `method` (a list of instructions), `garnish`, `iceServe`, `description` and `source`. Owner notes are rejected, because the repo is public.
- **Recipe line:** `ingredient` (a catalog name), `unit`, and optionally `amount` (a number, or `[min, max]` for a range) and `note`.

`scripts/seed-sql.ts` checks a seed file and turns it into SQL for `wrangler d1 execute`:

```sh
node scripts/seed-sql.ts seed/fixture.json --out .wrangler/seed/fixture.sql
npx wrangler d1 execute spirit --remote --file .wrangler/seed/fixture.sql
```

Without `--replace`, loading fails if any of the seeded rows already exist. `--replace` first deletes every Recipe, Recipe line, Tag and Ingredient, including anything the Owner has edited, so use it on production only when that is intended.

## Owner account

The Owner signs in at `/signin`, which nothing links to. After signing in, they return to the page named in `?redirectTo=`, or the page they came from. Sessions last 30 days and renew whenever the site is used. Sign-in is limited to 5 attempts per address every 15 minutes.

There is no sign-up. Create the Owner account with:

```sh
npm run owner -- seed --email <email>
```

Nothing is ever emailed, so the email is only a login ID. If the password is forgotten, set a new one with:

```sh
npm run owner -- reset --email <email>
```

`npm run owner` runs a TypeScript script directly, so it needs Node 22.18 or later. Both commands prompt for the password (at least 12 characters), or read it from stdin when piped. They run against the local database; add `--remote` to run them against production. A reset also signs the Owner out everywhere.

Server code that writes data must call `requireOwner(locals)` from `src/lib/server/auth/guard.ts`, which rejects requests without an Owner session with a 401. Hiding controls is not access control.

## Deploy

```sh
npm run deploy
```

This builds the app, applies pending migrations to the production D1 database, and deploys the Worker. Wrangler attaches the `spirit.renchauret.com` custom domain on deploy, creating its DNS record and certificate.

You must be signed in to Wrangler (`npx wrangler login`), or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

### One-time setup

Do this once before the first deploy:

1. Create the D1 database:

   ```sh
   npx wrangler d1 create spirit
   ```

2. Copy the `database_id` it prints into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`, and commit it.
3. Create the R2 bucket for photos:

   ```sh
   npx wrangler r2 bucket create spirit-photos
   ```

4. Make sure `spirit.renchauret.com` has no existing DNS record in the renchauret.com zone, because Wrangler creates it.
5. Set the secret that signs session cookies:

   ```sh
   openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET
   ```

6. Deploy:

   ```sh
   npm run deploy
   ```

7. Create the Owner account in production:

   ```sh
   npm run owner -- seed --email <email> --remote
   ```

## Logs

```sh
npx wrangler tail spirit
```
