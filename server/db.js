// ----------------------------------------------------------------------------
// Creates / opens the SQLite database and applies init.sql on every start.
// init.sql only uses CREATE TABLE IF NOT EXISTS, safe to run
// repeatedly. The marker can either just start the server (this file runs
// automatically) or run init.sql manually with the sqlite3 CLI.
// Delete healthcover.db to reset to an empty database.
// ----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'healthcover.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
db.exec(initSql);

module.exports = db;