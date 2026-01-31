const express = require("express");
const crypto = require("crypto");
const QRCode = require("qrcode");
const Payment = require("../models/Payment");
const sendEmail = require("../utils/sendEmail");
const generateTicketHTML = require("./ticketTemplate"); 

const router = express.Router();


router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("WEBHOOK HIT");

      
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];

      if (!secret) {
        console.error("Missing RAZORPAY_WEBHOOK_SECRET in environment");
        return res.status(500).send("Server configuration error");
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (
        !signature ||
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )
      ) {
        console.error("Invalid webhook signature");
        return res.status(400).send("Invalid signature");
      }

      
      const event = JSON.parse(req.body.toString());
      console.log("Event type:", event.event);

      
      if (event.event !== "payment.captured") {
        console.log(`Ignoring non-captured event: ${event.event}`);
        return res.status(200).json({ ignored: true });
      }

      const paymentEntity = event.payload.payment.entity;

      
      const payment = await Payment.findOne({
        orderId: paymentEntity.order_id,
        status: "pending",
      });

      if (!payment) {
        console.warn(`No pending payment found for orderId: ${paymentEntity.order_id}`);
        return res.status(200).json({ notFound: true });
      }

      
      payment.paymentId = paymentEntity.id;
      payment.status = "paid";
      payment.amount = paymentEntity.amount / 100;

      
      const baseUrl = process.env.BASE_URL;
      payment.qrCode = `${baseUrl}/ticket/${payment._id}`;

      await payment.save();
      console.log("Payment updated successfully:", payment._id);

      
      const qrBuffer = await QRCode.toBuffer(payment.qrCode, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 300,
      });

     
      const visitDateIST = new Date(payment.visitDate).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      
      const ticketId = payment._id.toString().slice(0, 8).toUpperCase();

      const html = generateTicketHTML({
        name: payment.name,
        persons: payment.persons,
        location: payment.location,
        visitDate: visitDateIST,           
        amount: payment.amount,
        ticketId,
      });

      
      await sendEmail(
        payment.email,
        "Your Frutico Ice Cream Ticket 🎫",
        html,
        [
          {
            filename: "frutico-ticket.png",
            content: qrBuffer,
            cid: "frutico-qr",
          },
        ]
      );

      console.log("Email sent successfully to:", payment.email);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("WEBHOOK PROCESSING ERROR:", err.stack || err);
      return res.status(500).send("Webhook processing error");
    }
  }
);

module.exports = router;