"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var timezone = __importStar(require("moment-timezone"));
fs.readFile("./data/tournament-summaries/junio_1.eml", { encoding: "utf8" }, function (error, data) {
    if (error)
        throw error;
    var tournamentStringArray = data.split("\nPokerStars Tournament");
    tournamentStringArray.shift();
    tournamentStringArray.forEach(function (content, index) {
        var contentArray = content.split("\n");
        contentArray.forEach(function (string, index) {
            if (/\s+\d+:\s/.test(string)) {
                if (!/=20/g.test(string)) {
                    var prizeString = string.replace(/.+\),\s/g, "");
                    var match = matchCurrency(prizeString);
                    if (match === null) {
                        var matchTargetTournament = prizeString.match(/\(qualified/g);
                        if (matchTargetTournament === null) {
                            if (prizeString.match(/still playing/g))
                                return;
                            //console.log(prizeString.split("="))
                            if (prizeString.match(/=\r/g) === null) {
                                console.log(prizeString);
                                return;
                            }
                            var matchPrize = matchCurrency((prizeString.replace("\r", "") + contentArray[index + 1]).replace("=", ""));
                            if (matchPrize === null) {
                                console.log(prizeString.replace("\r", "") + contentArray[index + 1]);
                                return;
                            }
                            console.log(parseDollars(matchPrize[0]));
                            return;
                        }
                        // console.log("qualified")
                        return;
                    }
                    console.log(parseDollars(match[0]));
                }
            }
        });
    });
    /* let tournaments = tournamentStringArray.map<Tournament>(content=>{
    })*/
});
function matchCurrency(test) {
    return test.match(/\$(\d{1,3}(\,\d{3})*)(\.\d{2})?/g);
}
function parseDollars(money) {
    var result = Number.parseFloat(money[0].replace(/[\,\$]/g, ""));
    if (!Number.isNaN(result))
        throw new Error("returns not a number");
    return result;
}
function getPlayerCountry(playerInfo) {
    return playerInfo
        .replace(/\s+\d+:\s/g, "")
        .replace(/.+\s\((?=[A-Z])/g, "")
        .replace(/\),([^]+$)/g, "");
}
function getPlayerName(playerInfo) {
    return playerInfo.replace(/\s+\d+:\s/g, "").replace(/\s\([A-Z]([^]+$)/g, "");
}
function getPlayerPosition(playerInfo) {
    var match = playerInfo.match(/\s+\d+:\s/);
    if (match !== null)
        return Number.parseInt(match[0].replace(/(?:[\s:]+)/g, ""));
    return -1;
}
function getSartDate(content) {
    var string = content
        .split("\nTournament started ")[1]
        .split("\n")[0]
        .replace(/[ET]/g, "");
    return getPokerStarsDate(string);
}
function getEndDate(content) {
    var key = "\nTournament finished ";
    if (!content.includes(key))
        return null;
    var string = content
        .split(key)[1]
        .split("\n")[0]
        .replace(/[ET]/g, "");
    console.log(string);
    return getPokerStarsDate(string);
}
function getTournamentId(content) {
    return Number.parseInt(content.split(" #")[1].split(",")[0]);
}
function getBuyIn(content) {
    if (content.split("\nFreeroll=").length > 1)
        return [0, 0];
    var paidMinusTaken = 0;
    var taken = 0;
    content
        .split("\nBuy-In: ")[1]
        .split(" ")[0]
        .replace(/[$]/g, "")
        .split("/")
        .forEach(function (element, index) {
        if (index == 0)
            paidMinusTaken = Number.parseFloat(element);
        else
            taken = Number.parseFloat(element);
    });
    return [paidMinusTaken, taken];
}
function getPrizePool(content) {
    if (!content.split("\nTotal Prize Pool: ")[1])
        return Number.parseFloat(content.split(" USD added")[0].split("$")[1]);
    return Number.parseFloat(content
        .split("\nTotal Prize Pool: ")[1]
        .split(" ")[0]
        .replace(/[$]/g, ""));
}
function getPokerStarsDate(dateStringWithOutEt) {
    return timezone
        .tz(dateStringWithOutEt, "YYYY/MM/DD HH:mm:ss", "America/New_York")
        .toDate();
}
