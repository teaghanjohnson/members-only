const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");
const { isMember } = require("./authMiddleware.js");

router.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

router.get("/sign-up", (_req, res) => res.render("signup"));
router.post("/sign-up", async (req, res, next) => {
  try {
    const hashedPassword = await genPassword(req.body.password);
    await db.createUser(
      req.body.firstName,
      req.body.lastName,
      req.body.username,
      hashedPassword,
    );
    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

router.get("/log-in", (_req, res) => res.render("log-in"));
router.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/log-in",
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
 * Member login (protected routes) Routes - handling when log-ins are members
 */

router.get("/protected-route", isAuth, (req, res, next) => {
  res.send("You made it to the route");
});
router.get("/member-route", isMember, (req, res, next) => {
  res.send("You made it to the route");
});

router.get("/logout", (req, res, next) => {
  req.logout();
  res.redirect("/protected-route");
});

router.get("/login-success", (req, res, next) => {
  res.send(
    '<p>You successfully logged in. --> <a href="/protected-route">Go to protected route</a></p>',
  );
});

router.get("/login-failure", (req, res, next) => {
  res.send("You entered the wrong password");
});
module.exports = router;
