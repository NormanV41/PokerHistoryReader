/**
 * An object of type RomanNumeral is an integer between 1 and 3999.  It can
 * be constructed either from an integer or from a string that represents
 * a Roman numeral in this range.  The function toString() will return a
 * standardized Roman numeral representation of the number.  The function
 * toInt() will return the number as a value of type int.
 */
export class RomanNumeral {
  private num: number;
  private numbers = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  private letters = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I"
  ];

  constructor(givenNumber: string | number) {
    if (typeof givenNumber === "number") {
      if (givenNumber < 1) {
        throw new Error("Must be positive");
      }
      if (givenNumber > 3999) {
        throw new Error("maximum number is 3999");
      }
      this.num = givenNumber;
      return;
    }
    if (!givenNumber) {
      throw new Error("no empty string");
    }
    givenNumber = givenNumber.toUpperCase();
    let i = 0;
    let arabic = 0;
    while (i < givenNumber.length) {
      const letter = givenNumber.charAt(i);
      const n = this.letterToNumber(letter);
      if (n < 0) {
        throw new Error("Ilegal character");
      }
      i++;
      if (i === givenNumber.length) {
        arabic += n;
      } else {
        const nextNumber = this.letterToNumber(givenNumber.charAt(i));
        if (nextNumber > n) {
          arabic += nextNumber - n;
          i++;
        } else {
          arabic += n;
        }
      }
    }
    if (arabic > 3999) {
      throw new Error("number must be less than 3999");
    }
    this.num = arabic;
  }

  toString(): string {
    let roman = "";
    let N = this.num;
    for (let i = 0; i < this.numbers.length; i++) {
      while (N >= this.numbers[i]) {
        roman += this.letters[i];
        N -= this.numbers[i];
      }
    }
    return roman;
  }

  toInt() {
    return this.num;
  }

  private letterToNumber(letter: string) {
    switch (letter) {
      case "I":
        return 1;
      case "V":
        return 5;
      case "X":
        return 10;
      case "L":
        return 50;
      case "C":
        return 100;
      case "D":
        return 500;
      case "M":
        return 1000;
      default:
        return -1;
    }
  }
}
