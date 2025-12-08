import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: false },
    amount: { type: Number, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Withdrawal", withdrawalSchema);
