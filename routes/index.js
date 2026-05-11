const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");
const { isAuth } = require("./authMiddleware.js");

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

    await db.createUser({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      passwordHash: hashedPassword,
    });
    res.redirect("/log-in");
  } catch (error) {
    next(error);
  }
});

router.get("/log-in", (_req, res) => res.render("log-in"));
router.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/member-route",
    failureRedirect: "/login-failure",
  }),
);

router.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

router.get("/member-route", isAuth, (req, res) => {
  if (req.user.role === "admin") {
    res.render("admin", { user: req.user });
  } else {
    res.render("member", { user: req.user });
  }
});

router.get("/login-failure", (_req, res) => {
  res.send("Incorrect username or password.");
});

module.exports = router;
