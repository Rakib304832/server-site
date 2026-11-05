import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const databaseUrl = process.env.MONGODB_URI;
const secret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error("MONGODB_URI is not configured");
}

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is not configured");
}

const client = new MongoClient(databaseUrl);

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: (process.env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
