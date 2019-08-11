import * as fs from "fs";
import * as timezone from "moment-timezone";
import { NotANumberError } from "./models/not-a-number-error";
import { Player } from "./tournament/models/player";

fs.readFile(
  "./data/tournament-summaries/enero.eml",
  { encoding: "utf8" },
  (error, data) => {
    if (error) throw error;
    let tournamentStringArray = data.split("\nPokerStars Tournament");
    tournamentStringArray.shift();
    tournamentStringArray.forEach((content, index) => {
      //console.log(getPlayers(content));
      getPrizePool(content);
    });
    /* let tournaments = tournamentStringArray.map<Tournament>(content=>{
    })*/
  }
);

function getPlayers(tournamentInfo: string): Player[] {
  let result: Player[] = [];
  let contentArray = tournamentInfo.split("\n");
  contentArray.forEach((playerInfo, index, array) => {
    if (!/\s+\d+:\s/.test(playerInfo)) return;
    let player: Player = {
      position: getPlayerPosition(playerInfo),
      name: getPlayerName(playerInfo),
      country: getPlayerCountry(playerInfo),
      prize: getPlayerPrize(playerInfo, index, array)
    };
    result.push(player);
  });
  return result;
}

function getPlayerPrize(
  playerInfo: string,
  index: number,
  playersInfoOfTournament: string[]
): number | string {
  if (/=20/g.test(playerInfo)) return 0;
  let prizeString = playerInfo.replace(/.+\),\s/g, "");
  let match = matchCurrency(prizeString);
  if (match !== null) return parseDollars(match[0]);
  let matchTargetTournament = prizeString.match(/\(qualified/g);
  if (matchTargetTournament !== null) return "target-tournament";
  if (prizeString.match(/still playing/g))
    return "still-playing-when-info-was-send";
  if (prizeString.match(/=\r/g)) {
    let matchPrize = matchCurrency(
      (
        prizeString.replace("\r", "") + playersInfoOfTournament[index + 1]
      ).replace("=", "")
    );
    if (matchPrize) return parseDollars(matchPrize[0]);
    console.log(playerInfo);
    throw new Error("not account for this player info");
  }
  console.log(playerInfo);
  throw new Error("not account for this player info");
}

function matchCurrency(test: string) {
  return test.match(/\$(\d{1,3}(\,\d{3})*)(\.\d{2})?/g);
}

function parseDollars(money: string): number {
  let result = Number.parseFloat(money.replace(/[\,\$]/g, ""));
  if (Number.isNaN(result)) throw new NotANumberError();
  return result;
}

function getPlayerCountry(playerInfo: string) {
  return playerInfo
    .replace(/\s+\d+:\s/g, "")
    .replace(/.+\s\((?=[A-Z])/g, "")
    .replace(/\),([^]+$)/g, "");
}

function getPlayerName(playerInfo: string) {
  return playerInfo.replace(/\s+\d+:\s/g, "").replace(/\s\([A-Z]([^]+$)/g, "");
}

function getPlayerPosition(playerInfo: string): number {
  let match = playerInfo.match(/\s+\d+:\s/);
  if (match !== null) {
    let result = Number.parseInt(match[0].replace(/(?:[\s:]+)/g, ""));
    if (Number.isNaN(result)) throw new NotANumberError();
    return result;
  }
  return -1;
}

function getSartDate(content: string): Date {
  let string = content
    .split("\nTournament started ")[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  return getPokerStarsDate(string);
}

function getEndDate(content: string): Date | null {
  let key = "\nTournament finished ";
  if (!content.includes(key)) return null;
  let string = content
    .split(key)[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  console.log(string);
  return getPokerStarsDate(string);
}

function getTournamentId(content: string): number {
  let result = Number.parseInt(content.split(" #")[1].split(",")[0]);
  if (Number.isNaN(result)) throw new NotANumberError();
  return result;
}

function getBuyIn(content: string): number[] {
  if (content.split("\nFreeroll=").length > 1) return [0, 0];
  let paidMinusTaken = 0;
  let taken = 0;
  content
    .split("\nBuy-In: ")[1]
    .split(" ")[0]
    .replace(/[$]/g, "")
    .split("/")
    .forEach((element, index) => {
      if (index == 0) paidMinusTaken = Number.parseFloat(element);
      else taken = Number.parseFloat(element);
    });
  if (Number.isNaN(paidMinusTaken) || Number.isNaN(taken))
    throw new Error("not a number");
  return [paidMinusTaken, taken];
}

function getPrizePool(content: string): number | string {
  if (content.split("\nTotal Prize Pool: ")[1]) {
    let result = Number.parseFloat(
      content
        .split("\nTotal Prize Pool: ")[1]
        .split(" ")[0]
        .replace(/[$]/g, "")
    );
    if (Number.isNaN(result)) throw new NotANumberError();
    return result;
  }
  let matchTargetTournament = content.match(/Target\sTournament\s#\d+/g);
  let matchNumberTickets = content.match(/\d+\stickets/g);
  if (matchNumberTickets !== null && matchTargetTournament !== null) {
    return (
      matchTargetTournament[0].replace(/[^\d]/g, "") +
      "-" +
      matchNumberTickets[0].replace(/\s/g, "-")
    );
  }
  let playerArray = getPlayers(content);
  let totalPrize: number = 0;
  playerArray.forEach(player => {
    if (typeof player.prize !== "number")
      throw new Error("prize is not a number");
    totalPrize += player.prize;
  });
  return totalPrize;
}

function getPokerStarsDate(dateStringWithOutEt: string): Date {
  return timezone
    .tz(dateStringWithOutEt, "YYYY/MM/DD HH:mm:ss", "America/New_York")
    .toDate();
}
