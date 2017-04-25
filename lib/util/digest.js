const crypto = require('crypto')
  ;


function sha256(str, encoding) {
  const hasher = crypto.createHash('sha256');
  hasher.update(str);
  return hasher.digest(encoding);
}


module.exports = sha256;
