import { NotANumberError } from "./models/not-a-number-error";
import * as timezone from "moment-timezone";
import { NoMatchError } from "./models/no-match-error";
import { access } from "fs";
import { Connection, createConnection } from "mysql";
import { databaseSecrets } from "./config";
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

export function getStringValue(action: string, reggex: RegExp) {
  return testMatch<string>(action.match(reggex), (match: RegExpMatchArray) => {
    checkForOnlyOneMatch(match);
    return match[0];
  });
}

export function getNumberValue(
  action: string,
  reggex: RegExp,
  isFloat = false
) {
  const stringValue = getStringValue(action, reggex);
  const num = isFloat
    ? Number.parseFloat(stringValue)
    : Number.parseInt(stringValue, 10);
  return checkIfNumber(num);
}

export function startConnectionWithDatabase(
  action: (connection: Connection) => void
) {
  const connection = createConnection({
    host: "localhost",
    user: databaseSecrets.user,
    password: databaseSecrets.password,
    database: databaseSecrets.database,
    multipleStatements: true
  });

  connection.connect((error) => {
    if (error) {
      console.error("Error connecting to database");
      return;
    }
    console.log("connection established");
  });

  action(connection);

  connection.end((err) => {
    if (err) {
      throw err;
    }
    console.log("connection ended");
  });
}

export function transpose(array: Array<Array<string | number>>) {
  const width = array.length || 0;
  const height = array[0].length;
  if (height === 0 || width === 0) {
    return [];
  }
  const t: Array<Array<string | number>> = [];
  for (let index = 0; index < height; index++) {
    t[index] = [];
    for (let kindex = 0; kindex < width; kindex++) {
      t[index][kindex] = array[kindex][index];
    }
  }
  return t;
}

export function round(n: number, decimals: number) {
  return Number(Math.round((n + "e" + decimals) as any) + "e-" + decimals);
}

export function formatDate(date: Date) {
  date = new Date(date);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  return `${year}-${prependZero(month + 1)}-${prependZero(day)} ${prependZero(
    hour
  )}:${prependZero(minutes)}:${prependZero(seconds)}`;
}

function prependZero(n: number) {
  if (n < 10) {
    return "0" + n;
  }
  return "" + n;
}
