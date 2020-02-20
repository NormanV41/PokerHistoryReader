import { ITournament } from "./models/tournament";
import { Connection, MysqlError } from "mysql";
import { IPlayer } from "./models/player";
import {
  getNumberValue,
  startConnectionWithDatabase,
  formatDate
} from "../methods";
import { Subject } from "rxjs";

export function addTournamentData(
  tournament: ITournament,
  connection: Connection
) {
  addTournamentToDatabase(tournament, connection);
  addPlayersToDatabase(connection, tournament.players);
  addTournamentEnrollmentsToDatabase(connection, tournament);
}
export function getAllTournamentEnrollments() {
  startConnectionWithDatabase((connection) => {
    connection.query(
      "call sp_get_all_tournament_enrollments()",
      (error, response) => {
        if (error) {
          throw error;
        }
        console.log(response);
      }
    );
  });
}

export function getAllPlayers() {
  startConnectionWithDatabase((connection) => {
    connection.query("call sp_get_all_players()", (error, response) => {
      if (error) {
        throw error;
      }
      console.log(response);
    });
  });
}

export function getAllTournaments() {
  startConnectionWithDatabase((connection) => {
    connection.query("call sp_get_all_tournaments()", (error, response) => {
      if (error) {
        throw error;
      }
      console.log(response);
    });
  });
}

function addTournamentEnrollmentsToDatabase(
  connection: Connection,
  tournament: ITournament
) {
  const query =
    "insert ignore into tournament_enrollment(tournamentId,playerName, position, prize) values ?";
  const values = tournament.players.map<Array<string | number>>((player) => {
    let prize = player.prize;
    if (typeof prize === "number") {
      prize = prize + "N";
    }
    return [tournament.tournamentId, player.name, player.position, prize];
  });
  connection.query(
    query,
    [values],
    callbackCheckingDuplicateWarning(tournament)
  );
}

function addPlayersToDatabase(connection: Connection, players: IPlayer[]) {
  const query =
    "insert into player(username, country) values ? on duplicate key update country = values(country)";
  const values = players.map<string[]>((player) => {
    return [player.name, player.country];
  });
  connection.query(
    query,
    [values],
    (error: MysqlError | null, response: { message: string }) => {
      if (error) {
        console.log(players);
        throw error;
      }
    }
  );
}

export function checkDuplicatesAndWarnings(response: { message: string }) {
  let duplicates = 0;
  let warnings = 0;
  try {
    duplicates = getNumberValue(response.message, /(?<=Duplicates: )\d+/g);
    warnings = getNumberValue(response.message, /(?<= Warnings: )\d+/g);
  } catch (error) {
    console.log(response);
    throw error;
  }
  if (duplicates !== warnings) {
    console.log(response);
    throw new Error("duplicates and warnings differ");
  }
}

function addTournamentToDatabase(
  tournament: ITournament,
  connection: Connection
) {
  const callBack = (error: MysqlError | null, response: any) => {
    if (error) {
      if (
        /ER_DUP_ENTRY: Duplicate entry .+ for key '(PRIMARY)|(unique_index)'/g.test(
          error.message
        )
      ) {
        return;
      }
      console.log(tournament);
      throw error;
    }
  };
  connection.query(stringQueryForAddTournament(tournament), callBack);
}

function stringQueryForAddTournament(tournament: ITournament): string {
  const currency = tournament.currency;
  const buyIn = tournament.buyIn;
  const end = tournament.end;
  let prizePool = tournament.prizePool;
  const rebuyAddon = tournament.rebuyAddon;
  let result = `call sp_insert_tournament(${
    tournament.tournamentId
  },'${formatDate(tournament.start)}',`;
  const endString = end ? `'${formatDate(end)}',` : `NULL,`;
  result += endString;
  if (typeof prizePool === "number") {
    prizePool = prizePool + "N";
  }
  const prizePoolString = `'${prizePool}',`;
  result += prizePoolString;
  const rebuyAddonString = rebuyAddon
    ? `${rebuyAddon[0]},${rebuyAddon[1]},`
    : "NULL,NULL,";
  result += rebuyAddonString;
  let buyInString;
  switch (buyIn.length) {
    case 1:
      buyInString = `${buyIn[0]},NULL,NULL,`;
      break;
    case 2:
      buyInString = `${buyIn[0]},${buyIn[1]},NULL,`;
      break;
    case 3:
      buyInString = `${buyIn[0]},${buyIn[2]},${buyIn[1]},`;
      break;
  }
  result += buyInString;
  const currencyString = currency ? `'${currency}')` : "NULL)";
  result += currencyString;
  return result;
}

function callbackCheckingDuplicateWarning(data: any, notify?: Subject<void>) {
  return (error: MysqlError | null, response: { message: string }) => {
    if (error) {
      if (
        /ER_DUP_ENTRY: Duplicate entry .+ for key '(PRIMARY)|(unique_index)'/g.test(
          error.message
        )
      ) {
        return;
      }
      if (/ER_LOCK_DEADLOCK/g.test(error.message)) {
        if (notify) {
          notify.error(error);
        }
        return;
      }
      console.log(data);
      throw error;
    }
    if (notify) {
      notify.next();
    }
    checkDuplicatesAndWarnings(response);
  };
}
