const express = require("express");
const app = express();
const port = 3005;

let orderNumber = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createOrder() {
  const order = { orderId: orderNumber++ };
  console.log("Created order:", order.orderId);
  return order;
}

async function processOrder(order) {
  console.log("Processing order:", order.orderId);
  await sleep(3000); // Simulate CPU-bound task
  console.log("Processed order:", order.orderId);
  return true;
}

async function backupData(order) {
  console.log("Backing up order:", order.orderId);
  await sleep(2000); // Simulate data backup task
  console.log("Backed up order:", order.orderId);
  return true;
}

async function sendNotification(order) {
  console.log("Sending notification for order:", order.orderId);
  // Simulate sending notification
  await sleep(1000);
  console.log("Notification sent for order:", order.orderId);
  console.log(new Date().toISOString() + " - Notification sent");
}

async function handleRequest(order) {
  try {
    console.log(new Date().toISOString() + " - Received request");
    console.log("Received order:", order);

    const processStatus = await processOrder(order);

    if (processStatus) {
      const backupStatus = await backupData(order);
      if (backupStatus) {
        await sendNotification(order);
      }
    }
  } catch (error) {
    console.log("error", error);
  }
}
async function generateOrder() {
  const order = await createOrder();
  await handleRequest(order);
}

async function init() {
  setInterval(generateOrder, 1000);
}

// app.use(express.json());
// app.post("/process-order", handleRequest);

app.listen(port, () => {
  console.log(`Monolithic application listening at http://localhost:${port}`);
  init();
});
