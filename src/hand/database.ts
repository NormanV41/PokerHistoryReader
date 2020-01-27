import { IHand } from "./models/hand";
import { MysqlError, Connection } from "mysql";
import { formatDate, startConnectionWithDatabase } from "../methods";
import { Card } from "./models/card";
import { checkDuplicatesAndWarnings } from "../tournament/database";
import { IAction } from "./models/action";
import { Subject } from "rxjs";
import { DatabaseConnection } from "../models/database-connection";
import { IPlayer } from "./models/player";

const sqlToInsertAction =
  "insert into hand_action(handEnrollmentId,phase,description,amount,raiseToAmount,message" +
  ",rebuyChipsReceived,hand,eliminatedPlayer,increasedBountyBy,finalBounty) values ?";

const phases = ["force-bet", "pre-flop", "flop", "turn", "river", "show-down"];
// another approach to add hands

export function addHands(
  hands: IHand[],
  connection: Connection | DatabaseConnection
) {
  const notifyWhenEnd$ = new Subject<void>();
  const sql =
    "insert into hand(id,tournamentId,date,smallBlind, bigBlind, tournamentLevel" +
    ", buttonSeat, tableId, ante,dealtHand, flop, turn, river) values ?";
  const values = hands.map((hand) => [
    hand.id,
    switchUndefinedForNull(hand.tournamentId),
    formatDate(hand.date),
    hand.smallBigBlind[0],
    hand.smallBigBlind[1],
    switchUndefinedForNull(hand.tournamentLevel),
    hand.buttonSeat,
    hand.tableId,
    hand.ante,
    switchUndefinedForNull(hand.dealtHand),
    switchUndefinedForNull(hand.flop),
    switchUndefinedForNull(hand.turn),
    switchUndefinedForNull(hand.river)
  ]);
  connection.query({ sql, values: [values] }, (error, response) => {
    if (error) {
      throw error;
    }
    console.log(response);
    notifyWhenEnd$.next();
  });

  return notifyWhenEnd$.asObservable();
}

function switchUndefinedForNull<T>(el?: T) {
  if (typeof el === "object" && el !== null) {
    return JSON.stringify(el);
  }
  if (el) {
    return el;
  }
  return null;
}

export function addPlayers(
  hands: IHand[],
  connection: Connection | DatabaseConnection
) {
  const notifyWhenEnd$ = new Subject<void>();
  const playersWithOutSeat: string[] = [];
  pushAllNonSeatPlayers(hands, playersWithOutSeat);
  const playersWithSeat: string[] = [];
  hands.forEach((hand) =>
    hand.players.forEach((player) => {
      playersWithSeat.push(player.name);
    })
  );
  const players = playersWithSeat.concat(playersWithOutSeat);
  const query = "insert ignore into player(username, country) values ?";
  const values = players.map<Array<string | null>>((player) => [player, null]);

  connection.query(
    { sql: query, values: [values] },
    callbackCheckingDuplicateWarning(players, notifyWhenEnd$)
  );
  return notifyWhenEnd$.asObservable();
}

export function addEnrollments(
  hands: IHand[],
  connection: Connection | DatabaseConnection
) {
  const notifyWhenEnd$ = new Subject<void>();
  const query =
    "insert hand_enrollment(handId, playerName, seat, stack) values ?" +
    "on duplicate key update handId = values(handId), playerName = values(playerName)" +
    ", seat = values(seat), stack = values(stack)";
  const cb = (error: MysqlError | null, response: any) => {
    if (error) {
      throw error;
    }
    counter--;
    if (counter === 0) {
      notifyWhenEnd$.next();
    }
    console.log(response);
  };

  const valuesWithSeat: Array<Array<string | number>> = [];
  hands.forEach((hand) => {
    hand.players.forEach((player) =>
      valuesWithSeat.push([hand.id, player.name, player.seat, player.stack])
    );
  });
  let counter = 0;
  counter++;
  connection.query({ sql: query, values: [valuesWithSeat] }, cb);
  const valuesWithOutSeat = getPlayersWithOutSeatForEnrollments(hands);
  if (valuesWithOutSeat.length > 0) {
    counter++;
    connection.query({ sql: query, values: [valuesWithOutSeat] }, cb);
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

function pushAllNonSeatPlayers(hands: IHand[], nonSeatPlayers: string[]) {
  hands.forEach((hand) => {
    pushNonSeatPlayers(nonSeatPlayers, hand.forceBetAction);
    pushNonSeatPlayers(nonSeatPlayers, hand.preflopAction);
    pushNonSeatPlayers(nonSeatPlayers, hand.flopAction);
    pushNonSeatPlayers(nonSeatPlayers, hand.turnAction);
    pushNonSeatPlayers(nonSeatPlayers, hand.riverAction);
    pushNonSeatPlayers(nonSeatPlayers, hand.showDownAction);
  });
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

export function addActions(hands: IHand[]) {
  const sql =
    "insert into hand_action(handEnrollmentId,phase,description,amount,raiseToAmount,message" +
    ",rebuyChipsReceived,hand,eliminatedPlayer,increasedBountyBy,finalBounty) values ?";
  const values: Array<Array<string | number | null>> = [];
  getEnrollmentsForActions().subscribe((enrollments) => {
    hands
      .slice(0, 100)
      .forEach((hand) => pushAllActions(hand, values, enrollments));
    startConnectionWithDatabase((connection) => {
      connection.query({ sql, values: [values] }, (error, response) => {
        if (error) {
          throw error;
        }
        console.log(response);
      });
    });
  });
}

function pushAllActions(
  hand: IHand,
  values: Array<Array<string | number | null>>,
  enrollments: Array<{ id: number; playerName: string; seat: number }>
) {
  hand.forceBetAction.forEach((action) =>
    values.push(mapActionWithTableValues(action, phases[0], enrollments))
  );
  hand.preflopAction.forEach((action) =>
    values.push(mapActionWithTableValues(action, phases[1], enrollments))
  );
  if (hand.flopAction) {
    hand.flopAction.forEach((action) => {
      values.push(mapActionWithTableValues(action, phases[2], enrollments));
    });
  }
  if (hand.turnAction) {
    hand.turnAction.forEach((action) => {
      values.push(mapActionWithTableValues(action, phases[3], enrollments));
    });
  }
  if (hand.riverAction) {
    hand.riverAction.forEach((action) => {
      values.push(mapActionWithTableValues(action, phases[4], enrollments));
    });
  }
  if (hand.showDownAction) {
    hand.showDownAction.forEach((action) => {
      values.push(mapActionWithTableValues(action, phases[5], enrollments));
    });
  }
}

function getEnrollmentsForActions() {
  const enrollments$ = new Subject<
    Array<{ id: number; playerName: string; seat: number }>
  >();
  startConnectionWithDatabase((connection) => {
    connection.query(
      {
        sql: "select id,playerName,seat,handId from hand_enrollment"
      },
      (
        error,
        enrollments: Array<{ id: number; playerName: string; seat: number }>
      ) => {
        if (error) {
          enrollments$.error(error);
          return;
        }
        enrollments$.next(enrollments);
      }
    );
  });
  return enrollments$.asObservable();
}

/*function addActions(hand: IHand, connection: Connection | DatabaseConnection) {
  addActionsHelper(hand.id, "force-bet", hand.forceBetAction, connection);
  addActionsHelper(hand.id, "preflop", hand.preflopAction, connection);
  if (hand.flopAction) {
    addActionsHelper(hand.id, "flop", hand.flopAction, connection);
  }
  if (hand.turnAction) {
    addActionsHelper(hand.id, "turn", hand.turnAction, connection);
  }
  if (hand.riverAction) {
    addActionsHelper(hand.id, "river", hand.riverAction, connection);
  }
  if (hand.showDownAction) {
    addActionsHelper(hand.id, "show-down", hand.showDownAction, connection);
  }
}*/

function addActionsHelper(
  id: number,
  phase: string,
  actions: IAction[],
  connection: Connection | DatabaseConnection
) {
  connection.query(
    {
      sql: `select id,playerName,seat, handId from hand_enrollment where handId = ${id}`
    },
    (
      error,
      enrollments: Array<{ id: number; playerName: string; seat: number }>
    ) => {
      if (error) {
        throw error;
      }
      if (actions.length > 0) {
        const values = actions.map((action) =>
          mapActionWithTableValues(action, phase, enrollments)
        );
        connection.query(
          { sql: sqlToInsertAction, values: [values] },
          (errorInInsert, response) => {
            if (errorInInsert) {
              throw errorInInsert;
            }
          }
        );
      }
    }
  );
}

function mapActionWithTableValues(
  action: IAction,
  phase: string,
  enrollments: Array<{ id: number; playerName: string; seat: number }>
) {
  let enrollment: { id: number; playerName: string; seat: number } | undefined;
  if (action.seat) {
    enrollment = enrollments.find((el) => el.seat === action.seat);
  } else {
    enrollment = enrollments.find(
      (el) => el.playerName === action.nonSeatPlayerName
    );
  }
  if (!enrollment) {
    console.log(action);
    console.log(enrollments);
    throw new Error("should not be undefined");
  }
  const eliminatedEnrollment = enrollments.find(
    (el) => el.seat === action.eliminatedSeat
  );
  const eliminatedId = eliminatedEnrollment ? eliminatedEnrollment.id : null;
  return [
    enrollment.id,
    phase,
    action.description,
    ifUndefinedPutNullAndIfArrayToJson(action.amount),
    ifUndefinedPutNullAndIfArrayToJson(action.raiseToAmount),
    ifUndefinedPutNullAndIfArrayToJson(action.message),
    ifUndefinedPutNullAndIfArrayToJson(action.rebuyChipsReceived),
    ifUndefinedPutNullAndIfArrayToJson(action.hand),
    eliminatedId,
    ifUndefinedPutNullAndIfArrayToJson(action.increasedBountyBy),
    ifUndefinedPutNullAndIfArrayToJson(action.finalBounty)
  ];
}

function ifUndefinedPutNullAndIfArrayToJson(
  value: number | string | Card[] | undefined
) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function callbackCheckingDuplicateWarning(
  data: any,
  notify?: Subject<void>
) {
  return (error: MysqlError | null, response: { message: string }) => {
    if (error) {
      if (
        /ER_DUP_ENTRY: Duplicate entry .+ for key '(PRIMARY)|(unique_index)'/g.test(
          error.message
        )
      ) {
        return;
      }
      console.log(data);
      throw error;
    }
    if (notify) {
      notify.next();
    }
    console.log(response);
    checkDuplicatesAndWarnings(response);
  };
}

function pushNonSeatPlayers(
  nonSeatPlayers: string[],
  actions: IAction[] | undefined
) {
  if (!actions) {
    return;
  }
  actions.forEach((action) => {
    if (action.nonSeatPlayerName) {
      nonSeatPlayers.push(action.nonSeatPlayerName);
    }
  });
}

function checkUndefinedAndToJSON(
  cards: Card[] | Card | undefined,
  isLastOne = false
) {
  return cards
    ? `'${JSON.stringify(cards)}'${isLastOne ? ")" : ","}`
    : `NULL${isLastOne ? ")" : ","}`;
}
