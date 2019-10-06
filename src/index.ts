import {
  addTournaments,
  existingTournaments$
} from "./tournament/process-email";
import * as fs from "fs";
import { NotANumberError } from "./models/not-a-number-error";
import {
  parsingNumberFromMatchString,
  getPokerStarsDate,
  checkIfNumber,
  parseDollars,
  matchCurrency,
  generalParseDollars,
  generalParseChips,
  testMatch,
  checkForOnlyOneMatch
} from "./methods";
import { RomanNumeral } from "./hand/roman-numeral";
import { IPlayer } from "./hand/models/player";
import { Suit } from "./hand/models/suit";
import { Card } from "./hand/models/card";
import { platform } from "os";
import * as rimraf from "rimraf";
import { NoMatchError } from "./models/no-match-error";
import { IAction } from "./hand/models/action";
import { Action } from "rxjs/internal/scheduler/Action";
import { ActionDescription } from "./hand/models/action-description";

// addTournaments("septiembre_1");
/*existingTournaments$().subscribe(data => data.forEach(tournament=>{
  console.log(tournament.tournamentId)
}));*/

fs.readFile(
  "./data/hand-history/Hands_26.12.18_5.5.19.txt",
  {
    encoding: "utf8"
  },
  (error, data) => {
    if (error) {
      throw error;
    }
    const handStringArray = data.split(/\nHand\s\#/g);
    handStringArray.shift();
    handStringArray.forEach((handData) => {
      console.log(handData);
    });
  }
);

function getForcedBetsActions(handData: string) {
  const players = getPlayers(handData);
  const playersNames = players.map<string>((player) => {
    return player.name;
  });
  return getForcedBetsActionString(handData)
    .split("\n")
    .map<IAction>((action) => {
      return actionStringToActionObjectInForceBetAction(
        action,
        players,
        playersNames
      );
    });
}

function actionStringToActionObjectInForceBetAction(
  action: string,
  players: IPlayer[],
  playersNames: string[]
) {
  let seat: number | undefined;
  let description: string | undefined;
  let amount: number | undefined;
  let noSeatPlayerName: string | undefined;
  let counter = 0;
  playersNames.forEach((player, index) => {
    if (action.split(player).length > 1) {
      action = action.replace(player, "");
      seat = players[index].seat;
      if (/: posts small blind /g.test(action)) {
        description = ActionDescription.smallBlind;
        amount = tryDolarFirstThenChips(action);
      }
      if (/: posts big blind/g.test(action)) {
        description = ActionDescription.bigBlind;
        amount = tryDolarFirstThenChips(action);
      }
      if (/: posts the ante/g.test(action)) {
        description = ActionDescription.ante;
        amount = tryDolarFirstThenChips(action);
      }
      if (/will be allowed to play after the button/g.test(action)) {
        description = ActionDescription.playAfterButton;
      }
      if (/: posts small & big blinds /g.test(action)) {
        description = ActionDescription.smallAndBigBlind;
        amount = tryDolarFirstThenChips(action);
      }
      counter++;
    }
  });
  if (/(: sits out)|(: is sitting out)/g.test(action) && counter === 0) {
    description = ActionDescription.sittingOut;
    noSeatPlayerName = getStringValue(
      action,
      /.+(?=(: sits out)|(: is sitting out))/g
    );
    counter++;
  }
  if (
    / will be allowed to play after the button/g.test(action) &&
    counter === 0
  ) {
    description = ActionDescription.playAfterButton;
    noSeatPlayerName = getStringValue(
      action,
      /.+(?= will be allowed to play after the button)/g
    );
    counter++;
  }
  if (/ leaves the table/g.test(action) && counter === 0) {
    description = ActionDescription.leavesTable;
    noSeatPlayerName = getStringValue(action, /.+(?= leaves the table)/g);
    counter++;
  }
  if (/ joins the table at seat/g.test(action) && counter === 0) {
    description = ActionDescription.joinsTable;
    noSeatPlayerName = getStringValue(
      action,
      /.+(?= joins the table at seat)/g
    );
    seat = getNumberValue(action, /(?<= at seat #)\d{1,2}/g);
    counter++;
  }
  if (/ has timed out while disconnected/g.test(action) && counter === 0) {
    description = ActionDescription.disconnectedTimeOut;
    noSeatPlayerName = getStringValue(
      action,
      /.+(?= has timed out while disconnected)/g
    );
    counter++;
  }
  if (counter > 1) {
    console.log(action);
    throw new Error("counter greater than 1");
  }
  if (!description) {
    console.log(action);
    console.log(seat);
    throw new Error("description undefined");
  }
  const result = {
    seat,
    description,
    amount,
    noSeatPlayerName
  };
  return filterUndefined(result) as IAction;
}

function getForcedBetsActionString(handData: string) {
  const array = handData
    .split("*** HOLE CARDS ***")[0]
    .split(/Seat \d{1,2}: .+/);
  return array[array.length - 1].trim();
}

function getPreflopAction(handData: string) {
  const players = getPlayers(handData);
  const playersNames = players.map<string>((player) => player.name);
  return getPreflopActionString(handData)
    .split("\n")
    .filter((action) => !/(?<=NormanV41\s\[).+(?=\])/g.test(action))
    .map<IAction>((action) => {
      return actionStringToActionObject(action, players, playersNames);
    });
}

function actionStringToActionObject(
  action: string,
  players: IPlayer[],
  playersNames: string[]
): IAction {
  let seat: number | undefined;
  let description: string | undefined;
  let amount: number | undefined;
  let raiseToAmount: number | undefined;
  let message: string | undefined;
  let nonSeatPlayerName: string | undefined;
  let rebuyChipsReceived: number | undefined;
  let hand: Card[] | undefined;
  let eliminatedSeat: number | undefined;
  let increasedBountyBy: number | undefined;
  let finalBounty: number | undefined;
  if (
    /(\swins\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)\sfor\seliminating\s/g.test(
      action
    )
  ) {
    ({
      description,
      eliminatedSeat,
      seat,
      increasedBountyBy,
      finalBounty,
      amount
    } = getWinsBountyAction(action, playersNames));
    const result1 = {
      seat,
      description,
      amount,
      raiseToAmount,
      message,
      nonSeatPlayerName,
      rebuyChipsReceived,
      hand,
      eliminatedSeat,
      increasedBountyBy,
      finalBounty
    };
    return filterUndefined(result1) as IAction;
  }
  let counter = 0;
  playersNames.forEach((player, index) => {
    if (action.split(player).length > 1) {
      action = action.replace(player, "");
      seat = players[index].seat;
      if (/:\sfolds/g.test(action)) {
        description = ActionDescription.fold;
      }
      if (/:\sraises\s/g.test(action)) {
        ({ description, amount, raiseToAmount } = getRaiseAction(action));
      }
      if (/:\scalls\s/g.test(action)) {
        description = ActionDescription.call;
        amount = tryDolarFirstThenChips(action);
      }
      if (/Uncalled bet \(/g.test(action)) {
        description = ActionDescription.returnBet;
        amount = tryDolarFirstThenChips(action);
      }
      if (/\scollected\s/g.test(action)) {
        description = ActionDescription.collectPot;
        amount = tryDolarFirstThenChips(action);
      }
      if (/:\sdoesn't\sshow\shand/g.test(action)) {
        description = ActionDescription.hideHand;
      }
      if (/:\schecks/g.test(action)) {
        description = ActionDescription.check;
      }
      if (/\shas\stimed\sout\swhile\sdisconnected/g.test(action)) {
        description = ActionDescription.disconnectedTimeOut;
      }
      if (/\ssaid,\s"/g.test(action)) {
        description = ActionDescription.said;
        message = getMessage(action);
      }
      if (/\shas\stimed\sout/g.test(action)) {
        description = ActionDescription.timeOut;
      }
      if (/ is sitting out/g.test(action)) {
        description = ActionDescription.sittingOut;
      }
      if (/ has returned/g.test(action)) {
        description = ActionDescription.returned;
      }
      if (/ is connected/g.test(action)) {
        description = ActionDescription.connected;
      }
      if (/ re-buys and receives /g.test(action)) {
        description = ActionDescription.rebuys;
        amount = generalParseDollars(action);
        rebuyChipsReceived = generalParseChips(action);
      }
      if (/ is disconnected/g.test(action)) {
        description = ActionDescription.disconnected;
      }
      if (/ finished the tournament in /g.test(action)) {
        description = ActionDescription.finishTournament;
      }
      if (/: shows \[/g.test(action)) {
        description = ActionDescription.showsHand;
        hand = getHand(action);
      }
      if (/\swins\sthe\stournament/g.test(action)) {
        description = ActionDescription.winsTournament;
      }
      if (/ leaves the table/g.test(action)) {
        description = ActionDescription.leavesTable;
      }
      if (description === undefined) {
        console.log(action);
        throw new Error("action not handled");
      }
      counter++;
    }
  });
  if (/\s\[observer\]\ssaid,/g.test(action) && counter === 0) {
    description = ActionDescription.said;
    nonSeatPlayerName = getStringValue(action, /.+(?=\s\[observer\]\s)/g);
    message = getMessage(action);
    counter++;
  }
  if (/ re-buys and receives /g.test(action) && counter === 0) {
    description = ActionDescription.rebuys;
    amount = generalParseDollars(action);
    nonSeatPlayerName = getStringValue(
      action,
      /.+(?=\sre-buys\sand\sreceives\s)/g
    );
    counter++;
  }
  if (/ has returned/g.test(action) && counter === 0) {
    description = ActionDescription.returned;
    nonSeatPlayerName = getStringValue(action, /.+(?=\shas\sreturned)/g);
    counter++;
  }
  if (/ is sitting out/g.test(action) && counter === 0) {
    description = ActionDescription.sittingOut;
    nonSeatPlayerName = getStringValue(action, /.+(?= is sitting out)/g);
    counter++;
  }
  if (/ leaves the table/g.test(action) && counter === 0) {
    description = ActionDescription.leavesTable;
    nonSeatPlayerName = getStringValue(action, /.+(?= leaves the table)/g);
    counter++;
  }

  if (/ joins the table/g.test(action) && counter === 0) {
    description = ActionDescription.joinsTable;
    nonSeatPlayerName = getStringValue(action, /.+(?= joins the table)/g);
    counter++;
  }
  if (counter !== 1) {
    console.log(action);
    throw new Error("something unexpected");
  }

  if (description === undefined) {
    console.log(seat);
    console.log(description);
    console.log(amount);
    console.log(raiseToAmount);
    throw new Error("description is  undefined");
  }

  if (seat === null && !nonSeatPlayerName) {
    console.log(action);
    throw new Error("missing noSeatPlayerName");
  }
  const result2 = {
    seat,
    description,
    amount,
    raiseToAmount,
    message,
    nonSeatPlayerName,
    rebuyChipsReceived,
    hand,
    eliminatedSeat,
    increasedBountyBy,
    finalBounty
  };
  return filterUndefined(result2) as IAction;
}

function filterUndefined(obj: {}): {} {
  const map = Object.entries<any>(obj);
  const newObj: { [key: string]: any } = {};
  map.forEach((keyValuePair) => {
    if (keyValuePair[1] !== undefined) {
      newObj[keyValuePair[0]] = keyValuePair[1];
    }
  });
  return newObj;
}

function getWinsBountyAction(action: string, playersNames: string[]) {
  const description = ActionDescription.winBounty;
  const playerName = getStringValue(
    action,
    /.+(?=\swins\s(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?))/g
  );
  const eliminatedPlayerName = getStringValue(
    action,
    /(?<=\sfor\seliminating\s).+(?=\sand\stheir\sown)/g
  );
  const eliminatedSeat = playersNames.findIndex(
    (player) => player === eliminatedPlayerName
  );
  const seat = playersNames.findIndex((player) => player === playerName);
  const amount = parseDollars(
    getStringValue(
      action,
      /(?<=\swins\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)(?=\sfor\s)/g
    )
  );
  const increasedBountyBy = parseDollars(
    getStringValue(
      action,
      /(?<=\sincreases\sby\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)(?=\sto\s)/g
    )
  );
  const finalBounty = parseDollars(
    getStringValue(
      action,
      /(?<=(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)\sto\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)/g
    )
  );
  if (seat === -1 || eliminatedSeat === -1) {
    console.log(action);
    throw new Error("didn't find seat");
  }
  return {
    description,
    eliminatedSeat,
    seat,
    increasedBountyBy,
    finalBounty,
    amount
  };
}

function getStringValue(action: string, reggex: RegExp) {
  return testMatch<string>(action.match(reggex), (match: RegExpMatchArray) => {
    checkForOnlyOneMatch(match);
    return match[0];
  });
}

function getNumberValue(action: string, reggex: RegExp, isFloat = false) {
  const stringValue = getStringValue(action, reggex);
  const num = isFloat
    ? Number.parseFloat(stringValue)
    : Number.parseInt(stringValue, 10);
  return checkIfNumber(num);
}

function getHand(action: string) {
  return testMatch<Card[]>(
    action.match(/(?<=\s\[).+(?=\])/g),
    (match: RegExpMatchArray) => {
      checkForOnlyOneMatch(match);
      const hands = match[0].split(" ");
      return hands.map<Card>((card) => {
        return new Card(card);
      });
    }
  );
}

function getMessage(action: string) {
  try {
    return testMatch<string>(
      action.match(/(?<=").+(?=")/g),
      (match: RegExpMatchArray) => {
        checkForOnlyOneMatch(match);
        return match[0];
      }
    );
  } catch (error) {
    if (error instanceof NoMatchError) {
      return testMatch<string>(
        action.match(/""/g),
        (match: RegExpMatchArray) => {
          checkForOnlyOneMatch(match);
          return "";
        }
      );
    }
    throw error;
  }
}

function tryDolarFirstThenChips(action: string) {
  try {
    return generalParseDollars(action);
  } catch (error) {
    if (error.message === "doesn't match currency") {
      const result = generalParseChips(action);
      if (result) {
        return result;
      }
      console.log(action);
      throw new Error("amount can't be null in this action");
    }
    throw error;
  }
}

function getRaiseAction(action: string) {
  const matchAmount = action.match(
    /((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))(?=\sto\s)/g
  );
  const matchRaiseToAmount = action.match(
    /(?<=\sto\s)((\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)|(\d+))/g
  );
  if (!matchAmount || !matchRaiseToAmount) {
    console.log(action);
    throw new Error("does not match amount");
  }
  return {
    description: ActionDescription.raise,
    amount: parseDollars(matchAmount[0]),
    raiseToAmount: parseDollars(matchRaiseToAmount[0])
  };
}

function getDealtHandObject(handData: string) {
  const dealtHandString = getDealtHandString(handData);
  if (!dealtHandString) {
    return null;
  }
  const cardsString = dealtHandString.split(" ");
  if (cardsString.length !== 2 && cardsString.length !== 4) {
    console.log(handData);
    console.log(dealtHandString);
    throw new Error("is not length 2 or 4");
  }
  return cardsString.map<Card>((card) => new Card(card));
}

function getDealtHandString(handData: string) {
  const match = getPreflopActionString(handData).match(
    /(?<=NormanV41\s\[).+(?=\])/g
  );
  if (match) {
    return match[0];
  }
  if (/NormanV41 will be allowed to play after the button/g.test(handData)) {
    return null;
  }
  console.log(getPreflopActionString(handData));
  throw new Error("didn't match dealt hands");
}

function getPreflopActionString(handData: string) {
  return handData
    .split(/\*{3}\sHOLE\sCARDS\s\*{3}/g)[1]
    .split(/\*{3}\s([A-Z]|\s)+\s\*{3}/g)[0]
    .trim();
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
    console.log(playerData);
    throw new Error("player name didn't match");
  }
  return match[0];
}

function getTableId(handData: string): number | string {
  const match = handData.match(
    /(?<=Table\s'\d{6,}\s)\d|(?<=Table\s')[A-Z][a-z]+/g
  );
  if (!match) {
    console.log(handData.slice(0, 500));
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
    console.log(handData.slice(0, 500));
    throw new Error("didnt match level roman number");
  }
  return new RomanNumeral(match[0]).toInt();
}

function getSmallBigBlind(handData: string): number[] {
  const match = handData.match(
    /((?<=Limit\s\().+(?=\)))|((?<=Level\s[A-Z]+\s\().+(?=\)))/g
  );
  if (!match) {
    console.log(handData.slice(0, 500));
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

rimraf.sync("./lib/");
