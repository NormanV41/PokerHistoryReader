import { NotANumberError } from "./models/not-a-number-error";
import * as timezone from "moment-timezone";
import { NoMatchError } from "./models/no-match-error";
import { access } from "fs";
/**
 * @returns 1 if date1 is greater than date2, 0 if they are equal,
 *          and -1 if date1 is less than date2
 */
export function comparingDates(date1: Date, date2: Date) {
  const ms1 = date1.getTime();
  const ms2 = date2.getTime();
  if (ms1 > ms2) {
    return 1;
  }
  if (ms1 === ms2) {
    return 0;
  }
  return -1;
}

export function matchCurrency(test: string) {
  return test.match(/(\$(\d{1,3}(\,\d{3})*)(\.\d{2})?)(?!\d+)/g);
}

export function parseDollars(money: string): number {
  const result = Number.parseFloat(money.replace(/[\,\$]/g, ""));
  return checkIfNumber(result);
}

export function generalParseDollars(test: string) {
  const match = matchCurrency(test);
  if (!match) {
    throw new Error("doesn't match currency");
  }
  if (match.length > 1) {
    console.log(test);
    throw new Error("method not implemented for more than one match");
  }
  return parseDollars(match[0]);
}

export function generalParseChips(test: string) {
  const match = test.match(/(\s\d{1,}(?![^\s]))|(\(\d{1,}\))/g);
  if (match) {
    if (match.length > 1) {
      console.log(test);
      throw new Error("should only be one match");
    }
    return checkIfNumber(Number.parseInt(match[0].replace(/\(|\)/g, ""), 10));
  }
  console.log(test);
  throw new Error("didn't match");
}

export function getPokerStarsDate(dateStringWithOutEt: string): Date {
  return timezone
    .tz(dateStringWithOutEt, "YYYY/MM/DD HH:mm:ss", "America/New_York")
    .toDate();
}

export function checkIfNumber(n: number) {
  if (Number.isNaN(n)) {
    throw new NotANumberError();
  }
  return n;
}

export function parsingNumberFromMatchString(
  match: RegExpMatchArray | null,
  isFloat: boolean = false
): number | null {
  if (!match) {
    return null;
  }
  if (!isFloat) {
    return checkIfNumber(Number.parseInt(match[0], 10));
  }
  return checkIfNumber(Number.parseFloat(match[0]));
}

export function testMatch<T>(
  match: RegExpMatchArray | null,
  action: (match: RegExpMatchArray) => T
) {
  if (!match) {
    throw new NoMatchError();
  }
  return action(match);
}

export function checkForOnlyOneMatch(match: RegExpMatchArray) {
  if (match.length > 1) {
    throw new Error("no more than one match");
  }
}

export function filterUndefinedAndNull(obj: {}): {} {
  const map = Object.entries<any>(obj);
  const newObj: { [key: string]: any } = {};
  map.forEach((keyValuePair) => {
    if (keyValuePair[1] !== undefined && keyValuePair[1] !== null) {
      newObj[keyValuePair[0]] = keyValuePair[1];
    }
  });
  return newObj;
}
