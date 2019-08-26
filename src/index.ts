import {
  addTournaments,
  existingTournaments$
} from "./tournament/process-email";
import * as fs from "fs";
import { NotANumberError } from "./models/not-a-number-error";
import { checkIfNumber } from "./methods";
import { parsingNumberFromMatchString } from "./methods";
import { RomanNumeral } from "./hand/roman-numeral";
import { Level } from "./hand/models/level";

//addTournaments("agosto")
/*existingTournaments$().subscribe(data => data.forEach(tournament=>{
  console.log(tournament.tournamentId)
}));*/

fs.readFile(
  "./data/hand-history/Hands_26.12.18_5.5.19.txt",
  {
    encoding: "utf8"
  },
  (error, data) => {
    if (error) throw error;
    let handStringArray = data.split(/\nHand\s\#/g);
    handStringArray.shift();
    handStringArray.forEach(handData => {
      console.log(getLevel(handData));
    });
  }
);

function getLevel(handData: string): Level | null {
  if (!isTournament(handData)) {
    return null;
  }
  let smallBigArray = getLevelSmallBigBlind(handData);
  return {
    smallBlind: smallBigArray[0],
    bigBlind: smallBigArray[1],
    level: getLevelLevel(handData)
  };
}

function getLevelLevel(handData: string): number {
  let match = handData.match(/(?<=\sLevel\s)[A-Z]+/g);
  if (!match) {
    console.log(handData.slice(0, 500));
    throw new Error("didnt match level roman number");
  }
  return new RomanNumeral(match[0]).toInt();
}

function getLevelSmallBigBlind(handData: string): number[] {
  let match = handData.match(/(?<= Level [A-Z]+\s[(])\d+\/\d+/g);
  if (!match) {
    console.log(handData.slice(0, 500));
    throw new Error("didnt match level small and big blind");
  }
  let smallBigArray = match[0].split("/");
  let smallBlind = Number.parseFloat(smallBigArray[0]);
  let bigBlind = Number.parseFloat(smallBigArray[1]);
  if (
    !Number.isInteger(checkIfNumber(smallBlind)) ||
    !Number.isInteger(checkIfNumber(bigBlind))
  )
    throw new Error("not integer");
  return [smallBlind, bigBlind];
}

function isTournament(handData: string): boolean {
  if (getTournamentId(handData)) return true;
  return false;
}

function getTournamentId(handData: string) {
  let idMatch = handData.match(/(?<=Tournament\s#)\d{6,}/g);
  return parsingNumberFromMatchString(idMatch);
}

function getHandId(handData: string): number {
  let idMatch = handData.match(/(?<=Hand\s#)\d{6,}/g);
  let result = parsingNumberFromMatchString(idMatch);
  if (!result) throw new Error("id didn't match");
  return result;
}
