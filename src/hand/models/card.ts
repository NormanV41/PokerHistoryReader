import { Suit } from "./suit";
import { parsingNumberFromMatchString } from "../../methods";
import { NotANumberError } from "../../models/not-a-number-error";

export interface ICard {
  rank: number;
  suit: Suit;
}

export class Card {
  private rank: number;
  private suit: Suit;

  constructor(card: string) {
    const matchRank = card.match(/[2-9]|A|K|Q|J|T/g);
    if (!matchRank) {
      console.log(card);
      throw new Error("didnt match rank");
    }
    const matchSuit = card.match(/s|d|c|h/g);
    if (!matchSuit) {
      console.log(card);
      throw new Error("didn't match suit");
    }
    switch (matchSuit[0]) {
      case "s":
        this.suit = Suit.s;
        break;
      case "d":
        this.suit = Suit.d;
        break;
      case "h":
        this.suit = Suit.h;
        break;
      case "c":
        this.suit = Suit.c;
        break;
      default:
        throw new Error("didn't match suit");
    }
    try {
      this.rank = parsingNumberFromMatchString(matchRank) as number;
    } catch (error) {
      if (error instanceof NotANumberError) {
        switch (matchRank[0]) {
          case "T":
            this.rank = 10;
            break;
          case "J":
            this.rank = 11;
            break;
          case "Q":
            this.rank = 12;
            break;
          case "K":
            this.rank = 13;
            break;
          case "A":
            this.rank = 1;
            break;
          default:
            throw new Error("didn't match rank");
        }
      } else {
        console.log(error);
        throw new Error("unexpected error");
      }
    }
  }
}
