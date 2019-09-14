/*import {
  addTournaments,
  existingTournaments$
} from "./tournament/process-email";*/
import * as fs from "fs";
/*import { NotANumberError } from "./models/not-a-number-error";
import {
  parsingNumberFromMatchString,
  getPokerStarsDate,
  checkIfNumber,
  parseDollars
} from "./methods";
import { RomanNumeral } from "./hand/roman-numeral";
import { Player } from "./hand/models/player";
import { Suit } from "./hand/models/suit";
import { Card } from "./hand/models/card";
import { platform } from "os";*/

// addTournaments("agosto")
/*existingTournaments$().subscribe(data => data.forEach(tournament=>{
  console.log(tournament.tournamentId)
}));*/

const readStream = fs.createReadStream(
  "./data/tournament-summaries/ProcessData/tournaments.json",
  { encoding: "utf8" }
);

/*fs.readFile(
  "./data/hand-history/Hands_26.12.18_5.5.19.txt",
  {
    encoding: "utf8"
  },
  (error, data) => {
    if (error) throw error;
    let handStringArray = data.split(/\nHand\s\#/g);
    handStringArray.shift();
    handStringArray.forEach(handData => {
      let players = getPlayers(handData);
      let playersNames = players.map<string>(player => player.name);
      let preflopAction = getPreflopAction(handData);
      preflopAction
        .split("\n")
        .filter(action => !/(?<=NormanV41\s\[).+(?=\])/g.test(action))
        .forEach(action => {
          let seat: number | null = null;
          let processAction: string | null = null;
          let amount: number | null = null;
          let raiseToAmount: number | null = null;
          if (
            /(\swins\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)\sfor\seliminating\s/g.test(
              action
            )
          ) {
            console.log(action);
            return;
          }
          let counter = 0;
          playersNames.forEach((player, index) => {
            if (action.split(player).length > 1) {
              seat = players[index].seat;
              if (/:\sfolds/g.test(action)) {
                processAction = "folds";
                amount = 0;
              }
              if (/:\sraises\s/g.test(action)) {
                processAction = "raises";
                let matchAmount = action.match(
                  /(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)(?=\sto\s)/g
                );
                if (!matchAmount) {
                  console.log(action);
                  throw new Error("does not match amount");
                }
                let amount = parseDollars(matchAmount[0]);
              }
              if (processAction === null) {
                console.log(action);
                throw new Error("action not handled");
              }
              counter++;
            }
          });
          if (/\s\[observer\]\ssaid,/g.test(action)) {
            console.log(action);
            counter++;
          }
          if (/ re-buys and receives /g.test(action) && counter === 0) {
            console.log(action);
            counter++;
          }
          if (/ has returned/g.test(action) && counter === 0) {
            console.log(action);
            counter++;
          }
          if (/ is sitting out/g.test(action) && counter === 0) {
            console.log(action);
            counter++;
          }
          if (/ leaves the table/g.test(action) && counter === 0) {
            console.log(action);
            counter++;
          }

          if (/ joins the table/g.test(action) && counter === 0) {
            console.log(action);
            counter++;
          }
          if (counter !== 1) {
            console.log(handData);
            console.log(playersNames);
            console.log();
            console.log(preflopAction);
            console.log(counter);
            console.log(action);
            throw new Error("something unexpected");
          }
        });
    });
  }
);

function getDealtHandObject(handData: string) {
  const dealtHandString = getDealtHandString(handData);
  if (!dealtHandString) return null;
  let cardsString = dealtHandString.split(" ");
  if (cardsString.length !== 2 && cardsString.length !== 4) {
    console.log(handData);
    console.log(dealtHandString);
    throw new Error("is not length 2 or 4");
  }
  return cardsString.map<Card>(card => new Card(card));
}

function getDealtHandString(handData: string) {
  let match = getPreflopAction(handData).match(/(?<=NormanV41\s\[).+(?=\])/g);
  if (match) return match[0];
  if (/NormanV41 will be allowed to play after the button/g.test(handData))
    return null;
  console.log(getPreflopAction(handData));
  throw new Error("didn't match dealt hands");
}

function getPreflopAction(handData: string) {
  return handData
    .split(/\*{3}\sHOLE\sCARDS\s\*{3}/g)[1]
    .split(/\*{3}\s([A-Z]|\s)+\s\*{3}/g)[0]
    .trim();
}

function getAnte(handData: string) {
  let match = handData.match(/(?<=\sposts\sthe\sante\s)\d+/);
  let ante = parsingNumberFromMatchString(match);
  if (ante) return ante;
  return 0;
}

function getPlayers(handData: string): Player[] {
  let isAfterSummary = false;
  return handData
    .split("\n")
    .filter(newLine => {
      if (/\*+\sSUMMARY.+/g.test(newLine)) {
        isAfterSummary = true;
      }
      if (isAfterSummary) return false;
      return /Seat\s\d{1,2}:\s/g.test(newLine);
    })
    .map<Player>(playerData => {
      return {
        name: getPlayerName(playerData),
        seat: getPlayerSeat(playerData),
        stack: getPlayerStack(playerData)
      };
    });
}

function getPlayerStack(playerData: string) {
  let match = playerData.match(/(?<=\s\()(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)/g);
  if (match) return parseDollars(match[0]);
  match = playerData.match(/(?<=\s\()\d+/g);
  let stack = parsingNumberFromMatchString(match);
  if (stack) return stack;
  throw new Error("didn't find the stack");
}

function getPlayerName(playerData: string): string {
  let match = playerData
    .replace(/Seat\s\d{1,2}:\s/g, "")
    .match(/.+(?=\s\(\$?\d)/g);
  if (!match) {
    console.log(playerData);
    throw new Error("player name didn't match");
  }
  return match[0];
}

function getTableId(handData: string): number | string {
  let match = handData.match(
    /(?<=Table\s'\d{6,}\s)\d|(?<=Table\s')[A-Z][a-z]+/g
  );
  if (!match) {
    console.log(handData.slice(0, 500));
    throw new Error("didnt match table id");
  }
  let matchElement = match[0];
  let tryNumber = Number.parseInt(matchElement);
  if (Number.isNaN(tryNumber)) return matchElement;
  return tryNumber;
}

function whichSeatIsButton(handData: string): number {
  let match = handData.match(/(?<=Seat\s#)\d{1,2}(?=\sis\sthe\sbutton)/g);
  let result = parsingNumberFromMatchString(match);
  if (!result) throw new Error("is not a number");
  return result;
}

function getPlayerSeat(playerData: string): number {
  let match = playerData.match(/(?<=Seat\s)\d{1,2}(?=:\s)/g);
  let result = parsingNumberFromMatchString(match);
  if (!result) throw new Error("no match for number");
  return result;
}

function getLevel(handData: string): number | null {
  if (!isTournament(handData)) return null;
  let match = handData.match(/(?<=\sLevel\s)[A-Z]+/g);
  if (!match) {
    console.log(handData.slice(0, 500));
    throw new Error("didnt match level roman number");
  }
  return new RomanNumeral(match[0]).toInt();
}

function getSmallBigBlind(handData: string): number[] {
  let match = handData.match(
    /((?<=Limit\s\().+(?=\)))|((?<=Level\s[A-Z]+\s\().+(?=\)))/g
  );
  if (!match) {
    console.log(handData.slice(0, 500));
    throw new Error("didnt match level small and big blind");
  }
  let smallBigArray = match[0].split("/");
  let smallBlind = Number.parseFloat(smallBigArray[0].replace(/\$/g, ""));
  let bigBlind = Number.parseFloat(smallBigArray[1].replace(/\$/g, ""));
  return [checkIfNumber(smallBlind), checkIfNumber(bigBlind)];
}

function getDate(handData: string) {
  let match = handData.match(/\d{4}\/\d{2}\/\d{2}\s\d{1,2}:\d{2}:\d{2}/g);
  if (!match) throw new Error("didn't match date");
  return getPokerStarsDate(match[0]);
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
*/
