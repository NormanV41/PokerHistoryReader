import { ITournament } from "../models/tournament";
import {
  formatDate,
  comparingDates,
  errorHandlerInTransaction
} from "../../methods";
import { Subject, merge } from "rxjs";
import { newTournaments$ } from "../process-email";
import { DatabaseConnection } from "../../models/database-connection";
import { addTournaments } from "./add-tournaments";
import { addPlayers } from "./add-players";
import { addEnrollments } from "./add-enrollments";
import logger from "../../logger";

export default function addAllData(fileName: string) {
  newTournaments$(fileName).subscribe((data) => {
    getArrayOfIds(data).subscribe((ids) => {
      const tournaments = data.filter(
        (tournament) =>
          ids.find((el) => el.id === tournament.tournamentId) === undefined
      );
      if (tournaments.length === 0) {
        logger.log("done, no new tournaments to add");
        return;
      }
      const connection = new DatabaseConnection();
      addAllHelper(tournaments, connection);
    });
  });
}

function addAllHelper(
  tournaments: ITournament[],
  connection: DatabaseConnection
) {
  let counter = 2;
  connection.connection.beginTransaction((errorInTransaction) => {
    if (errorInTransaction) {
      throw errorInTransaction;
    }
    const tournamentsNotifier$ = addTournaments(tournaments, connection);
    const playersNotifier$ = addPlayers(tournaments, connection);
    merge(tournamentsNotifier$, playersNotifier$).subscribe(
      () => {
        counter--;
        if (counter === 0) {
          setTimeout(() => {
            addEnrollments(tournaments, connection).subscribe(
              () => {
                connection.connection.commit((errorInCommit) => {
                  if (!errorInCommit) {
                    return;
                  }
                  errorHandlerInTransaction(errorInCommit, connection);
                });
                connection.end("connection ended");
              },
              (errorInEnrollment) =>
                errorHandlerInTransaction(errorInEnrollment, connection)
            );
          });
        }
      },
      (errorInTournamentOrPlayer) =>
        errorHandlerInTransaction(errorInTournamentOrPlayer, connection)
    );
  });
}

function getArrayOfIds(tournamentsToAdd: ITournament[]) {
  const connection = new DatabaseConnection();
  const subject$ = new Subject<Array<{ id: number }>>();
  const dates = getLeastAndGreatestDate(tournamentsToAdd);
  connection.query(
    {
      sql: `select id from tournament where tournament.startTime between '${formatDate(
        dates.leastDate
      )}' and '${formatDate(dates.greatestDate)}'`
    },
    (error, response: Array<{ id: number }>) => {
      if (error) {
        subject$.error(error);
        return;
      }
      subject$.next(response);
      connection.end("connection ended");
    }
  );
  return subject$.asObservable();
}

function getLeastAndGreatestDate(tournaments: ITournament[]) {
  const greatestDate = tournaments
    .map((tournament) => tournament.start)
    .reduce((previous, current, index, array) => {
      if (comparingDates(previous, current) !== -1) {
        return previous;
      }
      return current;
    });
  const leastDate = tournaments
    .map((tournament) => tournament.start)
    .reduce((previous, current, index, array) => {
      if (comparingDates(previous, current) !== 1) {
        return previous;
      }
      return current;
    });
  return { greatestDate, leastDate };
}
