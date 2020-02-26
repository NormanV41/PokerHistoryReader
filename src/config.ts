import { readFileSync } from "fs";
import { join } from "path";

const path = join(__dirname, "/../secrets.json");

export const databaseSecrets = JSON.parse(
  readFileSync(path, { encoding: "utf8" })
) as { user: string; password: string; database: string };
