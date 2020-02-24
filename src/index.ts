#!/usr/bin/env node

import clear from "clear";
import { red } from "chalk";
import { textSync } from "figlet";
import program from "commander";
import cli from "./cli";
import version from "./version";

clear();
console.log(red(textSync("pokerparser", { horizontalLayout: "full" })));

program
  .version(version)
  .arguments("<file>")
  .description(
    "An application that parses hand histories and tournament summaries of Pokerstars, it saves it to a mysql database"
  )
  .option(
    "-t, --tournament",
    "It will parse tournament summaries, if this option is not s"
  )
  .parse(process.argv);

cli(program.args[0], program.tournament);
