/* eslint-disable global-require, import/no-dynamic-require */
const _ = require('lodash'),
  fs = require('fs'),
  digest = require('./digest'),
  os = require('os'),
  path = require('path')
  ;


const CACHE_PATH = path.join(os.tmpdir(), '.hashcache.json');
const CACHE = (function loadCache() {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      return require(CACHE_PATH);
    } catch (e) {
      console.warn(`Unable to read file hash cache from ${CACHE_PATH}: ${e}`);
      return process.exit(1);
    }
  }
  return {};
}());


process.once('exit', () => {
  if (!_.isEmpty(CACHE)) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(CACHE), 'utf-8');
  }
});


function hashcache(absPath) {
  const realPath = fs.realpathSync(absPath);
  const curMtime = fs.statSync(absPath).mtime.getTime();

  const cacheItem = CACHE[realPath];
  if (cacheItem) {
    if (cacheItem.mtime === curMtime) {
      return cacheItem.hash;
    }
  }

  const hash = digest(fs.readFileSync(absPath)).toString('base64');

  CACHE[realPath] = {
    mtime: curMtime,
    hash,
  };

  return hash;
}

module.exports = hashcache;
