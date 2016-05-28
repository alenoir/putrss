const _ = require('lodash');
const async = require('async');
const Promise = require('bluebird');
const validator = require('validator');
var request = require('request-promise');
const cheerio = require('cheerio');
var Feed = require('feed');

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
        res.render('files/list', {
          title: 'My Files',
          files: files,
          parent: data.parent,
          rssUrl: req.protocol + '://' + req.get('host') + '/rss/' + data.parent.id,
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
  console.log('parentId', parentId);
  const token = req.user.tokens.find(token => token.kind === 'putio');

  feed = new Feed({
      title:          'My Feed Title',
      description:    'This is my personnal feed!',
      link:           'http://example.com/',
      image:          'http://example.com/logo.png',
      copyright:      'Copyright © 2013 John Doe. All rights reserved',

      author: {
          name:       'John Doe',
          email:      'john.doe@example.com',
          link:       'https://example.com/john-doe'
      }
  });

  getChildrenFiles(parentId, token.accessToken, feed).then(function() {
    res.set('Content-Type', 'text/xml');

    res.send(feed.render('rss-2.0'));
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
