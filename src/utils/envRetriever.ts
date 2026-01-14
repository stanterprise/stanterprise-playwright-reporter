export default function getEnvVariables(): Map<string, string> {
  const envValues = process.env;
  const prefix = "STANTERPRISE_META_";
  const filteredEntries = Object.entries(envValues)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => {
      return [key, value || ""] as [string, string];
    });

  return new Map(filteredEntries);
}
