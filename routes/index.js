const router = require("express").Router();
const passport = require("passport");
const { genPassword } = require("../lib/passwordUtils");
const db = require("../db/queries");
<<<<<<< HEAD
const { isAdmin, isAuth } = require("./authMiddleware.js");
const {
  default: nextAppLoader,
} = require("next/dist/build/webpack/loaders/next-app-loader/index.js");
=======
const { isAuth } = require("./authMiddleware.js");
>>>>>>> 509cdd9adfc726bf0b6cc6758d5dee5d4bcfcdb9

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
<<<<<<< HEAD
    const isAdmin = req.body.admin === "yes";
    await db.createUser(
      req.body.first_name,
      req.body.last_name,
      req.body.username,
      hashedPassword,
      isAdmin,
    );
=======

    await db.createUser({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      passwordHash: hashedPassword,
    });
>>>>>>> 509cdd9adfc726bf0b6cc6758d5dee5d4bcfcdb9
    res.redirect("/log-in");
  } catch (error) {
    next(error);
  }
});

router.get("/log-in", (_req, res) => res.render("log-in"));
<<<<<<< HEAD
router.post("/log-in", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) return next(err);
    if (!user) return res.redirect("/log-in");

    req.logIn(user, (err) => {
      if (err) return next(err);
      if (user.is_admin) return res.redirect("/admin");
      return res.redirect("/member");
    });
  })(req, res, next);
});
=======
router.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/member-route",
    failureRedirect: "/login-failure",
  }),
);
>>>>>>> 509cdd9adfc726bf0b6cc6758d5dee5d4bcfcdb9

router.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

<<<<<<< HEAD
router.get("/admin", isAdmin, (req, res) => {
  res.render("admin", { user: req.user });
});

router.get("/member", (req, res) => {
  res.render("member", { user: req.user });
});
=======
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

>>>>>>> 509cdd9adfc726bf0b6cc6758d5dee5d4bcfcdb9
module.exports = router;
