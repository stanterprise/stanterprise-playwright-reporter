export default function getEnvVariables(): Map<string, string> {
  const envValues = process.env;
  const prefix = "STANTERPRISE_META_";
  const filteredEntries = Object.entries(envValues)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => {
      const parsedValue =
        value === "true"
          ? "true"
          : value === "false"
          ? "false"
          : !isNaN(Number(value)) && value !== ""
          ? String(Number(value))
          : value || "";
      return [key, parsedValue] as [string, string];
    });

  return new Map(filteredEntries);
}
