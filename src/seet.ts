import "dotenv/config";
import mongoose from "mongoose";
import studios from "./Data/studios.json";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not available");
  const col = db.collection("studios");
  await col.deleteMany({});          // পুরনো ডেটা মুছতে (ঐচ্ছিক)
  await col.insertMany(studios as any[]);

  console.log("Seeded:", studios.length);
  await mongoose.disconnect();       // এখানে, সব কাজের শেষে
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);                   // এরর হলে বের হয়ে যাবে
});