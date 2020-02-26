import addAllTournaments from "./tournament/database/add-all";
import addAllHands from "./hand/database/add-all";

export default function cli(filename: string, isTournament = false): void {
  console.log(filename);
  if (isTournament) {
    addAllTournaments(filename);
  } else {
    addAllHands(filename);
  }
}
