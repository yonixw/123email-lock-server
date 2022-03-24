const { toSafeURL, fromSafeURL, parseTimeSafeSec } = require("./utils");
const { hmac, encrypt, decrypt, keydecrypt, keyencrypt } = require("./crypto");
const prettyTime = require("pretty-ms");

var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return next();
});
app.use(logger("dev"));
app.use(express.json());
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

// [token times] => {salt=time+rnd, tokens=[{time,hmac(salt+time)}] }
app.post("/api/setup", (req, resp) => {
  var tokens = req.body["time"];
  var result = {};
  resp.send(result);
});

app.get("/api/", (req, resp) => {
  resp.send("my default home");
});

module.exports = { app };