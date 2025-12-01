require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // <-- import cors
const crypto = require("crypto");
const { MERCHANT_KEY, MERCHANT_SALT } = require("./config");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// PayU sends x-www-form-urlencoded data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Test Route
app.get("/test", (req, res) => {
  res.send(`
        <html>
        <body>
            <h1>Express Server Running</h1>
            <p>Server is listening on port ${PORT}.</p>
        </body>
        </html>
    `);
});

app.post("/payment/generate-hash", async (req, res) => {
  try {
    const { hashName, hashString } = req.body;

    if (!hashName || !hashString) {
      return res.status(400).json({
        success: false,
        error: "hashName and hashString are required",
      });
    }

    // PayU format: sha512(hashString + SALT)
    const finalString = hashString + MERCHANT_SALT;
    const generatedHash = sha512(finalString);

    return res.json({
      success: true,
      hash: { [hashName]: generatedHash },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

app.post("/paymentpayment-hash", (req, res) => {
  try {
    const { txnid, amount, productinfo, firstname, email } = req.body;

    if (!txnid || !amount || !productinfo || !firstname || !email) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const hashString = `${MERCHANT_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||${MERCHANT_SALT}`;

    const hash = sha512(hashString);

    res.json({
      success: true,
      payment_hash: hash,
    });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// SUCCESS URL
app.post("/payment/success", (req, res) => {
  console.log("=== PAYU SUCCESS CALLBACK ===");
  console.log(req.body);

  // You will add verification logic later

  res.send(`
        <html>
        <body>
            <h2>Payment Success</h2>
            <p>Your payment was successful.</p>
        </body>
        </html>
    `);
});

// FAILURE URL
app.post("/payment/failure", (req, res) => {
  console.log("=== PAYU FAILURE CALLBACK ===");
  console.log(req.body);

  res.send(`
        <html>
        <body>
            <h2>Payment Failed</h2>
            <p>Your payment could not be completed.</p>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
