import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifsc: String,
  upi: String
}, { timestamps: true });

export default mongoose.model("Bank", bankSchema);
