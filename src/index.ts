import { sync } from "rimraf";
import {
  addTournaments,
  existingTournaments$
} from "./tournament/process-email";

addTournaments("octubre_1");
// existingTournaments$().subscribe((data) => console.log(data.length));
sync("./lib/");
