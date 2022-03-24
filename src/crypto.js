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

module.exports = {
  encryptor: encryptor,
  hmac: encryptor.hmac,
  encrypt: encryptor.encrypt,
  decrypt: encryptor.decrypt,
  keyencrypt,
  keydecrypt
};
