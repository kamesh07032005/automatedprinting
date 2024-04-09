const express = require('express');
const path = require('path');
const WooCommerceAPI = require('woocommerce-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');


const app = express();

const WooCommerce = new WooCommerceAPI({
  url: 'https://staging2.vaseegrahveda.com/',
  consumerKey: 'ck_1cfb0c2ac1ce87466afd68488ad8b790239ebc2c',
  consumerSecret: 'cs_63b22c257d43ef3ee8d6d6747ab80ede38013f61',
  wpAPI: true,
  version: 'wc/v3'
});

const getOrderDetails = (orderId) => {
  return new Promise((resolve, reject) => {
    WooCommerce.get(`orders/${orderId}`, function (err, data, res) {
      if (err) {
        reject(err);
      } else {
        const order = JSON.parse(data.body);
        resolve(order);
      }
    });
  });
};

// Function to add a note to the customer's order notes
async function addCustomerOrderNote(orderId, note) {
  return new Promise((resolve, reject) => {
    WooCommerce.post(`orders/${orderId}/notes`, { note: note, customer_note: true }, function (err, data, res) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

app.use(express.static('public'));

app.get('/order-details/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const order = await getOrderDetails(orderId);
    res.send(order);
  } catch (error) {
    res.status(500).send('Error fetching order details');
  }
});

app.get('/update-order-notes/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const order = await getOrderDetails(orderId);
    if (order.status === 'processing') {
      const note = 'Your order is printed shipping label is sent to the packing department';
      await addCustomerOrderNote(orderId, note);
      res.send('Note added successfully');
    } else {
      res.status(400).send('Order is not in processing state');
    }
  } catch (error) {
    res.status(500).send('Error updating order notes');
  }
});

// Generate PDF document
app.get('/generate-pdf/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const order = await getOrderDetails(orderId);
    const doc = new PDFDocument();
    const fileName = `order_${orderId}.pdf`;
    doc.pipe(fs.createWriteStream(fileName)); // Pipe to file

    // Write content to PDF
    doc.fontSize(20).text(`Order Details for Order ID: ${orderId}`);
    // Add more details from the order object as needed

    doc.end(); // End the document

    // Send the file as download
    res.sendFile(path.join(__dirname, fileName), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error sending file');
      } else {
        // Cleanup: Delete the file after sending
        fs.unlinkSync(path.join(__dirname, fileName));
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
