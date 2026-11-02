import { fileURLToPath } from "node:url";

/**
 * Why: strict pnpm layouts hide transitive plugins from consumer config files.
 * @param {string} specifier
 * @returns {string}
 */
function resolvePluginPath(specifier) {
  return fileURLToPath(import.meta.resolve(specifier));
}

export default resolvePluginPath;
