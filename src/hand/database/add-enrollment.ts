import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { filter } from "rxjs/operators";
import { MysqlError } from "mysql";
import { IAction } from "../models/action";

const phases = ["force-bet", "preflop", "flop", "turn", "river", "show-down"];

export function addEnrollments(hands: IHand[], connection: DatabaseConnection) {
  const notifyWhenEnd$ = new Subject<void | {
    counter: number;
    cause: string;
  }>();
  const valuesWithSeat: Array<Array<string | number>> = [];
  hands.forEach((hand) => {
    hand.players.forEach((player) =>
      valuesWithSeat.push([hand.id, player.name, player.seat, player.stack])
    );
  });

  const valuesWithOutSeat = getPlayersWithOutSeatForEnrollments(hands);
  executeQueryForEnrollments(
    {
      withSeat: valuesWithSeat,
      noSeat: valuesWithOutSeat
    },
    connection,
    notifyWhenEnd$,
    0
  );
  notifyWhenEnd$
    .pipe(
      filter((obj) => {
        if (typeof obj === "object") {
          return true;
        }
        return false;
      })
    )
    .subscribe((obj: any) => {
      if (obj.cause === "fail constraint") {
        executeQueryForEnrollments(
          { withSeat: valuesWithSeat, noSeat: valuesWithOutSeat },
          connection,
          notifyWhenEnd$,
          obj.counter
        );
      }
    });
  return notifyWhenEnd$.asObservable().pipe(
    filter((obj) => {
      if (typeof obj !== "object") {
        return true;
      }
      return false;
    })
  );
}

function executeQueryForEnrollments(
  values: {
    withSeat: Array<Array<string | number>>;
    noSeat: Array<[number, string, null, null]>;
  },
  connection: DatabaseConnection,
  notifyWhenEnd$: Subject<void | {
    counter: number;
    cause: string;
  }>,
  trialNumber: number
) {
  if (trialNumber === 3) {
    notifyWhenEnd$.error(new Error("3 trials failed"));
  }
  let counter = 0;
  counter++;
  const query =
    "insert hand_enrollment(handId, playerName, seat, stack) values ?" +
    "on duplicate key update handId = values(handId), playerName = values(playerName)" +
    ", seat = values(seat), stack = values(stack)";
  const cb = (error: MysqlError | null, response: any) => {
    if (error) {
      if (/ER_NO_REFERENCED_ROW_2/g.test(error.message)) {
        console.log("handling key constraint fails");
        notifyWhenEnd$.next({
          counter: ++trialNumber,
          cause: "fail constraint"
        });
        return;
      }
      throw error;
    }
    counter--;
    if (counter === 0) {
      notifyWhenEnd$.next();
    }
  };
  connection.query({ sql: query, values: [values.withSeat] }, cb);

  if (values.noSeat.length > 0) {
    counter++;
    connection.query({ sql: query, values: [values.noSeat] }, cb);
  }
}

function getPlayersWithOutSeatForEnrollments(
  hands: IHand[]
): Array<[number, string, null, null]> {
  const result: Array<[number, string, null, null]> = [];
  hands.forEach((hand) => {
    phases.forEach((phase) => {
      pushPlayerWithOutSeatForEnrollments(hand, phase, result);
    });
  });
  return result;
}

function pushPlayerWithOutSeatForEnrollments(
  hand: IHand,
  phase: string,
  result: Array<[number, string, null, null]>
) {
  let actions: IAction[];
  switch (phase) {
    case phases[0]:
      actions = hand.forceBetAction;
      break;
    case phases[1]:
      actions = hand.preflopAction;
      break;
    case phases[2]:
      actions = hand.flopAction || [];
      break;
    case phases[3]:
      actions = hand.turnAction || [];
      break;
    case phases[4]:
      actions = hand.riverAction || [];
      break;
    case phases[5]:
      actions = hand.showDownAction || [];
      break;
    default:
      actions = [];
  }
  actions.forEach((action) => {
    if (action.nonSeatPlayerName) {
      result.push([hand.id, action.nonSeatPlayerName, null, null]);
    }
  });
}
