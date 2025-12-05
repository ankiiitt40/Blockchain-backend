import express from "express";
import Bank from "../models/bank.js";
import emailjs from "@emailjs/nodejs";

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

// ADD NEW BANK
router.post("/", async (req, res) => {
  try {
    console.log("📩 Bank Request Received:", req.body);

    const bank = await Bank.create(req.body);
    console.log("✅ Bank Saved:", bank);

    // EMAILJS — send email
    const emailData = {
      name: req.body.name,
      accountNumber: req.body.accountNumber,
      ifsc: req.body.ifsc,
      upi: req.body.upi,
      email: req.body.email || "No email provided",
    };

    console.log("📤 Sending Email With Data:", emailData);

    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      emailData,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );

    console.log("📧 EMAIL SENT SUCCESS");

    res.json({ success: true, bank });
  } catch (err) {
    console.error("❌ EMAIL OR BANK ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
