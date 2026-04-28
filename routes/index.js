const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");

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

module.exports = router;
