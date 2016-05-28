const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const InstagramStrategy = require('passport-instagram').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const OpenIDStrategy = require('passport-openid').Strategy;
const OAuthStrategy = require('passport-oauth').OAuthStrategy;
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  User.findOne({ email: email.toLowerCase() }, (err, user) => {
    if (!user) {
      return done(null, false, { msg: `Email ${email} not found.` });
    }
    user.comparePassword(password, (err, isMatch) => {
      if (isMatch) {
        return done(null, user);
      }
      return done(null, false, { msg: 'Invalid email or password.' });
    });
  });
}));

/**
 * Sign in with Facebook.
 */

passport.use('putio', new OAuth2Strategy({
  authorizationURL: 'https://api.put.io/v2/oauth2/authenticate',
  tokenURL: 'https://api.put.io/v2/oauth2/access_token',
  clientID: process.env.PUTIO_CLIENT_ID,
  clientSecret: process.env.PUTIO_CLIENT_SECRET,
  callbackURL: process.env.PUTIO_REDIRECT_URL,
}, (accessToken, refreshToken, profile, done) => {

  request.get({ url: 'https://api.put.io/v2/account/info', qs: { oauth_token: accessToken }, json: true }, (err, request, body) => {
    console.log(body);
    var account = body.info;
    User.findOne({ putio: account.user_id }, (err, existingUser) => {
      if (existingUser) {
        return done(null, existingUser);
      }
      User.findOne({ email: account.mail }, (err, existingEmailUser) => {
        console.log(existingEmailUser);
        if (existingEmailUser) {
          //req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.' });
          return done(null, existingEmailUser);
        } else {
          const user = new User();
          user.email = account.mail;
          user.putio = account.user_id;
          user.tokens.push({ kind: 'putio', accessToken });
          user.profile.name = account.username;
          user.profile.picture = account.avatar_url;
          user.save((err) => {
            done(err, user);
          });
        }
      });
    });


  });
}));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
  const provider = req.path.split('/').slice(-1)[0];

  if (_.find(req.user.tokens, { kind: provider })) {
    next();
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
