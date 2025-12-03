import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    userId: String,
    amount: Number,
    bankName: String,
    accountNumber: String,
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Withdrawal", withdrawalSchema);
