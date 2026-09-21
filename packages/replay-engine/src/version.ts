/**
 * Engine version recorded in every replay result (spec point 19: replay
 * results must store the exact version used). Keep in sync with the package
 * version in package.json.
 */
export const ENGINE_VERSION = "0.0.3";

/**
 * Semantic revision of the replay rules (decision 20). Bump when admission,
 * accounting, coverage, economics or time semantics change, so stored results
 * remain comparable by methodology as well as by engine build.
 */
export const REPLAY_METHODOLOGY_VERSION = "1.2.0";
