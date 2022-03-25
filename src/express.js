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
const {
  getEmailBoxes,
  runWithIMAP,
  alias2address,
  getIDFilter,
  getTimeFilter,
  searchInBox
} = require("./mail");

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

app.get("/api/listboxes", async (req, resp) => {
  // @remind: Use this EP to know the exact names of Inbox and Spam\Junk
  //            Some also in UTF-8? like ארכיון

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

async function MailProcessReq(
  req,
  resp,
  filter,
  processParsed,
  deleteAllAfter = false
) {
  const timeStart = Date.now();
  const { email, code, hashproof, boxname } = req.body;

  let result = [];
  let error = "init";
  try {
    error = null;
    let isProofValid = verifyEmailCode(email, code, hashproof);
    if (isProofValid) {
      result = await runWithIMAP(async (imap, tag) => {
        return await searchInBox(
          imap,
          boxname,
          filter,
          tag,
          processParsed,
          deleteAllAfter
        );
      });
    } else {
      resp.send({
        timespan: Date.now() - timeStart,
        err: `Proof is not valid, got '${hashproof}' for email '${email}'`,
        results: []
      });
      return;
    }
  } catch (err) {
    error = `${err}`;
  }

  resp.send({
    timespan: Date.now() - timeStart,
    err: error,
    results: result
  });
}

app.post("/api/getlastday", async (req, resp) => {
  // @remind:
  //    It's a limitation of the IMAP protocol.
  //    The search granularity is only date, not time.

  const { email } = req.body;
  //
  let sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 1);
  const filter = getTimeFilter(email, sinceDate);
  //
  const processParsed = (email) => {
    const { from, to, date, subject, messageId } = email;
    // Return info but mask numbers!
    return {
      messageId,
      from: from.text || from,
      to: to.text || to,
      date: date,
      subject: (subject || "").replace(/[0-9]/g, "X")
    };
  };
  //
  const deleteAllAfter = false;
  await MailProcessReq(req, resp, filter, processParsed, deleteAllAfter);
});

app.post("/api/deleteReadId", async (req, resp) => {
  const { email, msgid } = req.body;
  //
  const filter = getIDFilter(email, msgid || "");
  //
  const processParsed = (email) => {
    const {
      from,
      to,
      date,
      subject,
      textAsHtml,
      text,
      html,
      messageId
    } = email;
    return {
      messageId,
      from: from.text || from,
      to: to.text || to,
      date: date,
      subject: (subject || "").replace(/[0-9]/g, "X"),
      text,
      textAsHtml,
      html
    };
  };
  //
  const deleteAllAfter = true;
  await MailProcessReq(req, resp, filter, processParsed, deleteAllAfter);
});

app.get("/api/", (req, resp) => {
  resp.send("my default home");
});

module.exports = { app };
