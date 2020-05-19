#!/usr/bin/env node

import clear from "clear";
import { red } from "chalk";
import { textSync } from "figlet";
import cli from "./cli";
import { isMaster } from "cluster";
import config from "./config";
import addAllData from "./hand/database/add-all";

if (isMaster) {
  // clear();
  console.log(red(textSync("pokerparser", { horizontalLayout: "full" })));
  cli(config.filename, config.isForTournaments);
} else {
  // it does not need the filename if is not master
  addAllData(config.filename);
}
