
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CharacterService } from './character.service';
import { CharacterController } from './character.controller';
import { PointsHistory } from '../history/points-history.model';
import { SocketGateway } from '../socket/socket.gateway';
import { Character } from './entity/character.model';

@Module({
  imports: [SequelizeModule.forFeature([Character, PointsHistory])],
  controllers: [CharacterController],
  providers: [CharacterService, SocketGateway],
  exports: [CharacterService], 
})
export class CharacterModule {}
