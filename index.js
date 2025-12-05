import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import "dotenv/config";
import TronWeb from "tronweb";

// BANK ROUTES
import bankRoutes from "./routes/bankRoutes.js";

// MODELS
import Deposit from "./models/Deposit.js";
import Withdrawal from "./models/Withdrawal.js";

// EXPRESS APP
const app = express();

// ---------- CORS FIX (FOR RENDER + EXPRESS v5) ----------
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

// ❌ REMOVE THIS — Express v5 ERROR
// app.options("*", cors());

app.use(express.json());

// ----------------------
// ROOT ROUTE
// ----------------------
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

// ----------------------
// DATABASE CONNECT
// ----------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB Error:", err));

// ----------------------
// TRANSACTION MODEL
// ----------------------
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

// ----------------------
// ROUTES
// ----------------------

// ⭐ BANK ROUTES ENABLE
app.use("/api/banks", bankRoutes);

// TRANSACTIONS
app.get("/api/transactions", async (req, res) => {
  const txns = await Transaction.find().sort({ createdAt: -1 });
  res.json(txns);
});

// MARK AS USED
app.put("/api/transactions/:id", async (req, res) => {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// BALANCE CALCULATION
app.get("/api/balance", async (req, res) => {
  const confirmed = await Transaction.aggregate([
    { $match: { status: "confirmed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  res.json({ balance: confirmed[0]?.total || 0 });
});

// CREATE NEW TRANSACTION
app.post("/api/transactions", async (req, res) => {
  try {
    const txn = await Transaction.create(req.body);
    res.status(201).json(txn);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DEPOSITS
app.get("/api/deposits", async (req, res) => {
  const data = await Deposit.find().sort({ createdAt: -1 });
  res.json(data);
});

app.post("/api/deposits", async (req, res) => {
  try {
    const dep = await Deposit.create(req.body);
    res.status(201).json(dep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// WITHDRAWALS
app.get("/api/withdrawals", async (req, res) => {
  const data = await Withdrawal.find().sort({ createdAt: -1 });
  res.json(data);
});

app.post("/api/withdrawals", async (req, res) => {
  try {
    const wdr = await Withdrawal.create(req.body);
    res.status(201).json(wdr);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/withdrawals/:id", async (req, res) => {
  try {
    await Withdrawal.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -----------------------------------------------------------
// AUTO-DETECTION SYSTEM
// -----------------------------------------------------------
const TRC20_ADDRESS = "TS3LhcNKfhUt4VNcPEKyoyUn9rV3GctLGq";
const BEP20_ADDRESS = "0xA50CF7D276Ad604231675d670e0BdcFdAf60bd93";

const USDT_BEP20 = "0x55d398326f99059fF775485246999027B3197955";
const BSCSCAN_API = process.env.BSCSCAN_KEY;

const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });

// CRON JOB
cron.schedule("*/20 * * * * *", async () => {
  console.log("🔍 Checking blockchain for new payments...");
  // scanners...
});

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
