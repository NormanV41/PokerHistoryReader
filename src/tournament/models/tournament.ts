import { Player } from "./player";

export interface Tournament {
  tournamentId: number;
  start: Date;
  end: Date | null;
  prizePool: number | string;
  rebuyAddon: number[] | null;
  buyIn: number[];
  players: Player[];
}
