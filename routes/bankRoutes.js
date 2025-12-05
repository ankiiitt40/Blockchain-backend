import express from "express";
import Bank from "../models/bank.js";

const router = express.Router();

// GET ALL BANKS
router.get("/", async (req, res) => {
  try {
    const banks = await Bank.find().sort({ createdAt: -1 });
    res.json(banks);
  } catch (err) {
    console.error("❌ BANK FETCH ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD NEW BANK (EMAILJS REMOVED)
router.post("/", async (req, res) => {
  try {
    console.log("📩 Bank Request:", req.body);

    const bank = await Bank.create(req.body);

    res.json({ success: true, bank });
  } catch (err) {
    console.error("❌ BANK SAVE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
