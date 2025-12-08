import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import "dotenv/config";
import TronWeb from "tronweb";

// ROUTES
import bankRoutes from "./routes/bankRoutes.js";
import withdrawalRoutes from "./routes/withdrawal.js";   // ✅ NEW CORRECT ROUTE

// MODELS
import Deposit from "./models/Deposit.js";

// EXPRESS APP
const app = express();

// CORS FIX
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ROOT ROUTE
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

// DB CONNECT
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB Error:", err));

// -----------------------------------------------------
// TRANSACTION MODEL
// -----------------------------------------------------
const transactionSchema = new mongoose.Schema(
  {
    network: { type: String, enum: ["TRC20", "BEP20"], required: true },
    txHash: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "confirmed",
    },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------

// BANK ROUTES
app.use("/api/banks", bankRoutes);

// WITHDRAWAL ROUTES (CORRECT)
app.use("/api/withdrawals", withdrawalRoutes);  // ✅ FINAL FIX

// GET TRANSACTIONS
app.get("/api/transactions", async (req, res) => {
  try {
    const txns = await Transaction.find().sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK TRANSACTION AS USED
app.put("/api/transactions/:id", async (req, res) => {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET TOTAL BALANCE
app.get("/api/balance", async (req, res) => {
  try {
    const confirmed = await Transaction.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({ balance: confirmed[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE TRANSACTION
app.post("/api/transactions", async (req, res) => {
  try {
    const txn = await Transaction.create(req.body);
    res.status(201).json(txn);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -----------------------------------------------------
// DEPOSITS
// -----------------------------------------------------
app.get("/api/deposits", async (req, res) => {
  try {
    const data = await Deposit.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deposits", async (req, res) => {
  try {
    const dep = await Deposit.create(req.body);
    res.status(201).json(dep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -----------------------------------------------------------
// BLOCKCHAIN AUTO-DETECTION 
// -----------------------------------------------------------
const TRC20_ADDRESS = "TS3LhcNKfhUt4VNcPEKyoyUn9rV3GctLGq";
const BEP20_ADDRESS = "0xA50CF7D276Ad604231675d670e0BdcFdAf60bd93";
const USDT_BEP20 = "0x55d398326f99059fF775485246999027B3197955";

const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });

// AUTO CHECK EVERY 20 SECONDS
cron.schedule("*/20 * * * * *", async () => {
  console.log("🔍 Checking blockchain for new payments...");
});

// -----------------------------------------------------------
// START SERVER
// -----------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
