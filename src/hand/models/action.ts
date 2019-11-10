import { Card } from "./card";
import { ActionDescription } from "./action-description";

export interface IAction {
  seat?: number;
  description: ActionDescription;
  amount?: number;
  raiseToAmount?: number;
  message?: string;
  nonSeatPlayerName?: string;
  rebuyChipsReceived?: number;
  hand?: Card[];
  eliminatedSeat?: number;
  increasedBountyBy?: number;
  finalBounty?: number;
}
