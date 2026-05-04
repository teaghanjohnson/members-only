const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");
const { isMember, isAuth } = require("./authMiddleware.js");

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
    successRedirect: "/login-success",
    failureRedirect: "/login-failure",
  }),
);

router.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/**
 * AUTHENTICATION ROUTES
 * Member login (protected routes) Routes - handling when log-ins are members
 */

router.get("/protected-route", isAuth, (req, res, next) => {
  res.render("user");
});
router.get("/member-route", isMember, (req, res, next) => {
  res.send("member");
});

router.get("/login-success", (req, res, next) => {
  res.render("login-success");
});

router.get("/login-failure", (req, res, next) => {
  res.send("You entered the wrong password");
});
module.exports = router;

// after signing in show welcome back filtraded
