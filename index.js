/*jshint node:true*/

'use strict';

var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var defaults = require('lodash.defaults');
var rename = require('broccoli-stew').rename;
var existsSync = require('exists-sync');
var chalk = require('chalk');
var path = require('path');

module.exports = {
  name: 'quantities',

  included: function(app) {
    this._super.included.apply(this, arguments);

    // see: https://github.com/ember-cli/ember-cli/issues/3718
    while (typeof app.import !== 'function' && app.app) {
      app = app.app;
    }

    this.app = app;
    this.quantityOptions = this.getConfig();

    if (isFastBoot()) {
      this.importFastBootDependencies(app);
    } else {
      this.importBrowserDependencies(app);
    }

    return app;
  },

  importFastBootDependencies: function(app) {
    if (arguments.length < 1) {
      throw new Error('Application instance must be passed to import');
    }

    var vendor = this.treePaths.vendor;

    app.import(vendor + '/fastboot-quantities.js');
  },

  importBrowserDependencies: function(app) {
    if (arguments.length < 1) {
      throw new Error('Application instance must be passed to import');
    }

    var vendor = this.treePaths.vendor;
    var options = this.quantityOptions;

    app.import({
      development: vendor + '/js-quantities/quantities.js',
      production: vendor + '/js-quantities/quantities.js'
    }, { prepend: true });
  },

  getConfig: function() {
    var projectConfig = ((this.project.config(process.env.EMBER_ENV) || {}).quantities || {});
    var quantitiesPath = path.dirname(require.resolve('js-quantities'));

    var config = defaults(projectConfig, {
      quantitiesPath: quantitiesPath
    });

    return config;
  },

  treeForPublic: function() {
    var publicTree = this._super.treeForPublic.apply(this, arguments);

    if (isFastBoot()) {
      return publicTree;
    }

    var options = this.quantityOptions;
    var trees = [];

    if (publicTree) {
      trees.push(publicTree);
    }

    return mergeTrees(trees);
  },

  treeForVendor: function(vendorTree) {
    if (isFastBoot()) {
      return this.treeForNodeVendor(vendorTree);
    } else {
      return this.treeForBrowserVendor(vendorTree);
    }
  },

  treeForNodeVendor: function(vendorTree) {
    var trees = [];
    var options = this.quantityOptions;

    if (vendorTree) {
      trees.push(vendorTree);
    }

    var fileName;

    fileName = 'fastboot-quantities.js';

    var tree = new Funnel(path.join(__dirname, './assets'), {
      files: [fileName],
    });

    tree = rename(tree, function() {
      return 'fastboot-quantities.js';
    });

    trees.push(tree);

    return mergeTrees(trees);
  },

  treeForBrowserVendor: function(vendorTree) {
    var trees = [];
    var options = this.quantityOptions;

    if (vendorTree) {
      trees.push(vendorTree);
    }

    trees.push(new Funnel(options.quantitiesPath, {
      destDir: 'js-quantities',
      include: [new RegExp(/\.js$/)],
      exclude: ['tests', 'ender', 'package'].map(function(key) {
        return new RegExp(key + '\.js$');
      })
    }));

    return mergeTrees(trees);
  }
};

// Checks to see whether this build is targeting FastBoot. Note that we cannot
// check this at boot time--the environment variable is only set once the build
// has started, which happens after this file is evaluated.
function isFastBoot() {
  return process.env.EMBER_CLI_FASTBOOT === 'true';
}
