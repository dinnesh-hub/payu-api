require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios"); // npm install axios
const { MERCHANT_KEY, MERCHANT_SALT } = require("./config");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate SHA-512 hash
 */
function generateHash(data) {
  return crypto.createHash("sha512").update(data).digest("hex");
}

/**
 * Verify PayU response hash
 */
function verifyPaymentHash(payuResponse) {
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    hash: receivedHash,
  } = payuResponse;

  // Reverse hash calculation for response
  const hashString = `${MERCHANT_SALT}|${status}|||||||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${MERCHANT_KEY}`;

  const calculatedHash = generateHash(hashString);

  return calculatedHash === receivedHash;
}

// ============================================
// ENDPOINTS
// ============================================

// Test Route
app.get("/test", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Express Server Running</h1>
        <p>Server is listening on port ${PORT}.</p>
        <p>Merchant Key: ${MERCHANT_KEY ? "✓ Configured" : "✗ Missing"}</p>
        <p>Merchant Salt: ${MERCHANT_SALT ? "✓ Configured" : "✗ Missing"}</p>
      </body>
    </html>
  `);
});

// ============================================
// 1. HASH GENERATION ENDPOINT (Critical)
// ============================================
app.post("/api/generate-hash", (req, res) => {
  try {
    const { hashString, hashName, postSalt } = req.body;

    if (!hashString || !hashName) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: hashString, hashName",
      });
    }

    console.log("=== HASH GENERATION REQUEST ===");
    console.log("Hash Name:", hashName);
    console.log("Hash String:", hashString);
    console.log("Post Salt:", postSalt || "none");

    // Construct the final string based on whether postSalt exists
    const finalString = postSalt
      ? `${hashString}${MERCHANT_SALT}${postSalt}`
      : `${hashString}${MERCHANT_SALT}`;

    const hash = generateHash(finalString);

    console.log("Generated Hash:", hash);

    res.json({
      success: true,
      hash,
      hashName,
    });
  } catch (error) {
    console.error("Hash generation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============================================
// 2. PAYMENT SUCCESS CALLBACK
// ============================================
app.post("/payment/success", async (req, res) => {
  console.log("=== PAYU SUCCESS CALLBACK ===");
  console.log("Body:", req.body);

  const payuResponse = req.body;

  try {
    // Verify hash authenticity
    const isValidHash = verifyPaymentHash(payuResponse);

    if (!isValidHash) {
      console.error("⚠️ Hash verification failed!");
      return res.status(400).send(`
        <html>
          <body>
            <h2>Payment Verification Failed</h2>
            <p>Invalid payment signature. Please contact support.</p>
          </body>
        </html>
      `);
    }

    console.log("✓ Hash verified successfully");

    // Additional verification: Check payment status with PayU API
    const verificationResult = await verifyPaymentWithPayU(
      payuResponse.txnid
    );

    if (!verificationResult.success) {
      console.error("⚠️ Payment verification with PayU failed");
    }

    // TODO: Update your database with payment details
    // await updateOrderStatus(payuResponse.txnid, 'success', payuResponse);

    // Return success page
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              font-size: 64px;
              color: #4CAF50;
              margin-bottom: 20px;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
            }
            .details {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: left;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #ddd;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #666;
            }
            .value {
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed successfully.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Transaction ID:</span>
                <span class="value">${payuResponse.txnid}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">₹${payuResponse.amount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value">${payuResponse.status}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment ID:</span>
                <span class="value">${payuResponse.mihpayid || "N/A"}</span>
              </div>
            </div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              You can close this window now.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error processing success callback:", error);
    res.status(500).send(`
      <html>
        <body>
          <h2>Error Processing Payment</h2>
          <p>There was an error processing your payment. Please contact support.</p>
        </body>
      </html>
    `);
  }
});

// ============================================
// 3. PAYMENT FAILURE CALLBACK
// ============================================
app.post("/payment/failure", (req, res) => {
  console.log("=== PAYU FAILURE CALLBACK ===");
  console.log("Body:", req.body);

  const payuResponse = req.body;

  // Verify hash even for failures
  const isValidHash = verifyPaymentHash(payuResponse);

  if (!isValidHash) {
    console.error("⚠️ Hash verification failed for failure callback!");
  }

  // TODO: Update your database with failure details
  // await updateOrderStatus(payuResponse.txnid, 'failed', payuResponse);

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
          }
          .failure-icon {
            font-size: 64px;
            color: #f44336;
            margin-bottom: 20px;
          }
          h2 {
            color: #333;
            margin-bottom: 10px;
          }
          .details {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #666;
          }
          .value {
            color: #333;
          }
          .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
            border-left: 4px solid #f44336;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="failure-icon">✗</div>
          <h2>Payment Failed</h2>
          <p>Unfortunately, your payment could not be processed.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Transaction ID:</span>
              <span class="value">${payuResponse.txnid}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value">₹${payuResponse.amount}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value">${payuResponse.status}</span>
            </div>
          </div>
          
          ${
            payuResponse.error_Message
              ? `
          <div class="error-message">
            <strong>Reason:</strong> ${payuResponse.error_Message}
          </div>
          `
              : ""
          }
          
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            You can retry the payment or contact support for assistance.
          </p>
        </div>
      </body>
    </html>
  `);
});

// ============================================
// 4. WEBHOOK ENDPOINT (Server-to-Server)
// ============================================
app.post("/webhook/payment", (req, res) => {
  console.log("=== PAYU WEBHOOK RECEIVED ===");
  console.log("Body:", req.body);

  const payuResponse = req.body;

  try {
    // Verify hash
    const isValidHash = verifyPaymentHash(payuResponse);

    if (!isValidHash) {
      console.error("⚠️ Webhook hash verification failed!");
      return res.status(400).send("Invalid hash");
    }

    console.log("✓ Webhook hash verified");

    // TODO: Process webhook data
    // This is critical for handling cases where user closes browser
    // before reaching success/failure URL
    // await processWebhookPayment(payuResponse);

    // Acknowledge receipt
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Error");
  }
});

// ============================================
// 5. PAYMENT VERIFICATION ENDPOINT
// ============================================
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { txnid } = req.body;

    if (!txnid) {
      return res.status(400).json({
        success: false,
        error: "Transaction ID is required",
      });
    }

    const result = await verifyPaymentWithPayU(txnid);
    res.json(result);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      error: "Verification failed",
    });
  }
});

// ============================================
// HELPER: Verify Payment with PayU API
// ============================================
async function verifyPaymentWithPayU(txnid) {
  try {
    // Construct verification hash
    const command = "verify_payment";
    const hashString = `${MERCHANT_KEY}|${command}|${txnid}|${MERCHANT_SALT}`;
    const hash = generateHash(hashString);

    const verifyUrl =
      process.env.PAYU_ENV === "production"
        ? "https://info.payu.in/merchant/postservice.php?form=2"
        : "https://test.payu.in/merchant/postservice.php?form=2";

    const response = await axios.post(
      verifyUrl,
      {
        key: MERCHANT_KEY,
        command,
        var1: txnid,
        hash,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("=== PAYU VERIFICATION RESPONSE ===");
    console.log(response.data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("PayU verification error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   PayU Payment Gateway Server         ║
║                                       ║
║   Status: Running                     ║
║   Port: ${PORT}                       ║
║   Environment: ${process.env.PAYU_ENV || "test"}              ║
║                                       ║
║   Endpoints:                          ║
║   POST /api/generate-hash             ║
║   POST /payment/success               ║
║   POST /payment/failure               ║
║   POST /webhook/payment               ║
║   POST /api/verify-payment            ║
╚═══════════════════════════════════════╝
  `);
});