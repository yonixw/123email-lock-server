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
const getTimeFilter = (address, sinceDate = new Date()) => [
  ["TO", address],
  ["SINCE", sinceDate]
];

const getIDFilter = (address, msgID) => [
  ["TO", address],
  ["HEADER", "Message-ID", msgID]
];

const runWithIMAP = (cb) => {
  // cb type: (imap)=>Promise<?>
  const connectionTag = "\t[*]" + randString(10) + ": ";
  return new Promise((ok, bad) => {
    try {
      const imap = new Imap(imapConfig);
      imap.once("ready", () => {
        console.log(connectionTag, "Connection ready");
        try {
          cb(imap, connectionTag)
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

function searchInBox(
  imap,
  boxname,
  filter,
  connectionTag,
  mapEmail = (e) => e,
  deleteAll = false
) {
  let searchResults = [];
  return new Promise((ok, bad) => {
    imap.openBox(boxname, false, () => {
      imap.search(filter, (err, uuid_results) => {
        // @remind: You get list of uuid then fetch each one!

        console.log(connectionTag, `Got ${uuid_results.length} search results`);

        if (err || !uuid_results) {
          return bad(err);
        }

        if (uuid_results.length === 0) {
          return ok(searchResults);
        }

        let counter = 0;
        const fetchMailProcess = imap.fetch(uuid_results, { bodies: "" });
        fetchMailProcess.on("message", (msg) => {
          counter++;
          msg.on("body", (stream) => {
            simpleParser(stream, async (err, parsed) => {
              //const {from, to, date, subject, textAsHtml, text, html, messageId} = parsed;
              if (err) {
                console.log(connectionTag, `Error parsing an email: ${err}`);
                searchResults.push(`Error parsing an email: ${err}`);
              } else {
                searchResults.push(mapEmail(parsed));
              }
              console.log(connectionTag, "Processed msg", counter);

              if (searchResults.length === uuid_results.length) {
                console.log(connectionTag, "Done processing Count=" + counter);
                return ok(searchResults);
              }
            });
          });

          msg.once("attributes", (attrs) => {
            const { uid } = attrs;
            if (deleteAll) {
              imap.addFlags(uid, "Deleted");
            }
          });
        });
        fetchMailProcess.once("error", (err) => {
          console.log(connectionTag, `Error in search process: ${err}`);
          return bad(err);
        });
        fetchMailProcess.once("end", () => {
          console.log(connectionTag, "Done fetching Count=" + counter);
        });
      });
    });
  });
}

module.exports = {
  alias2address,
  runWithIMAP,
  getEmailBoxes,
  getTimeFilter,
  getIDFilter,
  searchInBox
};
