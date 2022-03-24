const parseTime = require("parse-duration");

function randString(length) {
  var result = [];
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  return result.join("");
}

function padDigits(number, digits) {
  return (
    Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number
  );
}

function toSafeURL(text) {
  return text.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "~");
}

function fromSafeURL(text) {
  return text.replace(/-/g, "+").replace(/_/g, "/").replace(/~/g, "=");
}

function reverse(str) {
  return [...str].reduce((rev, currentChar) => currentChar + rev, "");
}

function parseTimeSafeSec(e) {
  return Math.max(parseTime(e) || 60 * 1000, 60 * 1000) / 1000;
}

const safeB64Pairs = [
  // Including premaid regexes
  [
    ["+", /\+/g],
    ["-", /-/g]
  ],
  [
    ["/", /\//g],
    ["_", /_/g]
  ],
  [
    ["=", /=/g],
    [".", /\./g]
  ]
];

function makeSafeB64_32(b64string) {
  let result = b64string || "";
  safeB64Pairs.forEach((p) => {
    result = result.replace(p[0][1], p[1][0]);
  });
  return result;
}

function undoSafeB64_32(b64string) {
  let result = b64string || "";
  safeB64Pairs.forEach((p) => {
    result = result.replace(p[1][1], p[0][0]);
  });
  return result;
}

module.exports = {
  randString,
  padDigits,

  toSafeURL,
  fromSafeURL,

  reverse,
  parseTimeSafeSec,

  makeSafeB64_32,
  undoSafeB64_32
};
