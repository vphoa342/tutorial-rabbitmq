const express = require("express");
const app = express();
const port = 3003;

const amqp = require("amqplib");

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

async function backupData(msg) {
  const order = JSON.parse(msg.content.toString());
  console.log(" [x] Received %s for backup", order);

  // Simulate data backup task
  await sleep(2000);
  console.log(" [x] Backed up order %s", order.orderId);

  // Forward to notify service
  const notifyQueue = "notify_queue";
  const notifyMessage = JSON.stringify(order);
  await rabbitMQ.publishMessage("", notifyQueue, notifyMessage);
}

async function init() {
  await rabbitMQ.connect("rabbitmq", 5672, "guest", "guest");
  rabbitMQ.addQueue("backup_queue");
  rabbitMQ.addQueue("notify_queue");
  await rabbitMQ.assertQueues();
  rabbitMQ.bindQueue("backup_queue", "", ""); // Assuming direct queue to queue binding

  await rabbitMQ.subscribe("backup_queue", async (msg) => {
    await backupData(msg);
    rabbitMQ.channel.ack(msg); // Acknowledge message manually
  });

  console.log("Backup data service initialized");
}

app.listen(port, () => {
  console.log(`Backup data service listening at http://localhost:${port}`);
  init();
});
