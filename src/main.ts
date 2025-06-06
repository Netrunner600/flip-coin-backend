import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.enableCors({
    origin: ['http://localhost:3000', 'https://flipn.click'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'sessionId'],
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
  
  // Check if SSL certificates exist
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || ''),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || ''),
  };

  if (process.env.USE_HTTPS === 'true' && httpsOptions.key && httpsOptions.cert) {
    const httpsServer = https.createServer(httpsOptions, app.getHttpAdapter().getInstance());
    await app.init();
    httpsServer.listen(PORT);
    console.log(`🚀 Server running on https://localhost:${PORT}`);
  } else {
    await app.listen(PORT);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  }
}

bootstrap();
