const _ = require('lodash');
const async = require('async');
const validator = require('validator');
const request = require('request');
const cheerio = require('cheerio');
var Feed = require('feed');

/**
 * GET /rss
 * Pinterest API example.
 */
exports.getRss = (req, res, next) => {
  res.render('rss/index', {
    userId: req.user,
  });
};


/**
 * GET /rss/:id
 * Pinterest API example.
 */
exports.getUserRss = (req, res, next) => {
  var parentId = req.params.parentId;
  console.log('parentId', parentId);
  const token = req.user.tokens.find(token => token.kind === 'putio');
  request.get({ url: 'https://api.put.io/v2/files/list', qs: { oauth_token: token.accessToken, parent_id: parentId }, json: true }, (err, request, body) => {
    if (err) { return next(err); }

    var feed = new Feed({
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

    for(var key in body.files) {
      var file = body.files[key];
      //console.log(file);
      var downloadUrl = 'https://api.put.io/v2/files/' + file.id + '/download?oauth_token=' + token.accessToken
      if (file.content_type == 'video/x-matroska') {
        feed.item({
            title:          file.name,
            link:           downloadUrl,
            image:          file.screenshot,
            date:           new Date(file.created_at)
        });
      }

    }

    res.set('Content-Type', 'text/xml');

    res.send(feed.render('rss-2.0'));
  });
};
