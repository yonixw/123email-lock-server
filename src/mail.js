const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { randString } = require("./utils");
const imapConfig = {
  user: process.env.USERNAME || "test-email",
  password: process.env.PASSWORD || "test-password",
  host: process.env.IMAP_DOMAIN || "imap-domain",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

const alias2address = (alias) => {
  return (process.env.EMAIL_FORMAT || "!!@example.com").replace("!!", alias);
};

// const filter = ["UNSEEN", ["SINCE", new Date()]];
const getFilter = (alias) => [["TO", alias2address(alias)]];

const runWithIMAP = (cb) => {
  // cb type: (imap)=>Promise<?>
  const connectionTag = randString(10);
  return new Promise((ok, bad) => {
    try {
      const imap = new Imap(imapConfig);
      imap.once("ready", () => {
        console.log(connectionTag, "Connection ready");
        try {
          cb(imap)
            .then((e) => ok(e))
            .catch((err) => bad(err))
            .finally(() => imap.end());
        } catch (error) {
          bad(error);
        }
      });

      imap.once("error", (err) => {
        console.log(connectionTag, "Connection error");
        bad(err);
      });

      imap.once("end", () => {
        console.log(connectionTag, "Connection ended");
      });

      imap.connect();
    } catch (ex) {
      console.log(connectionTag, "Genrtal error");
      bad(ex);
    }
  });
};

function _iterateSubBoxFolders(folders) {
  // from: https://stackoverflow.com/a/30514855/1997873

  var FOLDERS = [];
  var folder = {};

  for (var key in folders) {
    if (folders[key].attribs.indexOf("\\HasChildren") > -1) {
      var children = _iterateSubBoxFolders(folders[key].children);

      folder = {
        name: key,
        children: children
      };
    } else {
      folder = {
        name: key,
        children: null
      };
    }

    FOLDERS.push(folder);
  }
  return FOLDERS;
}

function getEmailBoxes(imap) {
  return new Promise((ok, bad) => {
    var folders = [];
    if (imap) {
      imap.getBoxes(function (err, boxes) {
        if (err) {
          bad(err);
        } else {
          folders = _iterateSubBoxFolders(boxes);
          ok(folders);
        }
      });
    } else {
      ok([]);
    }
  });
}

module.exports = {
  alias2address,
  runWithIMAP,
  getEmailBoxes
};
