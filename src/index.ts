import * as fs from "fs";
import * as timezone from "moment-timezone";
import { NotANumberError } from "./models/not-a-number-error";
import { Player } from "./tournament/models/player";
import { Tournament } from "./tournament/models/tournament";
import { bindCallback } from "rxjs";
import { map } from "rxjs/operators";

let newTournaments$ = bindCallback(readTournamentSummary);
let existingTournaments$ = bindCallback(readExistingTournaments);

/*existingTournaments$().subscribe(data => {
  console.log(data.length);
  console.log(data[data.length - 1].start);
});*/

//preparingToMergeTournaments("febrero");

function writeTournamentsJson(tournaments: Tournament[]) {
  fs.writeFile(
    "./data/tournament-summaries/ProcessData/tournaments.json",
    JSON.stringify(tournaments),
    error => {
      if (error) throw error;
    }
  );
}

function preparingToMergeTournaments(tournamentsSummaryFileName: string) {
  let newTournaments: Tournament[] | null = null;
  let oldTournaments: Tournament[] | null = null;
  newTournaments$(tournamentsSummaryFileName)
    .pipe(
      map(data =>
        data.sort((el1, el2) => {
          return comparingDates(el1.start, el2.start);
        })
      )
    )
    .subscribe(data => {
      newTournaments = data;
      console.log(newTournaments[newTournaments.length - 1].start);
      if (newTournaments && oldTournaments)
        mergingTournaments(newTournaments, oldTournaments);
    });
  existingTournaments$().subscribe(data => {
    oldTournaments = data;
    if (newTournaments && oldTournaments)
      mergingTournaments(newTournaments, oldTournaments);
  });
}

function mergingTournaments(
  newTournaments: Tournament[],
  oldTournaments: Tournament[]
) {
  let oldGreatestDate = new Date(
    oldTournaments[oldTournaments.length - 1].start
  ).getTime();
  let cutIndex = newTournaments.findIndex(tournament => {
    let start = tournament.start.getTime();
    return start > oldGreatestDate;
  });
  console.log(cutIndex);
  if (cutIndex === -1) return;
  let filterNew = newTournaments.slice(cutIndex);
  let result = oldTournaments.concat(filterNew);
  console.log(result.length);
  writeTournamentsJson(result);
}

function readExistingTournaments(
  action: (oldTournaments: Tournament[]) => void
) {
  fs.readFile(
    "./data/tournament-summaries/ProcessData/tournaments.json",
    { encoding: "utf8" },
    (error, data) => {
      if (error) throw error;
      let oldTournaments: Tournament[] = JSON.parse(data);
      action(oldTournaments);
    }
  );
}

function readTournamentSummary(
  fileName: string,
  action: (tournaments: Tournament[]) => void
) {
  fs.readFile(
    `./data/tournament-summaries/${fileName}.eml`,
    { encoding: "utf8" },
    (error, data) => {
      if (error) throw error;
      let tournamentStringArray = data.split("\nPokerStars Tournament");
      tournamentStringArray.shift();
      let tournaments = tournamentStringArray.map<Tournament>(
        (tournamentInfo, index) => {
          return {
            tournamentId: getTournamentId(tournamentInfo),
            start: getSartDate(tournamentInfo),
            end: getEndDate(tournamentInfo),
            buyIn: getBuyIn(tournamentInfo),
            prizePool: getPrizePool(tournamentInfo),
            players: getPlayers(tournamentInfo),
            rebuyAddon: getRebuyAddon(tournamentInfo)
          };
        }
      );
      action(tournaments);
    }
  );
}

/**
 * @returns 1 if date1 is greater than date2, 0 if they are equal,
 *          and -1 if date1 is less than date2
 */
function comparingDates(date1: Date, date2: Date) {
  let ms1 = date1.getTime();
  let ms2 = date2.getTime();
  if (ms1 > ms2) return 1;
  if (ms1 == ms2) return 0;
  return -1;
}

function getRebuyAddon(tournamentInfo: string): number[] | null {
  let matchRebuy = tournamentInfo.match(/(\d+\srebuy)/g);
  let matchAddon = tournamentInfo.match(/(\d+\saddon)/g);
  if (matchRebuy && matchAddon) {
    let rebuy = Number.parseInt(matchRebuy[0].replace(/[^\d]/g, ""));
    let addon = Number.parseInt(matchAddon[0].replace(/[^\d]/g, ""));
    if (Number.isNaN(rebuy) && Number.isNaN(addon)) throw new NotANumberError();
    return [rebuy, addon];
  }
  if (matchAddon || matchRebuy) throw new Error("this is not consider");
  return null;
}

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

function getSartDate(tournamentInfo: string): Date {
  let string = tournamentInfo
    .split("\nTournament started ")[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  return getPokerStarsDate(string);
}

function getEndDate(tournamentInfo: string): Date | null {
  let key = "\nTournament finished ";
  if (!tournamentInfo.includes(key)) return null;
  let string = tournamentInfo
    .split(key)[1]
    .split("\n")[0]
    .replace(/[ET]/g, "");
  return getPokerStarsDate(string);
}

function getTournamentId(tournamentInfo: string): number {
  let result = Number.parseInt(tournamentInfo.split(" #")[1].split(",")[0]);
  if (Number.isNaN(result)) throw new NotANumberError();
  return result;
}

function getBuyIn(tournamentInfo: string): number[] {
  if (/Freeroll/g.test(tournamentInfo)) return [0, 0];
  let paidMinusTaken = 0;
  let taken = 0;
  tournamentInfo
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

function getPrizePool(tournamentInfo: string): number | string {
  if (tournamentInfo.split("\nTotal Prize Pool: ")[1]) {
    let result = Number.parseFloat(
      tournamentInfo
        .split("\nTotal Prize Pool: ")[1]
        .split(" ")[0]
        .replace(/[$]/g, "")
    );
    if (Number.isNaN(result)) throw new NotANumberError();
    return result;
  }
  let matchTargetTournament = tournamentInfo.match(/Target\sTournament\s#\d+/g);
  let matchNumberTickets = tournamentInfo.match(/\d+\stickets/g);
  if (matchNumberTickets !== null && matchTargetTournament !== null) {
    return (
      matchTargetTournament[0].replace(/[^\d]/g, "") +
      "-" +
      matchNumberTickets[0].replace(/\s/g, "-")
    );
  }
  let playerArray = getPlayers(tournamentInfo);
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
