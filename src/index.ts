import * as fs from "fs";
import * as timezone from "moment-timezone";

fs.readFile(
  "./data/tournament-summaries/junio_1.eml",
  { encoding: "utf8" },
  (error, data) => {
    if (error) throw error;
    let tournamentStringArray = data.split("\nPokerStars Tournament");
    tournamentStringArray.shift();
    tournamentStringArray.forEach((content, index) => {
      let contentArray = content.split("\n");
      contentArray.forEach((string, index) => {
        if (/\s+\d+:\s/.test(string)) {
          if (!/=20/g.test(string)) {
            let prizeString = string.replace(/.+\),\s/g, "");
            let match = matchCurrency(prizeString);
            if (match === null) {
              let matchTargetTournament = prizeString.match(/\(qualified/g);
              if (matchTargetTournament === null) {
                if (prizeString.match(/still playing/g)) return;
                //console.log(prizeString.split("="))
                if (prizeString.match(/=\r/g) === null) {
                  console.log(prizeString);
                  return;
                }
                let matchPrize = matchCurrency(
                  (
                    prizeString.replace("\r", "") + contentArray[index + 1]
                  ).replace("=", "")
                );
                if (matchPrize === null) {
                  console.log(
                    prizeString.replace("\r", "") + contentArray[index + 1]
                  );
                  return;
                }
                console.log(parseDollars(matchPrize[0]));
                return;
              }
              // console.log("qualified")
              return;
            }
            console.log(parseDollars(match[0]));
          }
        }
      });
    });
    /* let tournaments = tournamentStringArray.map<Tournament>(content=>{
    })*/
  }
);

function matchCurrency(test: string) {
  return test.match(/\$(\d{1,3}(\,\d{3})*)(\.\d{2})?/g);
}

function parseDollars(money: string): number {
  let result = Number.parseFloat(money[0].replace(/[\,\$]/g, ""));
  if (!Number.isNaN(result)) throw new Error("returns not a number");
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
  if (match !== null)
    return Number.parseInt(match[0].replace(/(?:[\s:]+)/g, ""));
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
  return Number.parseInt(content.split(" #")[1].split(",")[0]);
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
  return [paidMinusTaken, taken];
}

function getPrizePool(content: string): number {
  if (!content.split("\nTotal Prize Pool: ")[1])
    return Number.parseFloat(content.split(" USD added")[0].split("$")[1]);
  return Number.parseFloat(
    content
      .split("\nTotal Prize Pool: ")[1]
      .split(" ")[0]
      .replace(/[$]/g, "")
  );
}

function getPokerStarsDate(dateStringWithOutEt: string): Date {
  return timezone
    .tz(dateStringWithOutEt, "YYYY/MM/DD HH:mm:ss", "America/New_York")
    .toDate();
}
