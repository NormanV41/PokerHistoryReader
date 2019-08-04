import * as fs from "fs";
import * as timezone from "moment-timezone";
import { Tournament } from "./tournament/models/tournament";

fs.readFile(
  "./data/tournament-summaries/enero.eml",
  { encoding: "utf8" },
  (error, data) => {
    if (error) throw error;
    let tournamentStringArray = data.split("\nPokerStars Tournament");
    tournamentStringArray.shift();
    tournamentStringArray.forEach((content, index) => {
      console.log(content);
    });
    /* let tournaments = tournamentStringArray.map<Tournament>(content=>{
    })*/
  }
);

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
