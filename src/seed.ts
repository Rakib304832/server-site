import "dotenv/config";
import mongoose from "mongoose";
import studios from "./Data/studios.json" with { type: "json" };
import { auth } from "./auth.js";

const process = (globalThis as any).process;

const DEMO_USER = {
  name: "StudioSpace Examiner",
  email: "examiner@studiospace.demo",
  password: "Studio123",
  image: "https://i.pravatar.cc/150?img=12",
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not available");

  const studiosCollection = db.collection("studios");
  await studiosCollection.deleteMany({});
  await studiosCollection.insertMany(studios as any[]);

  const usersCollection = db.collection("user");
  let demoUser = await usersCollection.findOne({ email: DEMO_USER.email });

  if (!demoUser) {
    await auth.api.signUpEmail({ body: DEMO_USER });
    demoUser = await usersCollection.findOne({ email: DEMO_USER.email });
    console.log("Created demo user:", DEMO_USER.email);
  } else {
    console.log("Demo user already exists:", DEMO_USER.email);
  }

  if (!demoUser) {
    throw new Error("Could not create the demo user.");
  }

  // Give the examiner one listing so edit, delete, and booking screens can be
  // tested without creating a studio first.
  await studiosCollection.updateOne(
    { _id: "stu_001" as never },
    {
      $set: {
        ownerId: String(demoUser._id),
        ownerName: DEMO_USER.name,
        ownerEmail: DEMO_USER.email,
        ownerPhoto: DEMO_USER.image,
      },
    },
  );

  console.log("Seeded:", studios.length, "studios");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
