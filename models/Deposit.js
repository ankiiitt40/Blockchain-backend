import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    userId: String,
    amount: Number,
    network: String,   // TRC20 | BEP20
    address: String,
    status: { type: String, default: "pending" }, // pending | success | failed
  },
  { timestamps: true }
);

export default mongoose.model("Deposit", depositSchema);
