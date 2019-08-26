import { NotANumberError } from "./models/not-a-number-error";
import * as timezone from "moment-timezone";
/**
 * @returns 1 if date1 is greater than date2, 0 if they are equal,
 *          and -1 if date1 is less than date2
 */
export function comparingDates(date1: Date, date2: Date) {
  let ms1 = date1.getTime();
  let ms2 = date2.getTime();
  if (ms1 > ms2) return 1;
  if (ms1 == ms2) return 0;
  return -1;
}

export function matchCurrency(test: string) {
  return test.match(/\$(\d{1,3}(\,\d{3})*)(\.\d{2})?/g);
}

export function parseDollars(money: string): number {
  let result = Number.parseFloat(money.replace(/[\,\$]/g, ""));
  return checkIfNumber(result);
}

export function getPokerStarsDate(dateStringWithOutEt: string): Date {
  return timezone
    .tz(dateStringWithOutEt, "YYYY/MM/DD HH:mm:ss", "America/New_York")
    .toDate();
}

export function checkIfNumber(number: number) {
  if (Number.isNaN(number)) throw new NotANumberError();
  return number;
}

export function parsingNumberFromMatchString(
  match: RegExpMatchArray | null,
  isFloat: boolean = false
): number | null {
  if (!match) {
    return null;
  }
  if (!isFloat) {
    let id = Number.parseInt(match[0]);
    return checkIfNumber(id);
  }
  let id = Number.parseFloat(match[0]);
  return checkIfNumber(id);
}