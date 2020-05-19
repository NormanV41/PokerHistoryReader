import color from "colorts";
import { toArray } from "lodash";
import { prependZero } from "./methods";

const consoleLog = console.log.bind(console);

const logger = {
  log(...params: any[]) {
    const timeStamp = getTimeStamp();
    const args = toArray(params).map((argument) => {
      if (typeof argument === "object") {
        return timeStamp + " " + JSON.stringify(argument, undefined, 2);
      }
      return timeStamp + " " + argument;
    });
    consoleLog.apply<Console, string[], void>(console, args);
  },

  error(...params: any[]) {
    const args = params.map((argument) => {
      argument = argument.stack || argument;
      const name = argument.name || "[ ❌ ERROR ❌ ]";
      const timeStamp = getTimeStamp();
      if (typeof argument === "object") {
        argument = JSON.stringify(argument, undefined, 2);
      } else {
        argument = argument + "";
      }
      return color(name).yellow.toString() + " " + argument;
    });
  }
};

function getTimeStamp() {
  const date = new Date();
  return color(
    `${prependZero(date.getDate())}/${prependZero(
      date.getMonth() + 1
    )}/${prependZero(date.getFullYear())} ${prependZero(
      date.getHours()
    )}:${prependZero(date.getMinutes())}:${prependZero(
      date.getSeconds()
    )}.${prependZero(date.getMilliseconds(), true)}`
  ).italic.grey.toString();
}

export default logger;
