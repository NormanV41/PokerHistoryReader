import { Card } from "./card";

export interface IAction {
  seat?: number;
  description: string;
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
