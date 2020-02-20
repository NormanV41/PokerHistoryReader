import { IHand } from "../models/hand";
import { Card } from "../models/card";
import { IAction } from "../models/action";
import { Subject } from "rxjs";
import { DatabaseConnection } from "../../models/database-connection";

const phases = ["force-bet", "preflop", "flop", "turn", "river", "show-down"];

export function addActions(hands: IHand[], connection: DatabaseConnection) {
  const notifyWhenDone$ = new Subject<void>();
  const sql =
    "insert into hand_action(handId,handEnrollmentId,phase,description,amount,raiseToAmount,message" +
    ",rebuyChipsReceived,hand,eliminatedPlayer,increasedBountyBy,finalBounty) values ?";
  const values: Array<Array<string | number | null>> = [];
  getEnrollmentsForActions(connection).subscribe((enrollments) => {
    hands.forEach((hand) => {
      const filterEnrollments = enrollments.filter((enrollment) => {
        if (enrollment.handId !== hand.id) {
          return false;
        }
        return true;
      });
      pushAllActions(hand, values, filterEnrollments);
    });
    connection.query({ sql, values: [values] }, (error, response) => {
      if (error) {
        throw error;
      }
      notifyWhenDone$.next();
    });
  });
  return notifyWhenDone$.asObservable();
}

function pushAllActions(
  hand: IHand,
  values: Array<Array<string | number | null>>,
  enrollments: Array<{ id: number; playerName: string; seat: number }>
) {
  hand.forceBetAction.forEach((action) =>
    values.push(
      mapActionWithTableValues(hand.id, action, phases[0], enrollments)
    )
  );
  hand.preflopAction.forEach((action) =>
    values.push(
      mapActionWithTableValues(hand.id, action, phases[1], enrollments)
    )
  );
  if (hand.flopAction) {
    hand.flopAction.forEach((action) => {
      values.push(
        mapActionWithTableValues(hand.id, action, phases[2], enrollments)
      );
    });
  }
  if (hand.turnAction) {
    hand.turnAction.forEach((action) => {
      values.push(
        mapActionWithTableValues(hand.id, action, phases[3], enrollments)
      );
    });
  }
  if (hand.riverAction) {
    hand.riverAction.forEach((action) => {
      values.push(
        mapActionWithTableValues(hand.id, action, phases[4], enrollments)
      );
    });
  }
  if (hand.showDownAction) {
    hand.showDownAction.forEach((action) => {
      values.push(
        mapActionWithTableValues(hand.id, action, phases[5], enrollments)
      );
    });
  }
}

function getEnrollmentsForActions(connection: DatabaseConnection) {
  const enrollments$ = new Subject<
    Array<{ id: number; playerName: string; seat: number; handId: number }>
  >();
  connection.query(
    {
      sql: "select id,playerName,seat,handId from hand_enrollment"
    },
    (
      error,
      enrollments: Array<{
        id: number;
        playerName: string;
        seat: number;
        handId: number;
      }>
    ) => {
      if (error) {
        enrollments$.error(error);
        return;
      }
      enrollments$.next(enrollments);
    }
  );
  return enrollments$.asObservable();
}
function mapActionWithTableValues(
  handId: number,
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
    handId,
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
