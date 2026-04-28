const bcrypt = require("bcryptjs");

async function genPassword(password) {
  return bcrypt.hash(password, 12); // returns single has string
}
function validPassword(password, hash) {
  return bcrypt.compare(password, hash); // returns boolean
}

module.exports.validPassword = validPassword;
module.exports.genPassword = genPassword;
