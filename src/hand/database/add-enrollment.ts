import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { MysqlError } from "mysql";
import { IAction } from "../models/action";
import logger from "../../logger";

const phases = ["force-bet", "preflop", "flop", "turn", "river", "show-down"];

export function addEnrollments(hands: IHand[], connection: DatabaseConnection) {
  const valuesWithSeat: Array<Array<string | number>> = [];
  hands.forEach((hand) => {
    hand.players.forEach((player) =>
      valuesWithSeat.push([hand.id, player.name, player.seat, player.stack])
    );
  });
  const valuesWithOutSeat = getPlayersWithOutSeatForEnrollments(hands);
  return executeQueryForEnrollments(
    {
      withSeat: valuesWithSeat,
      noSeat: valuesWithOutSeat
    },
    connection
  );
}

function executeQueryForEnrollments(
  values: {
    withSeat: Array<Array<string | number>>;
    noSeat: Array<[number, string, null, null]>;
  },
  connection: DatabaseConnection
) {
  let affectedRows = 0;
  const notifyWhenEnd$ = new Subject<number>();
  let counter = 0;
  const query =
    "insert hand_enrollment(handId, playerName, seat, stack) values ?" +
    "on duplicate key update handId = values(handId), playerName = values(playerName)" +
    ", seat = values(seat), stack = values(stack)";
  const cb = (error: MysqlError | null, response: any) => {
    if (error) {
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        logger.log(
          "error, constraint fails inserting enrollments in worker " +
            process.pid
        );
      }
      notifyWhenEnd$.error(error);
      return;
    }
    counter--;
    affectedRows += response.affectedRows;
    if (counter === 0) {
      notifyWhenEnd$.next(affectedRows);
    }
  };
  counter++;
  connection.query({ sql: query, values: [values.withSeat] }, cb);
  if (values.noSeat.length > 0) {
    counter++;
    connection.query({ sql: query, values: [values.noSeat] }, cb);
  }
  return notifyWhenEnd$.asObservable();
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
