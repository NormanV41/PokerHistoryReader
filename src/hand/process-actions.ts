import { IPlayer } from "./models/player";
import { IAction } from "./models/action";
import { NoMatchError } from "../models/no-match-error";
import { ActionDescription } from "./models/action-description";
import {
  filterUndefinedAndNull,
  generalParseDollars,
  generalParseChips,
  parseDollars,
  testMatch,
  checkForOnlyOneMatch,
  getStringValue,
  getNumberValue
} from "../methods";
import { Card } from "./models/card";

export function getTurnOrRiverAction(
  handData: string,
  players: IPlayer[],
  playersNames: string[],
  isRiver = false
) {
  if (!turnOrRiverWasPlayed(handData, isRiver)) {
    return undefined;
  }
  const turnOrRiverActionsStringArray = handData
    .split(isRiver ? /\*{3}\sRIVER\s\*{3}/g : /\*{3}\sTURN\s\*{3}/g)[1]
    .split(/\*{3}\s([A-Z]|\s)+\s\*{3}/g)[0]
    .split("\n")
    .filter((action) => action.length > 1);
  turnOrRiverActionsStringArray.shift();
  return turnOrRiverActionsStringArray.map<IAction>((action) => {
    return actionStringToActionObject(action, players, playersNames);
  });
}

export function getShowDownAction(
  handData: string,
  players: IPlayer[],
  playerNames: string[]
) {
  if (!thereIsShowdown(handData)) {
    return undefined;
  }
  const showDownActionsStringArray = handData
    .split(/\*{3} SHOW DOWN \*{3}/g)[1]
    .split(/\*{3} SUMMARY \*{3}/g)[0]
    .split("\n")
    .filter((action) => action.length > 1);
  const result = showDownActionsStringArray.map((action) =>
    actionStringToActionObject(action, players, playerNames)
  );

  const result2 = handData
    .split(/\*{3} SUMMARY \*{3}/g)[1]
    .trim()
    .split("\n")
    .filter((action) => {
      if (/(?<= mucked \[).+(?=])/g.test(action)) {
        return true;
      }
      return false;
    })
    .map<IAction>((action) => {
      const description = ActionDescription.mucksHand;
      const seat = getNumberValue(action, /(?<=Seat )\d{1,2}(?=: )/g);
      const player = players.find((el) => el.seat === seat);
      if (!player) {
        console.log(seat);
        console.log(players);
        throw new Error("should not be undefined");
      }
      action = action.replace(player.name, "");
      const hands = getHand(action);
      return { description, seat, hands };
    });
  return result.concat(result2);
}

export function turnOrRiverWasPlayed(handData: string, isRiver = false) {
  try {
    getStringValue(
      handData,
      isRiver ? /(?<=\*\*\* RIVER \*\*\*).+/g : /(?<=\*\*\* TURN \*\*\*).+/g
    );
    return true;
  } catch (error) {
    if (error instanceof NoMatchError) {
      return false;
    }
    throw error;
  }
}

export function thereIsShowdown(handData: string) {
  try {
    getStringValue(handData, /(\*\*\* SHOW DOWN \*\*\*)/g);
    return true;
  } catch (error) {
    if (error instanceof NoMatchError) {
      return false;
    }
    throw error;
  }
}

export function getFlopAction(
  handData: string,
  players: IPlayer[],
  playersNames: string[]
) {
  if (!flopWasPlayed(handData)) {
    return undefined;
  }
  const flopActionsStringArray = handData
    .split(/\*{3}\sFLOP\s\*{3}/g)[1]
    .split(/\*{3}\s([A-Z]|\s)+\s\*{3}/g)[0]
    .split("\n")
    .filter((action) => action.length > 1);
  flopActionsStringArray.shift();
  return flopActionsStringArray.map<IAction>((action) => {
    return actionStringToActionObject(action, players, playersNames);
  });
}

export function flopWasPlayed(handData: string) {
  try {
    getStringValue(handData, /(?<=\*\*\* FLOP \*\*\*).+/g);
    return true;
  } catch (error) {
    if (error instanceof NoMatchError) {
      return false;
    }
    throw error;
  }
}

export function getForcedBetsActions(
  handData: string,
  players: IPlayer[],
  playersNames: string[]
) {
  return getForcedBetsActionString(handData)
    .split("\n")
    .filter((action) => action.length > 1)
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
  let nonSeatPlayerName: string | undefined;
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
    nonSeatPlayerName = getStringValue(
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
    nonSeatPlayerName = getStringValue(
      action,
      /.+(?= will be allowed to play after the button)/g
    );
    counter++;
  }
  if (/ leaves the table/g.test(action) && counter === 0) {
    description = ActionDescription.leavesTable;
    nonSeatPlayerName = getStringValue(action, /.+(?= leaves the table)/g);
    counter++;
  }
  if (/ joins the table at seat/g.test(action) && counter === 0) {
    description = ActionDescription.joinsTable;
    nonSeatPlayerName = getStringValue(
      action,
      /.+(?= joins the table at seat)/g
    );
    counter++;
  }
  if (/ has timed out while disconnected/g.test(action) && counter === 0) {
    description = ActionDescription.disconnectedTimeOut;
    nonSeatPlayerName = getStringValue(
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
  if (seat === undefined && !nonSeatPlayerName) {
    console.log(action);
    console.log(seat);
    throw new Error("should not happened");
  }
  if (seat !== undefined && nonSeatPlayerName) {
    console.log(action);
    console.log(seat);
    throw new Error("should not happened");
  }
  const result = {
    seat,
    description,
    amount,
    nonSeatPlayerName
  };
  return filterUndefinedAndNull(result) as IAction;
}

function getForcedBetsActionString(handData: string) {
  const array = handData
    .split("*** HOLE CARDS ***")[0]
    .split(/Seat \d{1,2}: .+/);
  return array[array.length - 1];
}

export function getPreflopAction(
  handData: string,
  players: IPlayer[],
  playersNames: string[]
) {
  return getPreflopActionString(handData)
    .split("\n")
    .filter((action) => {
      if (action.length < 2) {
        return false;
      }
      return !/Dealt to .+ \[.+\]/g.test(action);
    })
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
  let description: ActionDescription | undefined;
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
    /(\swins\s)(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)\sfor\s((eliminating)|(splitting the elimination of))\s/g.test(
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
    } = getWinsBountyAction(action, players));
    return {
      seat,
      description,
      amount,
      eliminatedSeat,
      increasedBountyBy,
      finalBounty
    };
  }
  if (/(?<! \[observer\])\ssaid,\s"/g.test(action)) {
    description = ActionDescription.said;
    message = getMessage(action);
    const playerName = getStringValue(action, /.+(?= said, ")/g);
    const index = playersNames.findIndex((player) => player === playerName);
    if (index === -1) {
      return {
        description,
        message,
        nonSeatPlayerName: playerName
      };
    }
    seat = players[index].seat;
    return {
      seat,
      message,
      description
    };
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
      if (/: bets /g.test(action)) {
        description = ActionDescription.bet;
        amount = tryDolarFirstThenChips(action);
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
        ({ amount, rebuyChipsReceived } = getAmountForRebuy(action));
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
      if (
        /(\swins\sthe\stournament)|( wins an entry to tournament)|( wins a .+ ticket)/g.test(
          action
        )
      ) {
        description = ActionDescription.winsTournament;
      }
      if (/ leaves the table/g.test(action)) {
        description = ActionDescription.leavesTable;
      }
      if (/: mucks hand/g.test(action)) {
        description = ActionDescription.mucksHand;
      }
      if (/ cashed out the hand/g.test(action)) {
        description = ActionDescription.cashOut;
        amount = getNumberValue(
          action,
          /(?<=for \$)((\d{1,3}(\,\d{3})*)(\.\d{2})?)(?!\d+)/g,
          true
        );
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
    ({ amount, rebuyChipsReceived } = getAmountForRebuy(action));
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
  if (/ is disconnected/g.test(action) && counter === 0) {
    description = ActionDescription.disconnected;
    nonSeatPlayerName = getStringValue(action, /.+(?= is disconnected)/g);
    counter++;
  }
  if (counter !== 1) {
    console.log(action);
    console.log(counter);
    console.log(players);

    throw new Error("something unexpected");
  }

  if (description === undefined) {
    console.log(seat);
    console.log(description);
    console.log(amount);
    console.log(raiseToAmount);
    throw new Error("description is  undefined");
  }

  if (seat === undefined && !nonSeatPlayerName) {
    console.log(action);
    throw new Error("missing nonSeatPlayerName");
  }
  if (seat !== undefined && nonSeatPlayerName) {
    console.log(action);
    console.log(description);
    throw new Error("non seat means no seat!!!");
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
  return filterUndefinedAndNull(result2) as IAction;
}

function getAmountForRebuy(action: string) {
  let amount = 0;
  let rebuyChipsReceived = 0;
  try {
    amount = generalParseDollars(action);
    rebuyChipsReceived = generalParseChips(action);
  } catch (error) {
    if (/StarsCoin/g.test(action)) {
      amount = getNumberValue(action, /(?<=receives )\d+/g);
      rebuyChipsReceived = getNumberValue(action, /\d+(?= StarsCoin)/g);
    } else {
      console.log(action);
      console.log(generalParseChips(action));
      throw error;
    }
  }
  return { amount, rebuyChipsReceived };
}

function getWinsBountyAction(action: string, players: IPlayer[]) {
  const description = ActionDescription.winBounty;
  const playerName = getStringValue(
    action,
    /.+(?=\swins\s(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?))/g
  );
  const eliminatedPlayerName = getStringValue(
    action,
    /(?<=\sfor\s((eliminating)|(splitting the elimination of))\s).+(?=\sand\stheir\sown)/g
  );
  const eliminatedPlayer = players.find(
    (player) => player.name === eliminatedPlayerName
  );
  const mainPlayer = players.find((player) => player.name === playerName);
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
  if (!mainPlayer || !eliminatedPlayer) {
    console.log(action);
    throw new Error("didn't find seat");
  }
  return {
    description,
    eliminatedSeat: eliminatedPlayer.seat,
    seat: mainPlayer.seat,
    increasedBountyBy,
    finalBounty,
    amount
  };
}

export function getHand(action: string) {
  try {
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
  } catch (error) {
    if (error instanceof NoMatchError) {
      return testMatch<Card[]>(action.match(/\s\[\]/g), (match) => []);
    }
    console.log(action);
    throw error;
  }
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

export function getPreflopActionString(handData: string) {
  return handData
    .split(/\*{3}\sHOLE\sCARDS\s\*{3}/g)[1]
    .split(/\*{3}\s([A-Z]|\s)+\s\*{3}/g)[0];
}
