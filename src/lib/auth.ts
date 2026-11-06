import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { trustedOrigins } from "./trustedOrigins.js";

const databaseUrl = process.env.MONGODB_URI;
const secret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error("MONGODB_URI is not configured");
}

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is not configured");
}

const client = new MongoClient(databaseUrl);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === "production";
const productionBaseURL = "https://server-site-ruby.vercel.app";
const vercelURL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const baseURL =
  process.env.VERCEL_ENV === "preview" && vercelURL
    ? vercelURL
    : process.env.BETTER_AUTH_URL ?? productionBaseURL;

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  secret,

  // Server-এর public address। Google callback ও অন্যান্য link এখান থেকে তৈরি হবে।
  baseURL,

  // কোন client domain এই auth server-কে ডাকতে পারবে
  trustedOrigins: [...new Set([baseURL, ...trustedOrigins])],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  // Google env variable থাকলেই Google login চালু হবে
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),

  advanced: {
    // Production-এ secure cookie ব্যবহার হবে
    useSecureCookies: isProduction,

    // Client ও server আলাদা domain-এ থাকায় production-এ cross-site cookie লাগবে
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  },
});