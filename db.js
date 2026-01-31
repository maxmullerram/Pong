const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbFile = path.join(__dirname, "data.sqlite");
const db = new sqlite3.Database(dbFile);

function init() {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        best_score INTEGER DEFAULT 0,
        best_score_at TEXT,
        created_at TEXT NOT NULL
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score_player INTEGER NOT NULL,
        score_ai INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`
    );

    db.run("CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_users_best_score ON users(best_score)");
  });
}

module.exports = {
  db,
  init,
};
