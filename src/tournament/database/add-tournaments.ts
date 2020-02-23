import { ITournament } from "../models/tournament";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { MysqlError } from "mysql";
import { formatDate } from "../../methods";

export function addTournaments(
  tournaments: ITournament[],
  connection: DatabaseConnection
) {
  const notifyWhenDone$ = new Subject<void>();
  const sql =
    "insert into tournament(id,start,end,prizePool,rebuy,addon,buyInNoRake,rake,buyInBounty,currency) values ?";
  const values = tournaments.map((tournament) => tournamentToArray(tournament));
  connection.query(
    { sql, values: [values] },
    (error: MysqlError | null, response: any) => {
      if (error) {
        notifyWhenDone$.error(error);
      }
      notifyWhenDone$.next();
    }
  );
  return notifyWhenDone$.asObservable();
}

function tournamentToArray(tournament: ITournament) {
  const rebuyAddon: Array<null | number> = tournament.rebuyAddon || [
    null,
    null
  ];
  const buyIn = getBuyInArray(tournament.buyIn);
  return [
    tournament.tournamentId,
    formatDate(tournament.start),
    tournament.end ? formatDate(tournament.end) : null,
    typeof tournament.prizePool === "number"
      ? tournament.prizePool + "N"
      : tournament.prizePool,
    rebuyAddon[0],
    rebuyAddon[1],
    buyIn[0],
    buyIn[1],
    buyIn[3],
    tournament.currency || null
  ];
}

function getBuyInArray(buyIn: number[]) {
  switch (buyIn.length) {
    case 1:
      return [buyIn[0], null, null];
    case 2:
      return [buyIn[0], buyIn[1], null];
    case 3:
      return [buyIn[0], buyIn[2], buyIn[1]];
    default:
      throw new Error("not expected");
  }
}
