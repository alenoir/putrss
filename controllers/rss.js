const _ = require('lodash');
const async = require('async');
const Promise = require('bluebird');
const validator = require('validator');
var request = require('request-promise');
const cheerio = require('cheerio');
var Feed = require('feed');
const User = require('../models/User');

var feed;

/**
 * GET /files/:id
 */
exports.getFiles = (req, res, next) => {
  if (req.user) {
    var parentId = req.params.parentId;
    const token = req.user.tokens.find(token => token.kind === 'putio');
    request.get({ url: 'https://api.put.io/v2/files/list', qs: { oauth_token: token.accessToken, parent_id: parentId }, json: true }).then(function(data) {
      var files = [];
      return Promise.each(data.files, function(file) {
        switch (file.content_type) {
        case 'video/x-matroska':
        case 'video/mp4':
          file.disabled = 'disabled';
          file.icon = 'fa-film';
          break;
        case 'application/x-directory':
          file.disabled = 'disabled';
          file.icon = 'fa-folder';
          break;
        case 'text/plain':
          file.disabled = 'disabled';
          file.icon = 'fa-file-text-o';
          break;
        case 'application/x-iso9660-image':
          file.disabled = 'disabled';
          file.icon = 'fa-file-image-o';
          break;
        default:
          file.disabled = 'disabled';
          file.icon = 'fa-file-o';
          break;
        }
        files.push(file);
      }).then(function() {
        console.log(req.user);
        res.render('files/list', {
          title: 'My Files',
          files: files,
          parent: data.parent,
          rssUrl: req.protocol + '://' + req.get('host') + '/rss/' + req.user._id + '/' + data.parent.id,
        });
      });
    }).catch(function(error) {
      console.log(error);
    });
  } else {
    res.render('home', {
      title: 'Home',
    });
  }
};

/**
 * GET /rss/:id
 */
exports.getUserRss = (req, res, next) => {
  var parentId = req.params.parentId;
  var id = req.params.id;

  User.findOne({ _id: id }, (err, user) => {
    if (!user) {
      return res.status('404').end();
    }

    const token = user.tokens.find(token => token.kind === 'putio');

    console.log('parentId', parentId);

    feed = new Feed({
        title:          'PutRss',
        description:    'Rss feed of your Put.io folder',
        link:           req.protocol + '://' + req.get('host'),
    });

    getChildrenFiles(parentId, token.accessToken, feed).then(function() {
      res.set('Content-Type', 'text/xml');

      res.send(feed.render('rss-2.0'));
    });
  });

};

function getChildrenFiles(parentId, token, feed) {
  console.log('getChildrenFiles', parentId);
  return request.get({ url: 'https://api.put.io/v2/files/list', qs: { oauth_token: token, parent_id: parentId }, json: true }).then(function(data) {
    return Promise.all(data.files.map(function(file) {
      switch (file.content_type) {
      case 'video/x-matroska':
        var downloadUrl = 'https://api.put.io/v2/files/' + file.id + '/download?oauth_token=' + token
        feed.addItem({
            title:          file.name,
            link:           downloadUrl,
            image:          file.screenshot,
            date:           new Date(file.created_at)
        });
        break;
      case 'application/x-directory':

        return getChildrenFiles(file.id, token, feed);
        break;
      }
    }));
  });
}
