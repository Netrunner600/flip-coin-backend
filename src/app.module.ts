import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CharacterModule } from './character/character.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
// import { RedisModule } from './redis/redis.module';
import { SocketGateway } from './socket/socket.gateway';
import { Character } from './character/entity/character.model';
import { PointsHistory } from './history/points-history.model';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { redisStore } from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
      serveRoot: '/public', 
    }),
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 0, // Set TTL based on session requirement
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get<string>('database.host'),
        port: parseInt(configService.get<string>('database.port') || '3306', 10),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        models: [Character,PointsHistory],
        autoLoadModels: true,
        synchronize: true,

      }),
      inject: [ConfigService],
    }),
    CharacterModule,
    LeaderboardModule,
    // RedisModule
  ],
  controllers: [AppController],
  providers: [AppService,SocketGateway],



})
export class AppModule { }
