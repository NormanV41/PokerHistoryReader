#!/usr/bin/env node

import clear from "clear";
import { red } from "chalk";
import { textSync } from "figlet";
import cli from "./cli";
import { isMaster } from "cluster";
import config from "./config";

if (isMaster) {
 // clear();
  console.log(red(textSync("pokerparser", { horizontalLayout: "full" })));
  cli(config.filename, config.isForTournaments);
}
