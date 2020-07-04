import { IHand } from "./models/hand";
import { readFile } from "fs";
import {
  getForcedBetsActions,
  getPreflopAction,
  getFlopAction,
  getTurnOrRiverAction,
  turnOrRiverWasPlayed,
  getHand,
  flopWasPlayed,
  getPreflopActionString,
  getShowDownAction
} from "./process-actions";
import {
  filterUndefinedAndNull,
  parsingNumberFromMatchString,
  parseDollars,
  checkIfNumber,
  getPokerStarsDate,
  getStringValue,
  generalParseDollars
} from "../methods";
import { Card } from "./models/card";
import { IPlayer } from "./models/player";
import { RomanNumeral } from "./roman-numeral";
import { bindCallback } from "rxjs";
import logger from "../logger";
import { IFinalPot } from "./models/final-pot";

export const readHandsHistory$ = bindCallback(readHandsHistory);

function readHandsHistory(fileName: string, action: (hands: IHand[]) => void) {
  readFile(
    fileName,
    {
      encoding: "utf8"
    },
    (error, data) => {
      if (error) {
        throw error;
      }
      const handStringArray = data.split(
        /PokerStars (?=(Hand #)|(Zoom Hand #))/g
      );
      handStringArray.shift();
      const hands: IHand[] = handStringArray
        .filter(
          (handDataOrTrash) =>
            filterOutTrash(handDataOrTrash) &&
            filteringOutWierdFormats(handDataOrTrash)
        )
        .map<IHand>((handData) => {
          try {
            return handDataStringToObject(handData);
          } catch (error) {
            logger.log(handData);
            throw error;
          }
        });
      action(hands);
    }
  );
}

function filterOutTrash(handDataOrTrash: string) {
  if (!handDataOrTrash) {
    return false;
  }
  if (handDataOrTrash.length < 50) {
    return false;
  }
  if (
    /Transcript for your last \d+ hands requested by /g.test(handDataOrTrash)
  ) {
    return false;
  }
  return checkIfHandDataIsComplete(handDataOrTrash);
}

function filteringOutWierdFormats(handString: string) {
  if (/(?<=Level .+ \()Button Blind\s\d+ - Ante\s\d+ /g.test(handString)) {
    return false;
  }
  return !/Razz Limit/g.test(handString);
}

function handDataStringToObject(handData: string) {
  const players = getPlayers(handData);
  const playersNames = players.map<string>((player) => player.name);
  const totalPot = getTotalPot(handData);
  console.log(totalPot);
  const result = {
    id: getHandId(handData),
    tournamentId: getTournamentId(handData),
    date: getDate(handData),
    smallBigBlind: getSmallBigBlind(handData),
    tournamentLevel: getLevel(handData),
    buttonSeat: whichSeatIsButton(handData),
    tableId: getTableId(handData),
    players,
    ante: getAnte(handData),
    dealtHand: getDealtHandObject(handData),
    forceBetAction: getForcedBetsActions(handData, players, playersNames),
    preflopAction: getPreflopAction(handData, players, playersNames),
    flop: getFlop(handData),
    flopAction: getFlopAction(handData, players, playersNames),
    turn: getTurnOrRiver(handData),
    turnAction: getTurnOrRiverAction(handData, players, playersNames),
    river: getTurnOrRiver(handData, true),
    riverAction: getTurnOrRiverAction(handData, players, playersNames, true),
    showDownAction: getShowDownAction(handData, players, playersNames),
    raw: handData
  };
  return filterUndefinedAndNull(result) as IHand;
}

function getTurnOrRiver(handData: string, isRiver = false) {
  if (turnOrRiverWasPlayed(handData, isRiver)) {
    const turnOrRiverString = getStringValue(
      handData,
      isRiver
        ? /(?<=\*\*\* RIVER \*\*\* \[.+\]).+/g
        : /(?<=\*\*\* TURN \*\*\* \[.+\]).+/g
    );
    const cards = getHand(turnOrRiverString);
    if (cards.length > 1) {
      logger.log(handData);
      throw new Error("not handled yet");
    }
    return cards[0];
  }
  return undefined;
}

function getFlop(handData: string): Card[] | undefined {
  if (flopWasPlayed(handData)) {
    const flopString = getStringValue(handData, /(?<=\*\*\* FLOP \*\*\*).+/g);
    return getHand(flopString);
  }
  return undefined;
}

function getDealtHandObject(handData: string) {
  const dealtHandString = getDealtHandString(handData);
  if (!dealtHandString) {
    return null;
  }
  const cardsString = dealtHandString.split(" ");
  if (cardsString.length !== 2 && cardsString.length !== 4) {
    logger.log(handData);
    logger.log(dealtHandString);
    throw new Error("is not length 2 or 4");
  }
  return cardsString.map<Card>((card) => new Card(card));
}

function getDealtHandString(handData: string) {
  const match = getPreflopActionString(handData).match(
    /(?<=Dealt to .+ \[).+(?=\])/g
  );
  if (match) {
    return match[0];
  }
  if (/ will be allowed to play after the button/g.test(handData)) {
    return null;
  }
  logger.log(getPreflopActionString(handData));
  throw new Error("didn't match dealt hands");
}

function getAnte(handData: string) {
  const match = handData.match(/(?<=\sposts\sthe\sante\s)\d+/);
  const ante = parsingNumberFromMatchString(match);
  if (ante) {
    return ante;
  }
  return 0;
}

function getPlayers(handData: string): IPlayer[] {
  let isAfterSummary = false;
  return handData
    .split("\n")
    .filter((newLine) => {
      if (/\*+\sSUMMARY.+/g.test(newLine)) {
        isAfterSummary = true;
      }
      if (isAfterSummary) {
        return false;
      }
      return /Seat\s\d{1,2}:\s/g.test(newLine);
    })
    .map<IPlayer>((playerData) => {
      return {
        name: getPlayerName(playerData),
        seat: getPlayerSeat(playerData),
        stack: getPlayerStack(playerData)
      };
    });
}

function getPlayerStack(playerData: string) {
  let match = playerData.match(/(?<=\s\()(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)/g);
  if (match) {
    return parseDollars(match[0]);
  }
  match = playerData.match(/(?<=\s\()\d+/g);
  const stack = parsingNumberFromMatchString(match);
  if (stack) {
    return stack;
  }
  throw new Error("didn't find the stack");
}

function getPlayerName(playerData: string): string {
  const match = playerData
    .replace(/Seat\s\d{1,2}:\s/g, "")
    .match(/.+(?=\s\(\$?\d)/g);
  if (!match) {
    logger.log(playerData);
    throw new Error("player name didn't match");
  }
  return match[0];
}

function getTableId(handData: string): number | string {
  const match = handData.match(
    /(?<=Table\s'\d{6,}\s)\d|(?<=Table\s')[A-Z][a-z]+/g
  );
  if (!match) {
    logger.log(handData.slice(0, 500));
    throw new Error("didnt match table id");
  }
  const matchElement = match[0];
  const tryNumber = Number.parseInt(matchElement, 10);
  if (Number.isNaN(tryNumber)) {
    return matchElement;
  }
  return tryNumber;
}

function whichSeatIsButton(handData: string): number {
  const match = handData.match(/(?<=Seat\s#)\d{1,2}(?=\sis\sthe\sbutton)/g);
  const result = parsingNumberFromMatchString(match);
  if (!result) {
    logger.log(handData);
    throw new Error("is not a number");
  }
  return result;
}

function getPlayerSeat(playerData: string): number {
  const match = playerData.match(/(?<=Seat\s)\d{1,2}(?=:\s)/g);
  const result = parsingNumberFromMatchString(match);
  if (!result) {
    throw new Error("no match for number");
  }
  return result;
}

function getLevel(handData: string): number | null {
  if (!isTournament(handData)) {
    return null;
  }
  const match = handData.match(/(?<=\sLevel\s)[A-Z]+/g);
  if (!match) {
    logger.log(handData.slice(0, 500));
    throw new Error("didnt match level roman number");
  }
  return new RomanNumeral(match[0]).toInt();
}

function getSmallBigBlind(handData: string): number[] {
  const match = handData.match(
    /((?<=Limit\s\().+(?=\)))|((?<=Level\s[A-Z]+\s\().+(?=\)))/g
  );
  if (!match) {
    logger.log(handData.slice(0, 500));
    throw new Error("didnt match level small and big blind");
  }
  const smallBigArray = match[0].split("/");
  const smallBlind = Number.parseFloat(smallBigArray[0].replace(/\$/g, ""));
  const bigBlind = Number.parseFloat(smallBigArray[1].replace(/\$/g, ""));
  return [checkIfNumber(smallBlind), checkIfNumber(bigBlind)];
}

function getDate(handData: string) {
  const match = handData.match(/\d{4}\/\d{2}\/\d{2}\s\d{1,2}:\d{2}:\d{2}/g);
  if (!match) {
    throw new Error("didn't match date");
  }
  return getPokerStarsDate(match[0]);
}

function isTournament(handData: string): boolean {
  if (getTournamentId(handData)) {
    return true;
  }
  return false;
}

function getTournamentId(handData: string) {
  const idMatch = handData.match(/(?<=Tournament\s#)\d{6,}/g);
  return parsingNumberFromMatchString(idMatch);
}

function getHandId(handData: string): number {
  const idMatch = handData.match(/(?<=Hand\s#)\d{6,}/g);
  const result = parsingNumberFromMatchString(idMatch);
  if (!result) {
    throw new Error("id didn't match");
  }
  return result;
}

function checkIfHandDataIsComplete(handData: string) {
  const test = /\*{3} SUMMARY \*{3}([\n,\r].*)+Seat \d+/g.test(handData);
  if (!test) {
    console.log(`Hand data with hand id ${getHandId(handData)} is incomplete`);
  }
  return test;
}

function getTotalPot(handData: string): IFinalPot {
  let totalPot = 0;
  const matchTotalPot = handData.match(
    /(?<=Total pot )((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))(?= \| Rake)/g
  );
  if (matchTotalPot) {
    totalPot = parseDollars(matchTotalPot[0]);
    return { totalPot };
  }

  const matchSidePot = handData.match(
    /(?<=Side pot(-\d)? )((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))(?=\. )/g
  );
  if (!matchSidePot) {
    throw new Error("total pot not handled");
  }
  const sidePots = matchSidePot.map((match) => parseDollars(match));
  const matchMainPot = handData.match(
    /(?<=Main pot )((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))(?=\. )/g
  );
  if (!matchMainPot) {
    throw new Error("total pot not handled");
  }
  const mainPot = parseDollars(matchMainPot[0]);
  const matchTotalPotAfterMain = handData.match(
    /(?<=Total pot )((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))(?= Main)/g
  );
  if (!matchTotalPotAfterMain) {
    throw new Error("total pot not handled");
  }
  totalPot = parseDollars(matchTotalPotAfterMain[0]);

  return { totalPot, mainPot, sidePots };
}
