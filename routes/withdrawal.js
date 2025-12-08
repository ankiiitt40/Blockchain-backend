import express from "express";
import Withdrawal from "../models/Withdrawal.js";

const router = express.Router();


// ===============================
// 🔵 CREATE WITHDRAWAL REQUEST
// ===============================
router.post("/", async (req, res) => {
  try {
    console.log("Withdrawal Request →", req.body);

    const { userId, amount, bankName, accountNumber, status } = req.body;

    // Validation
    if (!amount || !bankName || !accountNumber) {
      return res.json({
        success: false,
        error: "amount, bankName and accountNumber are required",
      });
    }

    const withdrawal = await Withdrawal.create({
      userId: userId || "demo",  // default until login system
      amount: Number(amount),
      bankName,
      accountNumber,
      status: status || "pending",
    });

    res.json({
      success: true,
      withdrawal,
    });

  } catch (err) {
    console.error("❌ Withdrawal Create Error →", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ===============================
// 🔵 GET ALL WITHDRAWALS
// ===============================
router.get("/", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    console.error("❌ Withdrawal Fetch Error →", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
