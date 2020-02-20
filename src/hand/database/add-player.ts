import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { filter } from "rxjs/operators";
import { MysqlError } from "mysql";
import { IAction } from "../models/action";
import { checkDuplicatesAndWarnings } from "../../tournament/database";

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
    notifyWhenEnd$.error(new Error("more than 3 trials"));
  }
  const query = "insert ignore into player(username, country) values ?";
  connection.query(
    { sql: query, values: [values] },
    (error: MysqlError | null, response: { message: string }) => {
      if (error) {
        if (
          /ER_DUP_ENTRY: Duplicate entry .+ for key '(PRIMARY)|(unique_index)'/g.test(
            error.message
          )
        ) {
          return;
        }
        if (/ER_LOCK_DEADLOCK/g.test(error.message)) {
          console.log("error deadlock");
          notifyWhenEnd$.next({ counter: ++counter, cause: "deadlock" });
          return;
        }
        console.log("error not handled in add players");
        throw error;
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
