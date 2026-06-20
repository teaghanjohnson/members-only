module.exports.isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/log-in");
  }
};
module.exports.isMember = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === "member" || req.user.role === "admin")) {
    next();
  } else {
    res.redirect("/log-in");
  }
};

module.exports.isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    next();
  } else {
    res.redirect("/");
  }
};
