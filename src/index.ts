import { sync } from "rimraf";
import { startConnectionWithDatabase, transpose, round } from "./methods";
import { SPGCount0_25$, printSPGCount0_25 } from "./tournament/queries";
import { table } from "table";

startConnectionWithDatabase((connection) => {
  printSPGCount0_25(connection);
});

sync("./lib/");
