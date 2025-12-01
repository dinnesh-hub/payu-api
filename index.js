const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // <-- import cors
const crypto = require("crypto");
const { PAYU_KEY, PAYU_SALT } = require("./config");

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins (you can restrict later if needed)
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

function sha512(data) {
  return crypto.createHash("sha512").update(data).digest("hex");
}

function generatePaymentHash({ txnid, amount, productinfo, firstname, email }) {
  const hashString =
    `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}` +
    `|||||||||||${PAYU_SALT}`;

  return sha512(hashString);
}

function generateSdkHashes() {
  return {
    vas_for_mobile_sdk_hash: sha512(
      `${PAYU_KEY}|vas_for_mobile_sdk|${PAYU_SALT}`
    ),

    payment_related_details_for_mobile_sdk_hash: sha512(
      `${PAYU_KEY}|payment_related_details_for_mobile_sdk|${PAYU_SALT}`
    ),

    get_merchant_ibibo_codes_hash: sha512(
      `${PAYU_KEY}|get_merchant_ibibo_codes|${PAYU_SALT}`
    ),
  };
}

// Hash Logic
app.post("/hash", (req, res) => {
  const { txnid, amount, productinfo, firstname, email } = req.body;

  const payment_hash = generatePaymentHash({
    txnid,
    amount,
    productinfo,
    firstname,
    email,
  });

  const sdkHashes = generateSdkHashes();

  res.json({
    payment_hash,
    ...sdkHashes,
  });
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
