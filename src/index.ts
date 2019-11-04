import { sync } from "rimraf";
import { startConnectionWithDatabase } from "./methods";
import { printSTGCount0_50, printSPGCount0_25 } from "./tournament/queries";

startConnectionWithDatabase((connection) => {
  printSTGCount0_50(connection);
  printSPGCount0_25(connection);
});

sync("./lib/");
