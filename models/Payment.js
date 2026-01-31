const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,           
    },
    paymentId: String,
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    persons: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: String,
      required: true,
      enum: ["annanagar", "kulithalai"],  
      index: true,                        
    },
    visitDate: {
      type: Date,
      required: true,
      index: true,                        
    },
    amount: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,                        
    },
    qrCode: String,
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


paymentSchema.index({ location: 1, visitDate: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);