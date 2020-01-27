import { readFileSync } from "fs";

export const databaseSecrets = JSON.parse(
  readFileSync("./secrets.json", { encoding: "utf8" })
) as { user: string; password: string; database: string };
