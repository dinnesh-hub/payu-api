const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 4000;

// PayU sends x-www-form-urlencoded data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
