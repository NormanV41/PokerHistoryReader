import { isMaster, fork, Worker, on } from "cluster";
import { cpus } from "os";
import { readHandsHistory$ } from "../process-hands";
import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject, merge } from "rxjs";
import {
  comparingDates,
  formatDate,
  errorHandlerInTransaction
} from "../../methods";
import { addHands } from "./add-hand";
import { addPlayers } from "./add-player";
import { addEnrollments } from "./add-enrollment";
import { addActions } from "./add-action";

export default function addAllData(filename: string) {
  if (isMaster) {
    readHandsHistory$(filename).subscribe((data) => {
      getArrayOfIds(data).subscribe((ids) => {
        const hands = data.filter(
          (hand) => ids.find((el) => el.id === hand.id) === undefined
        );
        if (hands.length < 200) {
          if (hands.length === 0) {
            console.log("done, no new hands to add");
            return;
          }
          const connection = new DatabaseConnection();
          addAllHandDataHelper(hands, connection).subscribe(() => {
            setTimeout(() => {
              connection.end("connection ended");
            });
          });
          return;
        }
        const numWorkers = cpus().length;
        const workers: Worker[] = [];
        console.log("Master cluster setting up " + numWorkers + " workers...");
        for (let i = 0; i < numWorkers; i++) {
          const worker = fork();
          workers.push(worker);
        }
        on("online", (worker) => {
          console.log(`Worker ${worker.process.pid} is online`);
        });
        const elementsPerWorker = Math.ceil(hands.length / workers.length);
        workers.forEach((worker, index) => {
          worker.send({
            hands: hands.slice(
              elementsPerWorker * index,
              elementsPerWorker * index + elementsPerWorker
            )
          });
        });
      });
    });
  }

  process.on("message", (message: { hands: IHand[] }) => {
    console.log("running process");
    const connection = new DatabaseConnection();
    addAllHandDataHelper(message.hands, connection).subscribe(() => {
      setTimeout(() => {
        connection.end("connection ended");
        console.log(`exiting worker ${process.pid}`);
        process.exit();
      });
    });
  });
}

function addAllHandDataHelper(hands: IHand[], connection: DatabaseConnection) {
  const notifyWhenDone$ = new Subject<void>();
  let counter = 2;
  connection.connection.beginTransaction((errorInTransaction) => {
    if (errorInTransaction) {
      throw errorInTransaction;
    }
    const handsNotifier$ = addHands(hands, connection);
    const playersNotifier$ = addPlayers(hands, connection);
    merge(handsNotifier$, playersNotifier$).subscribe(
      () => {
        console.log(
          `worker: ${process.pid}: hands or players done -- counter: ${counter}`
        );
        counter--;
        if (counter === 0) {
          setTimeout(() => {
            addEnrollments(hands, connection).subscribe(
              () => {
                counter--;
                console.log(`worker ${process.pid}: enrollments done`);
                addActions(hands, connection).subscribe(
                  () => {
                    counter--;
                    console.log(`worker ${process.pid} actions done`);
                    notifyWhenDone$.next();
                    connection.connection.commit((errorInCommit) => {
                      if (errorInCommit) {
                        errorHandlerInTransaction(errorInCommit, connection);
                      }
                    });
                  },
                  (errorInActions) =>
                    errorHandlerInTransaction(errorInActions, connection)
                );
              },
              (errorInEnrollments) =>
                errorHandlerInTransaction(errorInEnrollments, connection)
            );
          }, 400);
        }
      },
      (errorInHandsOrPlayers) =>
        errorHandlerInTransaction(errorInHandsOrPlayers, connection)
    );
  });
  return notifyWhenDone$.asObservable();
}

function getArrayOfIds(handsToAdd: IHand[]) {
  const connection = new DatabaseConnection();
  const subject = new Subject<Array<{ id: number }>>();
  const leastAndGreatestDate = getLeastAndGreatestDate(handsToAdd);
  connection.query(
    {
      sql: `select id from hand where hand.date between '${formatDate(
        leastAndGreatestDate.leastDate
      )}' and '${formatDate(leastAndGreatestDate.greatestDate)}'`
    },
    (error, response: Array<{ id: number }>) => {
      if (error) {
        subject.error(error);
        return;
      }
      subject.next(response);
      connection.end("connection ended");
    }
  );

  return subject.asObservable();
}

export function getLeastAndGreatestDate(hands: IHand[]) {
  const greatestDate = hands
    .map((hand) => hand.date)
    .reduce((previous, current, index, array) => {
      if (comparingDates(previous, current) !== -1) {
        return previous;
      }
      return current;
    });
  const leastDate = hands
    .map((hand) => hand.date)
    .reduce((previous, current) => {
      if (comparingDates(previous, current) !== 1) {
        return previous;
      }
      return current;
    });
  return { greatestDate, leastDate };
}
