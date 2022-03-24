const Imap = require("imap");
const { simpleParser } = require("mailparser");
const imapConfig = {
  user: process.env.USERNAME || "test-email",
  password: process.env.PASSWORD || "test-password",
  host: process.env.IMAP_DOMAIN || "imap-domain",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

const elias2address = (alias) => {
  return (process.env.EMAIL_FORMAT || "!!@example.com").replace("!!", alias);
};
