const _ = require('lodash');
const async = require('async');
const validator = require('validator');
const request = require('request');
const cheerio = require('cheerio');

/**
 * GET /api/putio
 * Pinterest API example.
 */
exports.getFiles = (req, res, next) => {
  console.log(req.user);
  const token = req.user.tokens.find(token => token.kind === 'putio');
  request.get({ url: 'https://api.put.io/v2/files/list', qs: { oauth_token: token.accessToken }, json: true }, (err, request, body) => {
    if (err) { return next(err); }
    console.log('-----body-----', body);
    res.render('api/index', {
      title: 'Pinterest API',
      files: body.data
    });
  });
};
