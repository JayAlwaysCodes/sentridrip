import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db/database.js";
import strategiesRouter from "./routes/strategies.js";
import walletRouter from "./routes/wallet.js";
import priceRouter from "./routes/price.js";
import { startScheduler } from "./services/scheduler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/strategies", strategiesRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/price", priceRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "SentriDrip", version: "1.0.0" });
});

initDb();
startScheduler();

app.listen(PORT, () => {
  console.log(`SentriDrip backend running on port ${PORT}`);
});
