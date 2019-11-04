import { Connection } from "mysql";
import { ISPGCount } from "./models/SPGCount";
import { IOkPacket } from "../models/OkPacket";
import { bindCallback } from "rxjs";
import { transpose, round } from "../methods";
import { table } from "table";
import { ISTGCount } from "./models/STGCount";

// tslint:disable-next-line: variable-name
export const SPGCount0_25$ = bindCallback(get0_25SPGCount);
// tslint:disable-next-line: variable-name
export const STGCount0_50$ = bindCallback(get0_50STGCount);

function get0_25SPGCount(
  connection: Connection,
  action: (response: [[ISPGCount], IOkPacket]) => void
) {
  connection.query(
    "call sp_0_25_SPG_tournament_count()",
    (error, response: [[ISPGCount], IOkPacket]) => {
      if (error) {
        throw error;
      }
      action(response);
    }
  );
}

export function printSPGCount0_25(connection: Connection) {
  SPGCount0_25$(connection).subscribe((data) => {
    const count = data[0][0];
    const array = transpose(Object.entries<number>(count)) as [
      string[],
      number[],
      string[],
      number[]
    ];
    const fractionsString = [
      "W/P",
      "Mi/P",
      "Mo/P",
      "Mo/Mi",
      "2BI fr",
      "3BI fr",
      "5BI fr",
      "10BI fr",
      "25BI fr",
      "2BI wfr",
      "3BI wfr",
      "5BI wfr",
      "10BI wfr",
      "25BI wfr"
    ];
    array.push(fractionsString);
    const fractions = [
      round(array[1][1] / array[1][0], 3),
      round(array[1][2] / array[1][0], 3),
      round(array[1][3] / array[1][0], 3),
      round(array[1][3] / array[1][2], 3),
      round(array[1][4] / array[1][0], 3),
      round(array[1][5] / array[1][0], 3),
      round(array[1][6] / array[1][0], 3),
      round(array[1][7] / array[1][0], 3),
      round(array[1][8] / array[1][0], 3),
      round(array[1][9] / array[1][4], 3),
      round(array[1][10] / array[1][5], 3),
      round(array[1][11] / array[1][6], 3),
      round(array[1][12] / array[1][7], 3),
      round(array[1][13] / array[1][8], 3)
    ];
    array.push(fractions);
    console.log(table(array));
  });
}

export function printSTGCount0_50(connect: Connection) {
  STGCount0_50$(connect).subscribe((data) => {
    const count = data[0][0];
    const array = transpose(Object.entries<number>(count)) as [
      string[],
      number[],
      string[],
      number[]
    ];
    const fractionsString = [
      "1st/P",
      "2nd/P",
      "3rd/P",
      "Mi/P",
      "Mo/P",
      "Mo/Mi"
    ];
    const fractions = [
      round(array[1][1] / array[1][0], 3),
      round(array[1][2] / array[1][0], 3),
      round(array[1][3] / array[1][0], 3),
      round(array[1][4] / array[1][0], 3),
      round(array[1][5] / array[1][0], 3),
      round(array[1][5] / array[1][4], 3)
    ];
    array.push(fractionsString);
    array.push(fractions);
    console.log(table(array));
  });
}

function get0_50STGCount(
  connection: Connection,
  action: (response: [[ISTGCount], IOkPacket]) => void
) {
  connection.query(
    "call sp_0_50_STG_tournament_count()",
    (error, response: [[ISTGCount], IOkPacket]) => {
      if (error) {
        throw error;
      }
      action(response);
    }
  );
}
