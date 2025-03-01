import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Character } from 'src/character/entity/character.model';

@Injectable()
export class LeaderboardService {
  constructor(@InjectModel(Character) private characterModel: typeof Character) {}

  async getLeaderboard(type: string) {
    if (type === '24h') {
      return this.characterModel.findAll({ order: [['points24h', 'DESC']], limit: 10 });
    } else if (type === 'allTime') {
      return this.characterModel.findAll({ order: [['points', 'DESC']], limit: 10 });
    } else if (type === 'country') {
      return this.characterModel.findAll({
        attributes: ['country', [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints']],
        group: ['country'],
        order: [[Sequelize.literal('totalPoints'), 'DESC']],
      });
    }
    return [];
  }
}
