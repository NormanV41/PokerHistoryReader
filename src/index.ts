import { sync } from "rimraf";
import { readTournamentSummary } from "./hand/process-hands";

// addTournaments("septiembre_1");
/*existingTournaments$().subscribe(data => data.forEach(tournament=>{
  console.log(tournament.tournamentId)
}));*/

readTournamentSummary(
  "./data/hand-history/Hands_26.12.18_5.5.19.txt",
  (hands) => {
    console.log(hands);
  }
);

sync("./lib/");
