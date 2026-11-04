import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const databaseUrl = process.env.MONGODB_URI;
if (!databaseUrl) throw new Error("MONGODB_URI is not configured");

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const client = new MongoClient(databaseUrl);

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true, minPasswordLength: 6 },
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
});
