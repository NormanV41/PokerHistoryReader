import { ITournament } from "../models/tournament";
import { DatabaseConnection } from "../../models/database-connection";
import { getPlayers } from "./add-players";
import { Subject } from "rxjs";
import logger from "../../logger";

export function addEnrollments(
  tournaments: ITournament[],
  connection: DatabaseConnection
) {
  const notifyWhenDone$ = new Subject<void>();
  const sql =
    "insert tournament_enrollment(tournamentId,playerName, position, prize) values ?";
  const values = getPlayers(tournaments, true).map<Array<string | number>>(
    (player) => {
      let prize = player.prize;
      if (typeof prize === "number") {
        prize = prize + "N";
      }
      return [player.tournamentId, player.name, player.position, prize];
    }
  );
  connection.query({ sql, values: [values] }, (error, response) => {
    if (error) {
      notifyWhenDone$.error(error);
    }
    logger.log(`${response.affectedRows} enrollments were added`);
    notifyWhenDone$.next();
  });
  return notifyWhenDone$.asObservable();
}
