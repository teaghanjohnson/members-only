const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");
const { isAdmin, isAuth } = require("./authMiddleware.js");

router.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

router.get("/sign-up", (_req, res) => res.render("signup"));
router.post("/sign-up", async (req, res, next) => {
  try {
    const existing = await db.getUserByUsername(req.body.username);
    if (existing) {
      return res.render("signup", { error: "Username already taken." });
    }
    const hashedPassword = await genPassword(req.body.password);
    await db.createUser(
      req.body.first_name,
      req.body.last_name,
      req.body.username,
      hashedPassword,
    );
    res.redirect("/log-in");
  } catch (error) {
    next(error);
  }
});

router.get("/log-in", (_req, res) => res.render("log-in"));
router.post("/log-in", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) return next(err);
    if (!user) return res.redirect("/log-in");

    req.logIn(user, (err) => {
      if (err) return next(err);
      if (user.role === "admin") return res.redirect("/admin");
      return res.redirect("/");
    });
  })(req, res, next);
});

router.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

router.get("/admin", isAdmin, (req, res) => {
  res.render("admin", { user: req.user });
});

router.get("/member", isAuth, (req, res) => {
  res.render("member", { user: req.user });
});

module.exports = router;
