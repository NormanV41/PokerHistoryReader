import { Player } from "./player";

export interface Tournament {
  tournamentId: number;
  start: Date;
  end: Date;
  position: number;
  prizePool: number;
  addOnReBuy: number[];
  buyIn: number[];
  targetId: number;
  players: Player[];
}
