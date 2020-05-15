import { IPlayer } from "./player";
import { Card } from "./card";
import { IAction } from "./action";

export interface IHand {
  id: number;
  tournamentId?: number;
  date: Date;
  smallBigBlind: number[];
  tournamentLevel?: number;
  buttonSeat: number;
  tableId: string | number;
  players: IPlayer[];
  ante: number;
  dealtHand?: Card[];
  forceBetAction: IAction[];
  preflopAction: IAction[];
  flop?: Card[];
  flopAction?: IAction[];
  turn?: Card;
  turnAction?: IAction[];
  river?: Card;
  riverAction?: IAction[];
  showDownAction?: IAction[];
  raw: string;
}
