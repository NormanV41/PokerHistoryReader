import Configstore from "configstore";
import { join } from "path";
import { readFileSync } from "fs";
import program from "commander";
import version from "./version";

program
  .version(version)
  .arguments("<file>")
  .description(
    "An application that parses hand histories and tournament summaries of Pokerstars, it saves it to a mysql database"
  )
  .option(
    "-t, --tournament",
    "It will parse tournament summaries, if this option is not set it will parse hands"
  )
  .parse(process.argv);

const filename = program.args[0];

const isForTournaments: boolean = program.tournament;

const path = join(__dirname, "/../package.json");

const name = JSON.parse(readFileSync(path, { encoding: "utf8" }))
  .name as string;

const config = new Configstore(name);

const databaseSecrets = {
  user: config.get("db_user"),
  password: config.get("db_password"),
  database: config.get("db_database")
};

const appConfig = {
  databaseSecrets,
  isForTournaments,
  filename
};

export default appConfig;
