import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Name is required"] 
  },

  accountNumber: { 
    type: String, 
    required: [true, "Account Number is required"],
    minlength: [8, "Account number must be at least 8 digits"]
  },

  ifsc: { 
    type: String, 
    required: [true, "IFSC code is required"],
    minlength: [11, "IFSC must be 11 characters"],
    maxlength: [11, "IFSC must be 11 characters"]
  },

  upi: { 
    type: String, 
    required: [true, "UPI ID is required"],
    validate: {
      validator: (value) => value.includes("@"),
      message: "Invalid UPI ID"
    }
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: (value) => value.includes("@"),
      message: "Invalid Email Address"
    }
  },

}, { timestamps: true });

export default mongoose.model("Bank", bankSchema);
