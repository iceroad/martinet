const col = require('colors'),
  fs = require('fs'),
  fse = require('fs-extra'),
  log = require('../../util/log'),
  path = require('path'),
  spawnSync = require('child_process').spawnSync
  ;


function InitCmd() {
  const projRoot = process.cwd();

  // Create skeleton directory structure.
  fse.ensureDirSync(path.join(projRoot, 'src'));
  fse.ensureDirSync(path.join(projRoot, 'dist'));

  // Create build specification.
  const specPath = path.join(projRoot, 'martinet.json');
  if (!fs.existsSync(specPath)) {
    fs.writeFileSync(specPath, JSON.stringify({
      pages: [
        {
          src: 'index.pug',
          dist: 'index.html',
          styles: ['style.less'],
          scripts: ['app.js'],
        },
        {
          src: 'index.pug',
          dist: 'about/index.html',
          styles: ['style.less'],
          scripts: ['app.js'],
        },
      ],
      paths: {
        src: 'src',
        dist: 'dist',
      },
    }, null, 2), 'utf-8');
    log.info(`Created ${col.yellow('martinet.json')} in ${projRoot}.`);
  }

  // Create index.pug.
  const indexPugPath = path.join(projRoot, 'src', 'index.pug');
  if (!fs.existsSync(indexPugPath)) {
    fs.writeFileSync(indexPugPath, `doctype
html
  head
    meta(charset='utf-8')
    meta(http-equiv='X-UA-Compatible', content='IE=edge')
    meta(name='viewport', content='width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no')
    meta(name='apple-mobile-web-app-capable', content='yes')
    meta(name='apple-mobile-web-app-status-bar-style', content='black-translucent')

    title Project Skeleton
  body
    h1 Project Skeleton
    p This file is called #[strong index.pug].
    p See #[a(href='https://github.com/iceroad/martinet') documentation at Github].
`, 'utf-8');
    log.info(`Created ${col.yellow('index.pug')} in ${indexPugPath}.`);
  }

  // Create style.less
  const lessPath = path.join(projRoot, 'src', 'style.less');
  if (!fs.existsSync(lessPath)) {
    fs.writeFileSync(lessPath, `body {
  background-color: #dedede;
  text-align: center;
}`, 'utf-8');
    log.info(`Created ${col.yellow('style.less')} in ${lessPath}.`);
  }

  // Create app.js
  const jsPath = path.join(projRoot, 'src', 'app.js');
  if (!fs.existsSync(jsPath)) {
    fs.writeFileSync(jsPath, 'console.log(\'Loaded!\')', 'utf-8');
    log.info(`Created ${col.yellow('app.js')} in ${jsPath}.`);
  }

  // Create deploy.json.template
  const deployTemplPath = path.join(projRoot, 'deploy.json');
  if (!fs.existsSync(deployTemplPath)) {
    fs.writeFileSync(deployTemplPath, JSON.stringify({
      targets: [
        {
          name: 'prod',
          provider: 'aws',
          config: {
            aws_access_key_id: '<ENTER AWS ACCESS KEY ID HERE>',
            aws_secret_access_key: '<ENTER AWS SECRET ACCESS KEY HERE>',
            s3_bucket: '<ENTER S3 BUCKET TO DEPLOY TO HERE>',
          },
        },
        {
          name: 'test',
          provider: 'aws',
          config: {
            aws_access_key_id: '<ENTER AWS ACCESS KEY ID HERE>',
            aws_secret_access_key: '<ENTER AWS SECRET ACCESS KEY HERE>',
            s3_bucket: '<ENTER ANOTHER S3 BUCKET TO DEPLOY TO HERE>',
          },
        },
      ],
    }, null, 2));
    log.info(`Created ${col.yellow('deploy.json')} template in ${jsPath}.`);
  }

  // Create package.json using npm in 'src'.
  const cmdLine = 'npm init -y';
  const srcPath = path.join(projRoot, 'src');
  log.info(`Creating ${col.yellow('package.json')} in ${srcPath}.`);
  spawnSync(cmdLine, {
    cwd: srcPath,
    stdio: 'inherit',
    shell: true,
  });

  log.info(`Done. Run ${'martinet dev'.bold} to start development.`.green);
}


module.exports = InitCmd;
