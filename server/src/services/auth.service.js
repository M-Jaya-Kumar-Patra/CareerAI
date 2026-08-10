import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";

const ACCESS_COOKIE = "careerai_access";
const REFRESH_COOKIE = "careerai_refresh";
const accessMaxAge = 15 * 60 * 1000;
const refreshMaxAge = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge,
    path: "/",
  };
}

export function setAuthCookies(res, userId) {
  const accessToken = jwt.sign(
    { sub: userId.toString(), type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge));
  return RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshMaxAge),
  });
}

export async function rotateRefreshToken(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return null;
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored || stored.expiresAt <= new Date()) return null;
  const user = await User.findById(stored.userId);
  if (!user) return null;
  await stored.deleteOne();
  await setAuthCookies(res, user._id);
  return user;
}

export async function revokeRefreshToken(req) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}

export async function findOrCreateOAuthUser(profile, provider) {
  const providerId = provider === "google" ? profile.id : profile.id;
  const providerField = provider === "google" ? "googleId" : "githubId";
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email) throw new Error("OAuth provider did not return an email address");
  let user = await User.findOne({
    $or: [{ [providerField]: providerId }, { email }],
  });
  if (!user) user = new User({ email });
  user[providerField] = providerId;
  user.name = user.name || profile.displayName || profile.username;
  user.avatar = user.avatar || profile.photos?.[0]?.value;
  user.authProviders = [...new Set([...user.authProviders, provider])];
  return user.save();
}

export { ACCESS_COOKIE };
