import { readFileSync } from "fs";

const version = JSON.parse(readFileSync("./package.json", { encoding: "utf8" }))
  .version as string;

export default version;
