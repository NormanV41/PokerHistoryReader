import { IHand } from "../models/hand";
import { DatabaseConnection } from "../../models/database-connection";
import { Subject } from "rxjs";
import { formatDate } from "../../methods";
import logger from "../../logger";

export function addHands(hands: IHand[], connection: DatabaseConnection) {
  const notifyWhenEnd$ = new Subject<void>();
  const sql =
    "insert into hand(id,tournamentId,date,smallBlind, bigBlind, tournamentLevel" +
    ", buttonSeat, tableId, ante,dealtHand, flop, turn, river, totalPot, rake, raw) values ?";
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
    switchUndefinedForNull(hand.river),
    JSON.stringify(hand.totalPot),
    hand.rake,
    hand.raw
  ]);
  connection.query({ sql, values: [values] }, (error, response) => {
    if (error) {
      notifyWhenEnd$.error(error);
    }
    logger.log(`${response.affectedRows} hands were added`);
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
