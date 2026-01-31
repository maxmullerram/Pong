const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const { db, init } = require("./db");
const { requireAuth } = require("./middleware/auth");
const { rateLimit } = require("./middleware/rateLimit");

const app = express();
const PORT = process.env.PORT || 3000;

init();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "pong-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: "Too many attempts. Try again soon." });

function sanitizeUsername(value) {
  return String(value || "").trim();
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const username = sanitizeUsername(req.body.username);
    const password = req.body.password;

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Username must be 3-20 characters and use letters, numbers, or underscore." });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    db.get("SELECT id FROM users WHERE username = ?", [username], async (err, row) => {
      if (err) {
        return next(err);
      }
      if (row) {
        return res.status(409).json({ error: "Username already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const createdAt = new Date().toISOString();

      db.run(
        "INSERT INTO users (username, password_hash, best_score, created_at) VALUES (?, ?, ?, ?)",
        [username, passwordHash, 0, createdAt],
        function insertCb(insertErr) {
          if (insertErr) {
            return next(insertErr);
          }
          req.session.user = { id: this.lastID, username };
          return res.json({ id: this.lastID, username });
        }
      );
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, (req, res, next) => {
  const username = sanitizeUsername(req.body.username);
  const password = req.body.password;

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: "Invalid username or password." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "Invalid username or password." });
  }

  db.get(
    "SELECT id, username, password_hash, best_score, best_score_at FROM users WHERE username = ?",
    [username],
    async (err, row) => {
      if (err) {
        return next(err);
      }
      if (!row) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const matches = await bcrypt.compare(password, row.password_hash);
      if (!matches) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      req.session.user = { id: row.id, username: row.username };
      return res.json({ id: row.id, username: row.username, bestScore: row.best_score, bestScoreAt: row.best_score_at });
    }
  );
});

app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie("connect.sid");
    return res.json({ ok: true });
  });
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  return res.json({ user: req.session.user });
});

app.post("/api/game/result", requireAuth, (req, res, next) => {
  const scorePlayer = Number(req.body.score_player);
  const scoreAi = Number(req.body.score_ai);
  const durationSeconds = Number(req.body.duration_seconds);

  if (!Number.isInteger(scorePlayer) || !Number.isInteger(scoreAi) || !Number.isInteger(durationSeconds)) {
    return res.status(400).json({ error: "Invalid game result payload." });
  }

  const createdAt = new Date().toISOString();
  const userId = req.session.user.id;

  db.run(
    "INSERT INTO games (user_id, score_player, score_ai, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?)",
    [userId, scorePlayer, scoreAi, durationSeconds, createdAt],
    function insertGame(err) {
      if (err) {
        return next(err);
      }

      db.get("SELECT best_score FROM users WHERE id = ?", [userId], (selectErr, row) => {
        if (selectErr) {
          return next(selectErr);
        }

        const currentBest = row ? row.best_score : 0;
        if (scorePlayer > currentBest) {
          db.run(
            "UPDATE users SET best_score = ?, best_score_at = ? WHERE id = ?",
            [scorePlayer, createdAt, userId],
            (updateErr) => {
              if (updateErr) {
                return next(updateErr);
              }
              return res.json({ ok: true, bestScore: scorePlayer });
            }
          );
        } else {
          return res.json({ ok: true, bestScore: currentBest });
        }
      });
    }
  );
});

app.get("/api/leaderboard", (req, res, next) => {
  db.all(
    "SELECT username, best_score, best_score_at FROM users WHERE best_score > 0 ORDER BY best_score DESC, best_score_at DESC LIMIT 20",
    [],
    (err, rows) => {
      if (err) {
        return next(err);
      }
      return res.json({ leaderboard: rows });
    }
  );
});

app.get("/api/profile/me", requireAuth, (req, res, next) => {
  const userId = req.session.user.id;

  db.get(
    "SELECT id, username, best_score, best_score_at, created_at FROM users WHERE id = ?",
    [userId],
    (err, userRow) => {
      if (err) {
        return next(err);
      }
      db.all(
        "SELECT score_player, score_ai, duration_seconds, created_at FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        [userId],
        (gamesErr, gameRows) => {
          if (gamesErr) {
            return next(gamesErr);
          }
          return res.json({ user: userRow, games: gameRows });
        }
      );
    }
  );
});

app.get("/api/profile/:username", (req, res, next) => {
  const username = sanitizeUsername(req.params.username);

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: "Invalid username." });
  }

  db.get(
    "SELECT id, username, best_score, best_score_at, created_at FROM users WHERE username = ?",
    [username],
    (err, userRow) => {
      if (err) {
        return next(err);
      }
      if (!userRow) {
        return res.status(404).json({ error: "User not found." });
      }
      db.all(
        "SELECT score_player, score_ai, duration_seconds, created_at FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        [userRow.id],
        (gamesErr, gameRows) => {
          if (gamesErr) {
            return next(gamesErr);
          }
          return res.json({ user: userRow, games: gameRows });
        }
      );
    }
  );
});

app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/game", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));
app.get("/leaderboard", (req, res) => res.sendFile(path.join(__dirname, "public", "leaderboard.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "public", "profile.html")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Pong app listening on port ${PORT}`);
});
