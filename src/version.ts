import { readFileSync } from "fs";
import { join } from "path";

const path = join(__dirname, "/../package.json");

const version = JSON.parse(readFileSync(path, { encoding: "utf8" }))
  .version as string;

export default version;
