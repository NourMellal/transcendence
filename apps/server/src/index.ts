import fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

const fastifyApp = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

// Register Plugins
fastifyApp.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});
fastifyApp.register(swagger, {
  swagger: {
    info: {
      title: "Transcendence API",
      description: "API documentation for the Transcendence application",
      version: "1.0.0",
    },
    host: `${HOST}:${PORT}`,
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});

fastifyApp.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
});

// Health Check Route
fastifyApp.get("/health", async (request, reply) => {
  return { status: "ok" };
});

// api routes
fastifyApp.get("/api", async (request, reply) => {
  return { message: "Welcome to the Transcendence API" };
});

// Start the server
const start = async () => {
  try {
    await fastifyApp.listen({ port: PORT, host: HOST });
    fastifyApp.log.info(`Server is running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastifyApp.log.error(err);
    process.exit(1);
  }
};

start();
