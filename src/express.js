const {
  toSafeURL,
  fromSafeURL,
  parseTimeSafeSec,
  randString
} = require("./utils");
const {
  hmac,
  encrypt,
  decrypt,
  keydecrypt,
  keyencrypt,
  hashSecret,
  hashChallenge,
  emailAliasSecret,
  get10MinCode,
  verifyEmailCode
} = require("./crypto");
const prettyTime = require("pretty-ms");

var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-type");
  return next();
});
app.use(logger("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

const rateLimit = require("express-rate-limit");
const { getEmailBoxes, runWithIMAP, alias2address } = require("./mail");
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => req.ip,
  statusCode: 200,
  headers: false,
  message: `{"err": "Too many requests, please wait a while"}`
});

//  apply to all requests
app.use(limiter);

// [token times] => {salt=time+rnd, tokens=[{time,hmac(salt+time)}] }
app.get("/api/listboxes", async (req, resp) => {
  const timeStart = Date.now();
  try {
    let boxes = await runWithIMAP(async (imap) => {
      return await getEmailBoxes(imap);
    });
    resp.send({ err: null, result: boxes, timespan: Date.now() - timeStart });
  } catch (error) {
    resp.send({ err: error, result: null, timespan: Date.now() - timeStart });
  }
});

app.get("/api/newemail", (req, resp) => {
  const alias = randString(20);
  const email = alias2address(alias);
  const emailsecret = emailAliasSecret(email);

  resp.send({ err: null, email, emailsecret });
});

app.get("/api/getcode", (req, resp) => {
  resp.send({
    err: null,
    code: get10MinCode(),
    desc: "Don't change letter case, valid for 10min"
  });
});

app.post("/api/verifycode", (req, resp) => {
  // Debug EP, the verify code need to be added to
  //    each email list/read
  const { email, code, hashproof } = req.body;

  let result = false;
  let error = "init";
  try {
    error = null;
    result = verifyEmailCode(email, code, hashproof);
  } catch (err) {
    error = `${err}`;
  }

  resp.send({
    err: error,
    valid: result
  });
});

app.get("/api/", (req, resp) => {
  resp.send("my default home");
});

module.exports = { app };
