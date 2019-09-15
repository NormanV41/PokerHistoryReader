import { IPlayer } from "./player";

export interface ITournament {
  tournamentId: number;
  start: Date;
  end: Date | null;
  prizePool: number | string;
  rebuyAddon: number[] | null;
  buyIn: number[];
  players: IPlayer[];
}
