# Martinet

[![Build Status](https://travis-ci.org/iceroad/martinet.svg?branch=master)](https://travis-ci.org/iceroad/martinet)
[![bitHound Code](https://www.bithound.io/github/iceroad/martinet/badges/code.svg)](https://www.bithound.io/github/iceroad/martinet)
[![bitHound Overall Score](https://www.bithound.io/github/iceroad/martinet/badges/score.svg)](https://www.bithound.io/github/iceroad/martinet)
[![bitHound Dependencies](https://www.bithound.io/github/iceroad/martinet/badges/dependencies.svg)](https://www.bithound.io/github/iceroad/martinet/master/dependencies/npm)


Martinet is an opinionated, command-line build tool for static websites and single-page webapps, built on the [Webpack](https://webpack.github.io/) module bundler. Its purpose is to bring you all the power and modern features of Webpack, without having to interact with Webpack itself. It is suited for those who want to build static websites, hybrid single page applications, and combinations of the two.

Martinet starts by looking for a build specification in a file called `martinet.json`.

This is an example of a build specification that mixes multiple template and style languages, in addition to base HTML and CSS.

    {
      "global": {
        "styles": [ "style-root.less" ],
        "scripts": [ "progressive-enhancement.js" ]
      },
      "pages": [
        {
          "src": "template.pug",
          "data": [ "some-data.json" ],
          "scripts": [ "analytics.js" ],
          "dist": "index.html"
        },
        {
          "src": "about.html",
          "dist": "about/index.html"
        }
      ]
    }

Martinet processes all the pages listed in the `pages` section, producing an optimized web distribution that includes all the following features out of the box:

  * Modern language support: [ES2017](https://babeljs.io/docs/plugins/preset-latest/), [TypeScript](https://www.typescriptlang.org/), [LessCSS](http://lesscss.org/), [Pug](https://pugjs.org/api/getting-started.html), in addition to HTML and CSS.
  * Support for dependencies installed via `npm`.
  * Asset bundling and versioning, for separating cacheable content.
  * Tree-shaking on ES6 modules, resulting in smaller bundles.
  * Auto-refreshing web server for development.
  * Support for statically injecting JSON data files into templates, *e.g.*, `some-data.json` in the example above will be injected into `template.pug` to produce `index.html`.
  * Extra support for select modern web frameworks.
    * [Single-file VueJs components](https://vuejs.org/v2/guide/single-file-components.html) (VueJs-2).
    * [Angular template bundler](https://github.com/TheLarkInn/angular2-template-loader) (Angular-2 and higher).
  * Incremental deployment to AWS S3 with the appropriate cache headers for versioned files.

After running `martinet build -o /tmp/output`, the `/tmp/output` directory will resemble the following directory listing (with different version identifiers).

    index.html
    about/index.html
    __ver__/js.a9034893.js
    __ver__/style.b8932a83.css

You can now open the HTML files in a browser, or run `martinet deploy` to upload the web distribution to an AWS S3 bucket.

In production mode (the default for `build`), the HTML, Javascript, and CSS files will be optimized and minified, and a content-based hexadecimal identifier added to the filename. Any references to the file will be updated to point to this new filename. The `__ver__` directory will contain versioned copies of all asset files that have been found in your project, and can be cached indefinitely for client-side performance.

The design of Martinet favors **convention-over-configuration**. The target use case is to build small-to-medium static sites and single-page web applications, as well as combinations of the two.

### Install

    npm install -g @iceroad/martinet
    martinet --help

## Conventions

**martinet**, *n.* a person who stresses a rigid adherence to the details of forms and methods.

Martinet's conventions are put in place so that you do not have to configure
Webpack yourself

  1. All style and script dependencies should be included in either the build specification, or
     using language-specific import commands. Do not include internal dependencies via `<script>` and `<link>` tags in HTML.

       * Javascript/Typescript: Prefer selective imports using `import` over `require()`, where possible.
       * CSS/Less: Use `@import`.
       * Pug: Use `include` or `extends`.

  2. **Use relative paths to reference your project's modules and resources.** This allows the asset bundler to collect and version all your project's images, fonts, and other file dependencies. This will also ensure that your project will be loadable using the `file://` protocol in browsers, a requirement for [Apache Cordova](https://cordova.apache.org/). And finally, using relative paths makes the output distribution self-contained, allowing a larger site to be broken up into smaller projects.

       * Javascript/Typescript: `import { SomeModule } from '../SomeDirectory';`
       * Pug: `img(src="../../img/my-image.png")`
       * CSS/Less: `@import '../fonts/fonts.css';`

  3. Use `npm` to install third-party dependencies like jQuery, Angular, or Lodash in your project's root directory. This will install your project's dependencies to a `node_modules` folder inside your project. You do not have to include a relative path in this case.

       * Javascript/Typescript: `import { map } from 'lodash/map';`
       * CSS: `@import '~bootstrap';`  **note the tilde (~)**
       * Less: `@import '~bootstrap/less/bootstrap.less';`
       * Pug: not applicable

----

## Examples

See the [test_data](https://github.com/iceroad/martinet/tree/master/test_data) directory for a number of example projects demonstrating different project layouts.
