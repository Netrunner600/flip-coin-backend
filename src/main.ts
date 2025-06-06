import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
  dotenv.config();
  
  // Debug logging
  console.log('Environment variables:', {
    USE_HTTPS: process.env.USE_HTTPS,
    SERVER_PORT: process.env.SERVER_PORT
  });

  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Update CORS configuration to allow all origins
  app.enableCors({
    origin: true, // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,sessionId',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
  });

  const PORT = process.env.SERVER_PORT || 8000;
  
  // Only setup HTTPS if explicitly enabled
  if (process.env.USE_HTTPS === 'true') {
    try {
      // Check if SSL certificates are provided
      if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
        throw new Error('SSL certificates are required for HTTPS. Please provide SSL_KEY_PATH and SSL_CERT_PATH in .env file');
      }

      const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      };

      const httpsServer = https.createServer(httpsOptions, app.getHttpAdapter().getInstance());
      await app.init();
      httpsServer.listen(PORT);
      console.log(`🚀 Server running on https://localhost:${PORT}`);
    } catch (error) {
      console.error('Error setting up HTTPS server:', error.message);
      console.log('Falling back to HTTP server...');
      await app.listen(PORT);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    }
  } else {
    // Run in HTTP mode
    await app.listen(PORT);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  }
}

bootstrap();
