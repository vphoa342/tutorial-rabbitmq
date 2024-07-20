const express = require("express");
const amqp = require("amqplib");
const app = express();
const port = 3001;

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
      await this.channel.consume(queue, onMessage, { noAck: false });
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

async function processOrder(msg) {
  const order = JSON.parse(msg.content.toString());
  console.log(" [x] Received %s", order);

  // Simulate CPU-bound task
  await sleep(3000);
  console.log(" [x] Processed order %s", order.orderId);

  // Forward to backup service
  const backupQueue = "backup_queue";
  const backupMessage = JSON.stringify(order);
  await rabbitMQ.publishMessage("", backupQueue, backupMessage);
}

async function init() {
  await rabbitMQ.connect("rabbitmq", 5672, "guest", "guest");
  rabbitMQ.addQueue("order_queue");
  rabbitMQ.addQueue("backup_queue");
  await rabbitMQ.assertQueues();
  rabbitMQ.bindQueue("order_queue", "", ""); // Assuming direct queue to queue binding

  await rabbitMQ.subscribe("order_queue", async (msg) => {
    await processOrder(msg);
    rabbitMQ.channel.ack(msg); // Acknowledge message manually
  });

  console.log("Main order processing service initialized");
}

app.listen(port, () => {
  console.log(
    `Main order processing service listening at http://localhost:${port}`
  );
  init();
});
