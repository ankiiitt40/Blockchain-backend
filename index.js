import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import "dotenv/config";
import TronWeb from "tronweb";

// MODELS
import Deposit from "./models/Deposit.js";
import Withdrawal from "./models/Withdrawal.js";

// EXPRESS APP
const app = express();
app.use(cors());
app.use(express.json());

// ROOT ROUTE
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

    // ⭐ NEW FIELD — Prevent old confirmations after refresh
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// ----------------------
// ROUTES
// ----------------------
app.get("/api/transactions", async (req, res) => {
  const txns = await Transaction.find().sort({ createdAt: -1 });
  res.json(txns);
});

// ⭐ UPDATE TRANSACTION (mark used = true)
app.put("/api/transactions/:id", async (req, res) => {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/balance", async (req, res) => {
  const confirmed = await Transaction.aggregate([
    { $match: { status: "confirmed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  res.json({ balance: confirmed[0]?.total || 0 });
});

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

// ------------------------
// CRON JOB EVERY 20 SECONDS
// ------------------------
cron.schedule("*/20 * * * * *", async () => {
  console.log("🔍 Checking blockchain for new payments...");

  // ------------------------------------------------------
  // ⭐ TRC20 SCANNER
  // ------------------------------------------------------
  try {
    const tron = await axios.get(
      `https://api.trongrid.io/v1/accounts/${TRC20_ADDRESS}/transactions?limit=50`
    );

    const list = tron.data?.data || [];
    console.log("🔥 TRC20 TX Count:", list.length);

    for (let tx of list) {
      if (!tx.raw_data?.contract[0]) continue;

      const contract = tx.raw_data.contract[0];
      if (contract.type !== "TransferContract") continue;

      const raw = contract.parameter.value;

      const toBase58 = tronWeb.address.fromHex(raw.to_address);
      if (toBase58 !== TRC20_ADDRESS) continue;

      const amount = raw.amount / 1_000_000;

      await Transaction.findOneAndUpdate(
        { txHash: tx.txID },
        {
          network: "TRC20",
          txHash: tx.txID,
          amount,
          address: TRC20_ADDRESS,
          status: "confirmed",
          used: false, // ⭐ Always new detection
        },
        { upsert: true }
      );

      console.log("💰 TRC20 Payment Detected:", amount);
    }
  } catch (err) {
    console.log("❌ TRC20 Error:", err.message);
  }

  // ------------------------------------------------------
  // ⭐ BEP20 SCANNER
  // ------------------------------------------------------
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${BEP20_ADDRESS}&contractaddress=${USDT_BEP20}&sort=desc&apikey=${BSCSCAN_API}`;

    const bsc = await axios.get(url);
    const list = Array.isArray(bsc.data.result) ? bsc.data.result : [];

    console.log("🔥 BSC USDT TX Count:", list.length);

    for (const tx of list) {
      if (tx.to?.toLowerCase() !== BEP20_ADDRESS.toLowerCase()) continue;

      const amount = Number(tx.value) / 1e18;

      await Transaction.findOneAndUpdate(
        { txHash: tx.hash },
        {
          network: "BEP20",
          txHash: tx.hash,
          amount,
          address: BEP20_ADDRESS,
          status: "confirmed",
          used: false, // ⭐ Always detected as new until frontend marks used
        },
        { upsert: true }
      );

      console.log("💰 BEP20 USDT Payment Detected:", amount);
    }
  } catch (err) {
    console.log("❌ BscScan Error:", err.message);
  }
});

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
