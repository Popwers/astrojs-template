import { afterAll, vi } from 'vitest';

// Without isolation a worker runs several files on one module registry: what a file stubbed or
// loaded (the environment, fetch, the clock) must not reach the next one. Registered before the
// file's own hooks, so this runs after its teardown.
afterAll(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.resetModules();
});
