import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env.js';

export function configurePassport() {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.SERVER_URL}/api/auth/google/callback`,
    }, (_accessToken, _refreshToken, profile, done) => done(null, profile)));
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: `${env.SERVER_URL}/api/auth/github/callback`,
    }, (_accessToken, _refreshToken, profile, done) => done(null, profile)));
  }
}
