import { ITournament } from "../models/tournament";
import { DatabaseConnection } from "../../models/database-connection";
import { MysqlError } from "mysql";
import { Subject } from "rxjs";
import { IPlayer } from "../models/player";
import logger from "../../logger";
import { parsingNumberFromMatchString } from "../../methods";

export function addPlayers(
  tournaments: ITournament[],
  connection: DatabaseConnection
) {
  const notifyWhenDone$ = new Subject<void>();
  const sql =
    "insert into player(username, country) values ? on duplicate key update country = values(country)";
  const values = getPlayers(tournaments).map<string[]>((player) => {
    return [player.name, player.country];
  });
  connection.query(
    { sql, values: [values] },
    (error: MysqlError | null, response) => {
      if (error) {
        notifyWhenDone$.error(error);
      }
      const playersAddedOrUpdated = parsingNumberFromMatchString(
        (response.message as string).match(/(?<=Records: )\d+/g)
      );
      logger.log(`${playersAddedOrUpdated} players are added or updated`);
      notifyWhenDone$.next();
    }
  );
  return notifyWhenDone$.asObservable();
}

export function getPlayers(tournaments: ITournament[]): IPlayer[];

export function getPlayers(
  tournaments: ITournament[],
  withTournamentId: boolean
): Array<IPlayer & { tournamentId: number }>;

export function getPlayers(
  tournaments: ITournament[],
  withTournamentId = false
) {
  const players: Array<IPlayer & { tournamentId?: number }> = [];
  tournaments.forEach((tournament) =>
    tournament.players.forEach((player) => {
      if (!withTournamentId) {
        return players.push(player);
      }
      return players.push({
        name: player.name,
        country: player.country,
        position: player.position,
        prize: player.prize,
        tournamentId: tournament.tournamentId
      });
    })
  );
  return players;
}
