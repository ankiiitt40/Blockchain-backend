import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import "dotenv/config";

// MODELS
import Deposit from "./models/Deposit.js";
import Withdrawal from "./models/Withdrawal.js";

// EXPRESS
const app = express();
app.use(cors());
app.use(express.json());

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
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// ----------------------
// GET ALL TRANSACTIONS
// ----------------------
app.get("/api/transactions", async (req, res) => {
  const txns = await Transaction.find().sort({ createdAt: -1 });
  res.json(txns);
});

// ----------------------
// TOTAL BALANCE
// ----------------------
app.get("/api/balance", async (req, res) => {
  const confirmed = await Transaction.aggregate([
    { $match: { status: "confirmed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  res.json({ balance: confirmed[0]?.total || 0 });
});

// ----------------------
// MANUAL ADD TXN
// ----------------------
app.post("/api/transactions", async (req, res) => {
  try {
    const txn = await Transaction.create(req.body);
    res.status(201).json(txn);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------
// DEPOSIT ROUTES
// ----------------------
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

// ----------------------
// WITHDRAWAL ROUTES
// ----------------------
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

// ✅ ADMIN APPROVE / REJECT WITHDRAWAL
app.put("/api/withdrawals/:id", async (req, res) => {
  const { status } = req.body;

  try {
    await Withdrawal.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -----------------------------------------------------------
// 🔥 QR PAYMENT AUTO-DETECTION SYSTEM
// -----------------------------------------------------------

const TRC20_ADDRESS = "TWCtpUaW6dzmgi9B2quh3VoxVUmThNLcxR";
const BEP20_ADDRESS = "0x4d8322883f4bd1f06e246e940efb2cdd5ed708f8";

const BSCSCAN_API = process.env.BSCSCAN_KEY;

// RUN EVERY 20 SECONDS
cron.schedule("*/20 * * * * *", async () => {
  console.log("🔍 Checking blockchain for new payments...");

  // ---------------------------
  // TRC20 SCAN
  // ---------------------------
  try {
    const tron = await axios.get(
      `https://api.trongrid.io/v1/accounts/${TRC20_ADDRESS}/transactions`
    );

    tron.data.data.forEach(async (tx) => {
      const to = tx.raw_data.contract[0].parameter.value.to_address;
      const hash = tx.txID;

      if (to === TRC20_ADDRESS) {
        const amount =
          tx.raw_data.contract[0].parameter.value.amount / 1_000_000;

        await Transaction.findOneAndUpdate(
          { txHash: hash },
          {
            network: "TRC20",
            txHash: hash,
            amount,
            address: TRC20_ADDRESS,
            status: "confirmed",
          },
          { upsert: true }
        );
      }
    });
  } catch (err) {
    console.log("❌ TRC20 scan error:", err.message);
  }

  // ---------------------------
  // BEP20 SCAN (ETHERSCAN V2)
  // ---------------------------
  try {
    const bsc = await axios.get(
      `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&address=${BEP20_ADDRESS}&sort=desc&apikey=${BSCSCAN_API}`
    );

    let list = [];

    if (Array.isArray(bsc.data.result)) {
      list = bsc.data.result;
    } else if (Array.isArray(bsc.data)) {
      list = bsc.data;
    } else if (bsc.data?.data?.items) {
      list = bsc.data.data.items;
    }

    console.log("BEP20 TX found:", list.length);

    list.forEach(async (tx) => {
      if (tx.to?.toLowerCase() === BEP20_ADDRESS.toLowerCase()) {
        const amount = tx.value / 1e18;

        await Transaction.findOneAndUpdate(
          { txHash: tx.hash },
          {
            network: "BEP20",
            txHash: tx.hash,
            amount,
            address: BEP20_ADDRESS,
            status: "confirmed",
          },
          { upsert: true }
        );
      }
    });
  } catch (err) {
    console.log("❌ BEP20 scan error:", err.message);
  }
});

// ----------------------
// SERVER
// ----------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
