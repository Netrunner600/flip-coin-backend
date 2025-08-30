import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import * as fs from 'fs';
import * as https from 'https';
import helmet from "helmet";
import * as compression from "compression";
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(compression());

  // CORS configuration for WebSocket and HTTP
  app.enableCors({
    origin: function(origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://flipn.click',
        'https://fflipfront.vercel.app',
        'https://d51e-103-149-154-170.ngrok-free.app',
        /\.ngrok-free\.app$/,
        '*'
      ];
      
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return allowedOrigin === origin;
      })) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

  // app.use(cookieParser());
  // app.use(
  //   csurf({
  //     cookie: {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === 'production',
  //       sameSite: 'strict',
  //     },
  //   }),
  // );

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
