import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { filter } from "rxjs/operators";
import { MysqlError } from "mysql";
import { IAction } from "../models/action";
import { getNumberValue } from "../../methods";
import logger from "../../logger";

export function addPlayers(hands: IHand[], connection: DatabaseConnection) {
  const notifyWhenEnd$ = new Subject<void | {
    counter: number;
    cause: string;
  }>();
  const playersWithOutSeat: string[] = [];
  pushAllNonSeatPlayers(hands, playersWithOutSeat);
  const playersWithSeat: string[] = [];
  hands.forEach((hand) =>
    hand.players.forEach((player) => {
      playersWithSeat.push(player.name);
    })
  );
  const players = playersWithSeat.concat(playersWithOutSeat);
  const values = players.map<Array<string | null>>((player) => [player, null]);
  const counter = 1;
  executesQueryForPlayers(values, counter, notifyWhenEnd$, connection);
  notifyWhenEnd$
    .pipe(
      filter((obj) => {
        if (typeof obj !== "object") {
          return false;
        }
        return true;
      })
    )
    .subscribe((obj: any) => {
      setTimeout(() => {
        executesQueryForPlayers(
          values,
          obj.counter,
          notifyWhenEnd$,
          connection
        );
      }, 50);
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

function executesQueryForPlayers(
  values: Array<Array<string | null>>,
  counter: number,
  notifyWhenEnd$: Subject<void | {
    counter: number;
    cause: string;
  }>,
  connection: DatabaseConnection
) {
  if (counter === 20) {
    notifyWhenEnd$.error(new Error("more than 20 trials"));
    return;
  }
  const query = "insert ignore into player(username, country) values ?";
  connection.query(
    { sql: query, values: [values] },
    (
      error: MysqlError | null,
      response: { message: string; affectedRows: number }
    ) => {
      if (error) {
        if (
          /ER_DUP_ENTRY: Duplicate entry .+ for key '(PRIMARY)|(unique_index)'/g.test(
            error.message
          )
        ) {
          logger.log(
            `Duplicate entry error inserting players in worker ${process.pid}`
          );
          logger.log(error);
          return;
        }
        if (/ER_LOCK_DEADLOCK/g.test(error.message)) {
          logger.log(
            `error deadlock inserting players in worker ${process.pid}, it was trial number ${counter}`
          );
          notifyWhenEnd$.next({ counter: ++counter, cause: "deadlock" });
          return;
        }
        logger.log("error not handled in add players");
        notifyWhenEnd$.error(error);
      }
      notifyWhenEnd$.next();
      checkDuplicatesAndWarnings(response);
    }
  );
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

function checkDuplicatesAndWarnings(response: {
  message: string;
  affectedRows: number;
}) {
  let duplicates = 0;
  let warnings = 0;
  try {
    duplicates = getNumberValue(response.message, /(?<=Duplicates: )\d+/g);
    warnings = getNumberValue(response.message, /(?<= Warnings: )\d+/g);
  } catch (error) {
    logger.log(response);
    throw error;
  }
  if (duplicates !== warnings) {
    logger.log(response);
    throw new Error("duplicates and warnings differ");
  } else {
    logger.log(
      `${response.affectedRows} players were added in worker ${process.pid}`
    );
  }
}
