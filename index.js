const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // <-- import cors
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
