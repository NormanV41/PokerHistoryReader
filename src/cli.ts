import addAllTournaments from "./tournament/database/add-all";
import addAllHands from "./hand/database/add-all";

export default function cli(filename: string, isTournament = false): void {
  if (isTournament) {
    addAllTournaments(filename);
  } else {
    addAllHands(filename);
  }
}
