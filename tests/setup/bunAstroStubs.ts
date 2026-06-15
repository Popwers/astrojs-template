/**
 * Bun test preload: resolve Astro virtual modules to their test stubs.
 *
 * `astro:actions` and `astro:env/server` only exist inside an Astro build.
 * Vitest maps them via `vite.config.ts` `test.alias`; Bun has no
 * equivalent in `bunfig.toml`, so this preload registers the same mapping with
 * `mock.module` before any test (or the source it imports) is loaded.
 *
 * `mock.module` is used rather than `tsconfig.json` `paths`: Astro 6 turns
 * tsconfig `paths` into Vite resolve aliases, which would shadow the real
 * `astro:*` virtual modules during `astro build`. And Bun's plugin `onResolve`
 * never fires for `astro:`-scheme specifiers, so a resolver plugin cannot work.
 * Keeping the mapping here scopes it strictly to the Bun test runtime.
 */
import { mock } from 'bun:test';

import * as astroActions from '../stubs/astroActions';
import * as astroEnvServer from '../stubs/astroEnvServer';

void mock.module('astro:actions', () => astroActions);
void mock.module('astro:env/server', () => astroEnvServer);
