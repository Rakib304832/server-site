
import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
const dataPath = path.join(__dirname, "data", "studios.json");

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const raw = fs.readFileSync(dataPath, "utf-8");
  const studios = JSON.parse(raw);

  // Use the raw collection so we can insert plain objects without a schema.
  // The _id values in the file are strings, which the raw driver stores as-is.
  const collection = mongoose.connection.db!.collection("studios");

  // Clear old data first so running the script twice does not create duplicates.
  await collection.deleteMany({});

  // Insert all studios in one call, which is faster than inserting them one by one.
  const result = await collection.insertMany(studios);
  console.log(`Inserted ${result.insertedCount} studios`);

  // Close the connection, otherwise the Node process keeps running and never exits.
  await mongoose.disconnect();
}

// Run the seed and report any error, then set a non-zero exit code on failure
// so the failure is visible in the terminal.
seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});