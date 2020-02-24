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

export default function addAllData(fileName: string) {
  newTournaments$(fileName).subscribe((data) => {
    getArrayOfIds(data).subscribe((ids) => {
      const tournaments = data.filter(
        (tournament) =>
          ids.find((el) => el.id === tournament.tournamentId) === undefined
      );
      console.log(tournaments.length);
      if (tournaments.length === 0) {
        console.log("done, no new tournaments to add");
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
        console.log("Players or tournaments added, counter: " + counter);
        if (counter === 0) {
          setTimeout(() => {
            addEnrollments(tournaments, connection).subscribe(
              () => {
                console.log("enrollments added");
                connection.connection.commit((errorInCommit) =>
                  errorHandlerInTransaction(errorInCommit, connection)
                );
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
      sql: `select id from tournament where tournament.start between '${formatDate(
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
