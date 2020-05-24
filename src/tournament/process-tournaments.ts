import * as fs from "fs";
import { IPlayer } from "./models/player";
import { ITournament } from "./models/tournament";
import { bindCallback } from "rxjs";
import {
  parseDollars,
  matchCurrency,
  getPokerStarsDate,
  checkIfNumber,
  parsingNumberFromMatchString,
  getStringValue,
  generalParseDollars,
  getNumberValue
} from "../methods";
import { NoMatchError } from "../models/no-match-error";
import logger from "../logger";

export const newTournaments$ = bindCallback(readTournamentSummary);

function readTournamentSummary(
  fileName: string,
  action: (tournaments: ITournament[]) => void
) {
  fs.readFile(fileName, { encoding: "utf8" }, (error, data) => {
    if (error) {
      throw error;
    }
    const tournamentStringArray = data.split("PokerStars Tournament");
    tournamentStringArray.shift();
    const tournaments = tournamentStringArray
      .filter((tournamentInfo) => {
        return filterOutPlayMoneyTournaments(tournamentInfo);
      })
      .map<ITournament>((tournamentInfo) => {
        const { buyIn, currency } = getBuyIn(tournamentInfo);
        const result: ITournament = {
          tournamentId: getTournamentId(tournamentInfo),
          start: getSartDate(tournamentInfo),
          end: getEndDate(tournamentInfo),
          buyIn,
          prizePool: getPrizePool(tournamentInfo),
          players: getPlayers(tournamentInfo),
          rebuyAddon: getRebuyAddon(tournamentInfo)
        };
        if (currency) {
          result.currency = currency;
        }
        return result;
      });
    action(tournaments);
  });
}

function getBuyIn(
  tournamentInfo: string
): { buyIn: number[]; currency: string | undefined } {
  let currency: string | undefined;
  let buyIn: number[] | NoMatchError;
  buyIn = getBuyInHelper(tournamentInfo);
  if (buyIn instanceof NoMatchError) {
    logger.log(tournamentInfo.slice(0, 100));
    buyIn = [];
    try {
      buyIn[0] = getNumberValue(
        tournamentInfo,
        /(?<=[^(\d )]Buy-In: ).+(?= SC)/g
      );
    } catch (error) {
      if (/(?<=[^(\d )]Buy-In: )\d+\/\d+/g.test(tournamentInfo)) {
        throw new Error("not accepting play money");
      }
      throw error;
    }
    currency = "SC";
  }
  return {
    buyIn,
    currency
  };
}

function getRebuyAddon(tournamentInfo: string): number[] | null {
  const matchRebuy = tournamentInfo.match(/(\d+\srebuy)/g);
  const matchAddon = tournamentInfo.match(/(\d+\saddon)/g);
  const rebuy = parsingNumberFromMatchString(matchRebuy);
  const addon = parsingNumberFromMatchString(matchAddon);
  if ((rebuy || rebuy === 0) && (addon || addon === 0)) {
    return [rebuy, addon];
  }
  if (rebuy || rebuy === 0 || addon || addon === 0) {
    logger.log(rebuy, addon);
    logger.log(tournamentInfo);
    throw new Error("this is not consider");
  }
  return null;
}

function getPlayers(tournamentInfo: string): IPlayer[] {
  const result: IPlayer[] = [];
  const contentArray = tournamentInfo.split("\n");
  contentArray.forEach((playerInfo, index, array) => {
    if (!/\s+\d+:\s/.test(playerInfo)) {
      return;
    }
    const player: IPlayer = {
      position: getPlayerPosition(playerInfo),
      name: getPlayerName(playerInfo),
      country: getPlayerCountry(playerInfo),
      prize: getPlayerPrize(playerInfo, index, array)
    };
    if (/Spin to Win -/g.test(player.country)) {
      logger.log(playerInfo);
      throw new Error("wrong country");
    }
    result.push(player);
  });
  return result;
}

function getPlayerPrize(
  playerInfo: string,
  index: number,
  playersInfoOfTournament: string[]
): number | string {
  if (/=20/g.test(playerInfo)) {
    return 0;
  }
  const prizeString = playerInfo.replace(/.+\),\s/g, "");
  const match = matchCurrency(prizeString);
  if (match !== null) {
    return parseDollars(match[0]);
  }
  const matchTargetTournament = prizeString.match(/\(qualified/g);
  if (matchTargetTournament !== null) {
    return "target-tournament";
  }
  if (prizeString.match(/still playing/g)) {
    return "still-playing-when-info-was-send";
  }
  if (prizeString.match(/=\r/g)) {
    const matchPrize = matchCurrency(
      (
        prizeString.replace("\r", "") + playersInfoOfTournament[index + 1]
      ).replace("=", "")
    );
    if (matchPrize) {
      return parseDollars(matchPrize[0]);
    }
    logger.log(playerInfo);
    throw new Error("not account for this player info");
  }
  if (prizeString.length <= 1) {
    return 0;
  }
  logger.log(playerInfo);
  throw new Error("not account for this player info");
}

function getPlayerCountry(playerInfo: string) {
  try {
    return getStringValue(playerInfo, /(?<= \()[A-Z].+(?=\),[ =])/g);
  } catch (error) {
    if (/(?<= )\(\)(?=,[ =])/g.test(playerInfo)) {
      return "";
    }
    logger.log(playerInfo);
    throw error;
  }
}

function getPlayerName(playerInfo: string) {
  return playerInfo.replace(/\s+\d+:\s/g, "").replace(/\s\([A-Z]([^]+$)/g, "");
}

function getPlayerPosition(playerInfo: string): number {
  const match = playerInfo.match(/\s+\d+:\s/);
  const result = parsingNumberFromMatchString(match);
  if (!result) {
    return -1;
  }
  return result;
}

function getSartDate(tournamentInfo: string): Date {
  const stringDate = tournamentInfo
    .split("\nTournament started ")[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  return getPokerStarsDate(stringDate);
}

function getEndDate(tournamentInfo: string): Date | null {
  const key = "\nTournament finished ";
  if (!tournamentInfo.includes(key)) {
    return null;
  }
  const stringDate = tournamentInfo
    .split(key)[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  return getPokerStarsDate(stringDate);
}

function getTournamentId(tournamentInfo: string): number {
  const result = Number.parseInt(
    tournamentInfo.split(" #")[1].split(",")[0],
    10
  );
  return checkIfNumber(result);
}

function getBuyInHelper(tournamentInfo: string): number[] | NoMatchError {
  if (/Freeroll[= ]/g.test(tournamentInfo)) {
    return [0, 0];
  }
  let buyInString = "";
  try {
    buyInString = getStringValue(
      tournamentInfo,
      /(?<=[^(\d )]Buy-In: ).+(?= USD)/g
    );
  } catch (error) {
    if (error instanceof NoMatchError) {
      return error;
    }
    logger.log(tournamentInfo.slice(0, 100));
    throw error;
  }
  try {
    return buyInString.split("/").map<number>((moneyString) => {
      return generalParseDollars(moneyString);
    });
  } catch (error) {
    if (error.message === "doesn't match currency") {
      const matchPlayMoney = tournamentInfo.match(
        /(?<=(Buy-In:\s)|(\/))(\d+)/g
      );
      if (matchPlayMoney) {
        throw new Error("not accepting play money");
      }
      logger.log(tournamentInfo);
      throw new Error("not matching expected buy-in");
    }
    throw error;
  }
}

function getPrizePool(tournamentInfo: string): number | string {
  if (tournamentInfo.split("\nTotal Prize Pool: ")[1]) {
    const result = Number.parseFloat(
      tournamentInfo
        .split("\nTotal Prize Pool: ")[1]
        .split(" ")[0]
        .replace(/[$]/g, "")
    );
    return checkIfNumber(result);
  }
  const matchTargetTournament = tournamentInfo.match(
    /Target\sTournament\s#\d+/g
  );
  const matchNumberTickets = tournamentInfo.match(/\d+\stickets/g);
  if (matchNumberTickets !== null && matchTargetTournament !== null) {
    return (
      matchTargetTournament[0].replace(/[^\d]/g, "") +
      "-" +
      matchNumberTickets[0].replace(/\s/g, "-")
    );
  }
  const playerArray = getPlayers(tournamentInfo);
  let totalPrize: number = 0;
  playerArray.forEach((player) => {
    if (typeof player.prize !== "number") {
      throw new Error("prize is not a number");
    }
    totalPrize += player.prize;
  });
  return totalPrize;
}

function filterOutPlayMoneyTournaments(tournamentInfo: string) {
  try {
    getBuyIn(tournamentInfo);
    return true;
  } catch (error) {
    if (error.message === "not accepting play money") {
      return false;
    }
    throw error;
  }
}
