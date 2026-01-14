/**
 * Retrieves environment variables with the STANTERPRISE_META_ prefix
 * and returns them as a Map with the prefix stripped from keys.
 * 
 * For example, STANTERPRISE_META_BUILD_ID=123 becomes BUILD_ID=123 in the metadata.
 * 
 * @returns Map of metadata key-value pairs with prefix removed
 */
export function getEnvVariables(): Map<string, string> {
  const envValues = process.env;
  const prefix = "STANTERPRISE_META_";
  const filteredEntries = Object.entries(envValues)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => {
      // Strip the STANTERPRISE_META_ prefix so metadata keys are cleaner
      const strippedKey = key.substring(prefix.length);
      return [strippedKey, value || ""] as [string, string];
    });

  return new Map(filteredEntries);
}
