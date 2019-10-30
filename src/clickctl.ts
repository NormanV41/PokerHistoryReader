const ks = require("node-key-sender");

setInterval(() => {
  ks.sendKey("control");
  console.log("clicking control");
}, 1000 * 60 * 2);
