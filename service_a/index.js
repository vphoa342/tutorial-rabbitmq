const express = require("express");
const amqp = require("amqplib");
const axios = require("axios");
const app = express();
const port = 3000;

let orderNumber = 0;

class RabbitMQClient {
  constructor() {
    this.exchanges = new Map();
    this.queues = new Map();
  }

  async connect(host, port, user, password) {
    try {
      const url = `amqp://${user}:${password}@${host}:${port}`;
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Connection error:", error);
    }
  }

  addExchange(name, type, options) {
    this.exchanges.set(name, { type, options });
    console.log(`Exchange added: ${name} (${type})`);
  }

  async assertExchanges() {
    for (const [name, exchange] of this.exchanges.entries()) {
      try {
        await this.channel.assertExchange(
          name,
          exchange.type,
          exchange.options
        );
        console.log(`Exchange asserted: ${name}`);
      } catch (error) {
        console.error(`Error asserting exchange ${name}:`, error);
      }
    }
  }

  addQueue(name) {
    if (!this.queues.has(name)) {
      this.queues.set(name, {});
      console.log(`Queue added: ${name}`);
    }
  }

  async assertQueues() {
    for (const [name] of this.queues.entries()) {
      try {
        await this.channel.assertQueue(name);
        console.log(`Queue asserted: ${name}`);
      } catch (error) {
        console.error(`Error asserting queue ${name}:`, error);
      }
    }
  }

  bindQueue(queueName, exchangeName, routingKey) {
    const queueBindings = this.queues.get(queueName);
    if (queueBindings) {
      queueBindings[exchangeName] = routingKey;
      console.log(
        `Queue ${queueName} bound to exchange ${exchangeName} with routing key ${routingKey}`
      );
    } else {
      console.error(`Queue ${queueName} does not exist. Cannot bind.`);
    }
  }

  async bindQueues() {
    for (const [queueName, bindings] of this.queues.entries()) {
      for (const [exchangeName, routingKey] of Object.entries(bindings)) {
        try {
          await this.channel.bindQueue(queueName, exchangeName, routingKey);
          console.log(
            `Queue ${queueName} bound to exchange ${exchangeName} with routing key ${routingKey}`
          );
        } catch (error) {
          console.error(
            `Error binding queue ${queueName} to exchange ${exchangeName}:`,
            error
          );
        }
      }
    }
  }

  async publishMessage(exchange, routingKey, message) {
    try {
      this.channel.publish(exchange, routingKey, Buffer.from(message));
      console.log(
        `Sent message: ${message} to exchange: ${exchange} with routing key: ${routingKey}`
      );
    } catch (error) {
      console.error("Send message error:", error);
    }
  }

  async subscribe(queue, onMessage) {
    try {
      await this.channel.consume(queue, onMessage, { noAck: true });
      console.log(`Subscribed to queue: ${queue}`);
    } catch (error) {
      console.error(`Error subscribing to queue ${queue}:`, error);
    }
  }

  async close() {
    try {
      await this.channel.close();
      await this.connection.close();
      console.log("Connection closed");
    } catch (error) {
      console.error("Closing error:", error);
    }
  }
}

const rabbitMQ = new RabbitMQClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createOrder() {
  const order = { orderId: orderNumber++ };
  console.log("Created order:", order.orderId);
  return order;
}

async function sendToMonolithic(order) {
  try {
    const response = await axios.post(
      "http://localhost:3005/process-order",
      order
    );
    console.log("Response from monolithic app:", response.data);
  } catch (error) {
    console.log("Error sending to monolithic app:", error);
  }
}

async function sendToServiceB(order) {
  try {
    const message = JSON.stringify(order);
    await rabbitMQ.publishMessage("orders", "order_key", message);
  } catch (error) {
    console.error("Error sending to Service B:", error);
  }
}

async function generateOrder() {
  const order = await createOrder();
  await sendToMonolithic(order);
  // await sendToServiceB(order);
}

async function init() {
  console.log("Order generation service initialized");

  setInterval(generateOrder, 1000); // Create a new order every 10 seconds
}

app.listen(port, () => {
  console.log(`Order generation service listening at http://localhost:${port}`);
  init();
});
