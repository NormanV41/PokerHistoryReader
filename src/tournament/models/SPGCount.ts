export interface ISPGCount {
  played: number;
  won: number;
  minutes: number;
  money: number;
  played2BI: number;
  played3BI: number;
  played5BI: number;
  played10BI: number;
  played25BI: number;
  won2BI: number;
  won3BI: number;
  won5BI: number;
  won10BI: number;
  won25BI: number;
  [propName: string]: number;
}
