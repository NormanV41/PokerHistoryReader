export interface ISPGCount {
  Played: number;
  Won: number;
  Minutes: number;
  Money: number;
  "2BI Played": number;
  "3BI Played": number;
  "5BI Played": number;
  "10BI Played": number;
  "25BI Played": number;
  "2BI Won": number;
  "3BI Won": number;
  "5BI Won": number;
  "10BI Won": number;
  "25BI Won": number;

  [propName: string]: number;
}
