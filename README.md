# Tutorial: Asynchronous Communication Using Message Queue
## Overview
This tutorial will guide you through setting up a microservices architecture using Node.js, Express, RabbitMQ, and Docker. We will create four services: create-order-service, service-b, service-d, and service-e. Each service will have its own Docker container. We will also include a monolithic application to compare the setup.
## Project structure
```
my-microservices/
|-- create-order-service/
|   |-- index.js
|   |-- Dockerfile
|-- service-b/
|   |-- index.js
|   |-- Dockerfile
|-- service-d/
|   |-- index.js
|   |-- Dockerfile
|-- service-e/
|   |-- index.js
|   |-- Dockerfile
|-- monolithic-app/
|   |-- index.js
|   |-- Dockerfile
|-- docker-compose.yml
```
![image](https://github.com/user-attachments/assets/147fd40b-b0bb-491c-96c2-389c2ab3fba7)

## Prerequisites
- Node.js and npm installed
- Docker and Docker Compose installed
## Step by Step
### Step 1: Clone repo and build docker images
```cmd
git clone https://github.com/vphoa342/tutorial-rabbitmq.git
```

```cmd
docker-compose up --build -d
```
![image](https://github.com/user-attachments/assets/b0ee8345-5bfd-4462-a9f0-f92ec74a758b)
You should see this setup running when open Docker Desktop
### Step 2: View logs and result
Click on any service to see the current order is being processed. You can also open User Interface of RabbitMQ by visit `http://localhost:15672` wit user `guest` and password `guest` (which is defined in `docker-compose.yml`)
![image](https://github.com/user-attachments/assets/7e6f7e66-f16c-474e-b028-d9593471c3ac)

## Conclusion
In this tutorial, we set up a microservices architecture with Node.js, Express, RabbitMQ, and Docker. We created multiple services and a monolithic app for comparison. We also demonstrated how to use Docker Compose to manage and run these services. This setup provides a scalable and maintainable way to handle different parts of your application independently.

