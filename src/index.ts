#!/usr/bin/env node

import { red } from "chalk";
import { textSync } from "figlet";
import cli from "./cli";
import { isMaster } from "cluster";
import config from "./config";
import addAllData from "./hand/database/add-all";
import logger from "./logger";

if (isMaster) {
  logger.log(red(textSync("pokerparser", { horizontalLayout: "full" })));
  cli(config.filename, config.isForTournaments);
} else {
  if (!config.isForTournaments) {
    // it does not need the filename if is not master
    addAllData(config.filename);
  }
}
