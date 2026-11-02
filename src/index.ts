import "dotenv/config"; 
import express from "express"; 
import cors from "cors"; 
import mongoose from "mongoose"; 

const app = express(); 
app.use(cors({ origin: "http://localhost:3000", credentials: true })); 
app.use(express.json()); 

app.get("/api/health", (_req, res) => { 
  res.json({ status: "ok" }); 
});

app.get("/api/studios", async (_req, res) => { 
  const studios = await mongoose.connection.db!.collection("studios").find().toArray(); 
  res.json(studios); 
});

mongoose.connect(process.env.MONGODB_URI as string) 
  .then(() => { 
    console.log("MongoDB connected"); 
    app.listen(5000, () => console.log("Server running on http://localhost:5000")); 
  }) 
  .catch((err) => console.error("MongoDB error:", err)); 