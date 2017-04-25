const fs = require('fs'),
  path = require('path')
;


function InitCmd() {
  const projRoot = process.cwd();
  const specPath = path.join(projRoot, 'martinet.json');
  if (!fs.existsSync(specPath)) {
    fs.mkdirSync('dist');

    fs.writeFileSync(path.join(projRoot, 'index.pug'), `
doctype
html
  head
    title Project Skeleton
  body
    h1 Project Skeleton
`, 'utf-8');

    fs.writeFileSync(path.join(projRoot, 'style.css'), `
body {
  background-color: #ddd;
}`, 'utf-8');

    fs.writeFileSync(path.join(projRoot, 'app.js'), `
console.log('Loaded!')`, 'utf-8');

    fs.writeFileSync(specPath, JSON.stringify({
      pages: [
        {
          src: 'index.pug',
          dist: 'index.html',
          styles: ['style.css'],
          scripts: ['app.js'],
        },
      ],
      paths: {
        dist: 'dist',
      },
    }, null, 2), 'utf-8');
    console.log(`Created martinet.json in ${projRoot}.`);
  }
}


module.exports = InitCmd;
