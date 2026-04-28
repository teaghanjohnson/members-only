const router = require("express").Router();
const passport = require("passport");
const genPassword = require("../lib/passwordUtils").genPassword;
const pool = require("../config/database");
const authMiddleware = require("./authMiddleware");
