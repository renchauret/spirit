# Browse snapshot is invalidated by database triggers

The browse page reads a single precomputed snapshot row from D1 instead of scanning the recipe tables on every request, because D1's free tier bills per row read and crawlers exhausted it. SQLite triggers on `recipe`, `recipe_line`, `recipe_tag`, `tag` and `ingredient` delete the snapshot and bump a generation counter on any write, so seeds and hand-run SQL invalidate it as reliably as the app does; the next read rebuilds it and only stores the result if the generation is unchanged.

## Considered Options

- **Invalidating from app code**: rejected because writes made outside the app (seed scripts, `wrangler d1 execute`) would leave a stale snapshot.
- **Workers Cache API, KV or isolate memory**: rejected because purges don't reach every colo or isolate, and KV's free read quota is lower than D1's.
