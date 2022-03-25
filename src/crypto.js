const crypto = require("crypto");
const _simpleenc = require("simple-encryptor");
const key = process.env.KEY; // echo "$(< /dev/urandom tr -dc A-Za-z0-9 | head -c 64)"
const encryptor = _simpleenc(key);

function keyencrypt(data, scope, encKey) {
  const encryptor = _simpleenc(scope + key + encKey);
  return encryptor.encrypt(data);
}

function keydecrypt(chiper, scope, encKey) {
  const encryptor = _simpleenc(scope + key + encKey);
  return encryptor.decrypt(chiper);
}

function hashSecret(scope, data) {
  return crypto
    .createHash("sha256")
    .update(`${scope}|${key}|${data}`)
    .digest("hex");
}

function hashChallenge(scope, data, code) {
  return crypto
    .createHash("sha256")
    .update(`${code}` + hashSecret(scope, data))
    .digest("hex");
}

function emailAliasSecret(email) {
  return hashSecret("alias", email);
}

function get10MinCode() {
  const isoMinutes10s = new Date().toISOString().split(/[0-9]:[0-9]{1,2}\./)[0];
  return hashSecret("code", isoMinutes10s).substring(0, 6);
}

function verifyEmailCode(email, code, hashproof) {
  return (
    hashChallenge("alias", email, get10MinCode(code)).toLowerCase() ===
    hashproof.toLowerCase()
  );
}

module.exports = {
  encryptor: encryptor,
  hmac: encryptor.hmac,
  encrypt: encryptor.encrypt,
  decrypt: encryptor.decrypt,
  keyencrypt,
  keydecrypt,

  hashSecret,
  hashChallenge,

  emailAliasSecret,
  get10MinCode,
  verifyEmailCode
};
