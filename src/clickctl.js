var ks = require("node-key-sender");
setInterval(function () {
    ks.sendKey("control");
    console.log("clicking control");
}, 1000 * 60 * 2);
