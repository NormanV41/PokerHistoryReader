import { sync } from "rimraf";
import { readHandsHistory$ } from "./hand/process-hands";
import {
  startConnectionWithDatabase,
  comparingDates,
  formatDate
} from "./methods";
import {
  addHands,
  addPlayers,
  addEnrollments,
  addActions
} from "./hand/database";
import { DatabaseConnection } from "./models/database-connection";
import { combineAll } from "rxjs/operators";
import { merge, Subject } from "rxjs";
import { IHand } from "./hand/models/hand";
/*
readHandsHistory$("handHistory-17004").subscribe((data) => {
  startConnectionWithDatabase((connection) => {
    connection.query(
      { sql: "select id from hand" },
      (error, response: Array<{ id: number }>) => {
        if (error) {
          throw error;
        }
        setTimeout(() => {
          const databaseConnection = new DatabaseConnection();
          data.slice(0, 500).forEach((hand) => {
            const index = response.findIndex((el) => el.id === hand.id);
            if (index === -1) {
              addHandData(hand, databaseConnection);
            }
          });
        });
      }
    );
  });
});*/

readHandsHistory$("Hands_26.12.18_5.5.19").subscribe((data) => {
  getArrayOfIds(data).subscribe((ids) => {
    const hands = data.filter(
      (hand) => ids.find((el) => el.id === hand.id) === undefined
    );
    if (hands.length === 0) {
      console.log("done, no new hands to add");
      return;
    }
    setTimeout(() => {
      const databaseConnection = new DatabaseConnection();
      let counter = 2;
      const handsNotifier$ = addHands(hands, databaseConnection);
      const playersNotifier$ = addPlayers(hands, databaseConnection);
      merge(handsNotifier$, playersNotifier$).subscribe(() => {
        counter--;
        if (counter === 0) {
          setTimeout(() => {
            const connectionForEnrollments = new DatabaseConnection();
            addEnrollments(hands, connectionForEnrollments).subscribe(() => {
              addActions(hands);
            });
          });
        }
      });
    });
  });
});

function getArrayOfIds(handsToAdd: IHand[]) {
  const subject = new Subject<Array<{ id: number }>>();
  const leastAndGreatestDate = getLeastAndGreatestDate(handsToAdd);
  startConnectionWithDatabase((connection) => {
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
      }
    );
  });
  return subject.asObservable();
}

function getLeastAndGreatestDate(hands: IHand[]) {
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

sync("./lib/");
