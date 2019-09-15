import { NotANumberError } from "./models/not-a-number-error";
import * as timezone from "moment-timezone";
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
  return test.match(/\$(\d{1,3}(\,\d{3})*)(\.\d{2})?/g);
}

export function parseDollars(money: string): number {
  const result = Number.parseFloat(money.replace(/[\,\$]/g, ""));
  return checkIfNumber(result);
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
