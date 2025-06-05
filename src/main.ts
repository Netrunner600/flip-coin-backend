import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import * as http from "http";
import { Server } from "socket.io";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));


  app.enableCors({
    origin: "*", 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", 
    allowedHeaders: "*", 
    credentials: true, 
  });

  const server = http.createServer(app.getHttpAdapter().getInstance());

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["*"],
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    // Your socket events here
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
  });

  const PORT = process.env.SERVER_PORT || 8000;

  server.listen(PORT, () => {
    console.log(`🚀 HTTP + Socket.IO server running on http://localhost:${PORT}`);
  });
}

bootstrap();
