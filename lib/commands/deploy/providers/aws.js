const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  construct = require('runtype').construct,
  digest = require('../../../util/digest'),
  fs = require('fs'),
  log = require('../../../util/log'),
  mime = require('mime'),
  zlib = require('zlib'),
  AWS = require('aws-sdk')
  ;

class AWSProvider {
  constructor(targetConfig) {
    this.config_ = construct({
      type: 'object',
      fields: {
        aws_access_key_id: {
          type: 'string',
          minLength: 10,
        },
        aws_secret_access_key: {
          type: 'string',
          minLength: 10,
        },
        s3_bucket: {
          type: 'string',
          minLength: 1,
        },
        aws_region: {
          type: 'string',
          minLength: '5',
        },
      },
    }, targetConfig);
    this.s3_ = new AWS.S3();
  }

  getRemoteListing(cb) {
    const config = this.config_;
    const s3 = this.s3_;
    const params = {
      Bucket: config.s3_bucket,
      MaxKeys: 1000,
    };
    s3.listObjectsV2(params, (err, output) => {
      if (err) {
        return cb(new Error(
            `AWS-S3 error on bucket "${config.s3_bucket}": "${err}"`));
      }

      if (output.isTruncated) {
        return cb(new Error(
            'AWS-S3 provider TODO: support for more than 1000 files.'));
      }

      // Convert S3 list output.
      const remoteFiles = _.map(output.Contents, rfObj => ({
        relPath: rfObj.Key,
        size: rfObj.Size,
        mtime: rfObj.LastModified.getTime(),
      }));

      // Make headObject() calls on each key to retrieve metadata.
      async.parallelLimit(_.map(remoteFiles, remoteFileObj => (cb) => {
        const params = {
          Bucket: config.s3_bucket,
          Key: remoteFileObj.relPath,
        };
        s3.headObject(params, (err, head) => {
          if (err) return cb(err);
          log.debug(`HEAD ${remoteFileObj.relPath} => ${head.Metadata.sha256}`);
          const hash = head.Metadata.sha256;
          remoteFileObj.hash = hash;
          return cb(null, remoteFileObj);
        });
      }), 5, cb);
    });
  }

  upload(localFileObj, cb) {
    const config = this.config_;
    const s3 = this.s3_;

    //
    // AWS S3 doc for putObject
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
    //
    const contentType = mime.lookup(localFileObj.relPath);
    const params = {
      Bucket: config.s3_bucket,
      Key: localFileObj.relPath,
      ACL: 'public-read',
      CacheControl: 'no-cache',
      ContentType: contentType,
    };
    if (localFileObj.relPath.match(/^__ver__/)) {
      const foreverSec = 30 * 24 * 60 * 60;  // 30 days.
      params.CacheControl = `public, max-age=${foreverSec}`;
      params.Expires = new Date(Date.now() + (foreverSec * 1000));
    }

    async.auto({
      //
      // Read file from disk.
      //
      fileBuffer: cb => fs.readFile(localFileObj.absPath, cb),

      //
      // Compute its digest to server as the etag.
      //
      digest: ['fileBuffer', (deps, cb) => {
        assert(Buffer.isBuffer(deps.fileBuffer));
        const contentHash = digest(deps.fileBuffer, 'base64');
        params.Metadata = {
          sha256: contentHash,
        };
        return cb(null, contentHash);
      }],

      //
      // Store file compressed if compressing it makes it smaller.
      //
      body: ['fileBuffer', 'digest', (deps, cb) => {
        const data = deps.fileBuffer;
        zlib.gzip(data, {
          level: zlib.Z_BEST_COMPRESSION,
        }, (err, compressed) => {
          if (err) return cb(err);
          if (compressed.length < data.length) {
            // Compression just saved you money on bandwidth, huzzah.
            params.ContentEncoding = 'gzip';
            params.ContentLength = compressed.length;
            params.Body = compressed;
          } else {
            params.ContentLength = data.length;
            params.Body = data;
          }
          return cb(null, params);
        });
      }],

      //
      // Upload the file to the bucket.
      //
      upload: ['body', 'digest', (deps, cb) => s3.putObject(params, cb)],
    }, (err) => {
      if (err) return cb(err);
      log.info(col.yellow(
          `Uploaded ${col.bold(localFileObj.relPath)}`));
      return cb();
    });
  }

  remoteDelete(remoteFileObj, cb) {
    const config = this.config_;
    const s3 = this.s3_;
    const params = {
      Bucket: config.s3_bucket,
      Key: remoteFileObj.relPath,
    };
    log.info(`Deleting ${col.bold(remoteFileObj.relPath)}`.red);
    s3.deleteObject(params, cb);
  }
}

module.exports = AWSProvider;
