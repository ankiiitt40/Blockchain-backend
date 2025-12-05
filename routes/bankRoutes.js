import express from "express";
import Bank from "../models/bank.js";
import emailjs from "@emailjs/nodejs";

const router = express.Router();

// GET ALL BANKS
router.get("/", async (req, res) => {
  const banks = await Bank.find().sort({ createdAt: -1 });
  res.json(banks);
});

// ADD NEW BANK
router.post("/", async (req, res) => {
  try {
    const bank = await Bank.create(req.body);

    // EMAILJS — send email
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        name: req.body.name,
        accountNumber: req.body.accountNumber,
        ifsc: req.body.ifsc,
        upi: req.body.upi,
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );

    res.json({ success: true, bank });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
