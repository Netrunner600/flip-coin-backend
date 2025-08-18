import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PointsHistory } from '../history/points-history.model';
import { Character } from './entity/character.model';
import { SocketGateway } from 'src/socket/socket.gateway';
import { Sequelize } from 'sequelize';


@Injectable()
export class CharacterService {
  constructor(
    @InjectModel(Character) private characterModel: typeof Character,
    @InjectModel(PointsHistory) private pointsHistoryModel: typeof PointsHistory,
    private socketGateway: SocketGateway
  ) { }

  async getAllCharacters(userId: string) {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const charactersWithUserPoints = await this.characterModel.findAll({
      attributes: [
        "id",
        "name",
        "avatarUrl",
        "hateAvatarUrl",
        "loveAvatarUrl",
        "mobileAvatarUrl",
        "mobileHateAvatarUrl", // Including this
        "mobileLoveAvatarUrl", // Including this
        "headAvatarUrl",
        [Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("history.pointsChange")), 0), "totalPoints"],
        [Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("history.totalPlus")), 0), "totalPlus"],
        [Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("history.totalMinus")), 0), "totalMinus"],
        [Sequelize.fn("MIN", Sequelize.col("Character.created_at")), "created_at"] // Avoid group-by issue
      ],
      include: [
        {
          model: this.pointsHistoryModel,
          as: "history",
          attributes: ['sessionId'],
          required: false,
          where: { created_at: { [Op.gte]: last24Hours }, sessionId: userId },
        },
      ],
      group: [
        "Character.id",
        "Character.name",
        "Character.avatarUrl",
        "Character.hateAvatarUrl",
        "Character.loveAvatarUrl",
        "Character.mobileAvatarUrl",
        "Character.mobileHateAvatarUrl",
        "Character.mobileLoveAvatarUrl",
        "Character.headAvatarUrl"
      ],
      raw: true,
    });
console.log("updating points");
    //console.log(charactersWithUserPoints)
    return charactersWithUserPoints;
  }

  async updateCharacterPoints(id: string, increment: boolean, country: string, countryCode: string, sessionId: string) {
    const character = await this.characterModel.findByPk(id);
    if (!character) throw new Error("Character not found");

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find today's history entry for this character and country
    let history = await this.pointsHistoryModel.findOne({
      where: {
        [Op.and]: [
          { sessionId: sessionId },
          { characterId: id },
          { country: country },
          { countryCode: countryCode },
          { created_at: { [Op.between]: [todayStart, todayEnd] } }, // Check only today's entries
        ],
      },
      raw: true,
    });

    if (!history) {
      history = await this.pointsHistoryModel.create({
        characterId: id,
        country,
        sessionId: sessionId,
        countryCode,
        totalPlus: increment ? 1 : 0,
        totalMinus: increment ? 0 : 1,
        pointsChange: increment ? 1 : -1,
      });
    } else {
      await this.pointsHistoryModel.update(
        {
          totalPlus: history.totalPlus + (increment ? 1 : 0),
          totalMinus: history.totalMinus + (increment ? 0 : 1),
          pointsChange: history.pointsChange + (increment ? 1 : -1),
        },
        {
          where: {
            [Op.and]: [
              { sessionId: sessionId },
              { characterId: id },
              { country: country },
              { countryCode: countryCode },
              { created_at: { [Op.between]: [todayStart, todayEnd] } },
            ],
          },
        }
      );
    }

    let allPoints = await this.pointsHistoryModel.findAll({ raw: true });
    const updatedCharacter = await this.characterModel.findByPk(id, { raw: true });

    this.socketGateway.sendUpdate("characterUpdated", updatedCharacter);
    let data = await this.getStats()
    this.socketGateway.sendUpdate("statsChanged", data)
    // 🔹 Emit updated stats as well (Frontend expects "statsUpdated" event)
    const totalPoints = await this.pointsHistoryModel.sum("pointsChange");
    this.socketGateway.sendUpdate("statsUpdated", { totalPoints });
    // console.log("updatedCharacterupdatedCharacterupdatedCharacter", updatedCharacter)
    // this.socketGateway.sendToUser(sessionId, 'characterPointsUpdated', updatedCharacter);
    const updatedPoints = await this.characterPointsData(id, sessionId);
    console.log("updatedPointsupdatedPoints", updatedPoints)
    this.socketGateway.sendToUser(sessionId, 'characterUpdatedForUser', updatedPoints);

    return character;
  }

  async getStats() {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    // Daily Points (last 24 hours) with character name
    const dailyPoints = await this.pointsHistoryModel.findAll({
      attributes: [
        "characterId",
        [Sequelize.fn("SUM", Sequelize.col("pointsChange")), "totalPoints"],
        [Sequelize.fn("SUM", Sequelize.col("totalPlus")), "totalPlus"],
        // [Sequelize.fn("SUM", Sequelize.col("totalMinus")), "totalMinus"],
        [
          Sequelize.fn("ABS", Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalMinus"), "INTEGER"))),
          "totalMinus"
        ],
      ],
      where: { created_at: { [Op.gte]: last24Hours } },
      group: ["characterId"],
      include: [
        {
          model: Character,
          attributes: ["name", "country", "countryCode", "loveAvatarUrl", "hateAvatarUrl", "avatarUrl", "headAvatarUrl"], // Include character name
        },
      ],
      raw: true
    });

    // Overall Points (Total)
    const overallPoints = await this.pointsHistoryModel.findAll({
      attributes: [
        "characterId",
        [Sequelize.fn("SUM", Sequelize.col("pointsChange")), "totalPoints"],
        [Sequelize.fn("SUM", Sequelize.col("totalPlus")), "totalPlus"],
        // [Sequelize.fn("SUM", Sequelize.col("totalMinus")), "totalMinus"],
        [
          Sequelize.fn("ABS", Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalMinus"), "INTEGER"))),
          "totalMinus"
        ],
      ],
      group: ["characterId"],
      include: [
        {
          model: Character,
          // attributes: ["name"], // Include character name
          attributes: ["name", "country", "countryCode", "loveAvatarUrl", "hateAvatarUrl", "avatarUrl", "headAvatarUrl"],
        },
      ],
      raw: true
    });

    // Country-wise Points
    const countryWisePoints = await this.pointsHistoryModel.findAll({
      attributes: [
        "country",
        "countryCode",
        [Sequelize.fn("SUM", Sequelize.col("pointsChange")), "totalPoints"],
        [Sequelize.fn("SUM", Sequelize.col("totalPlus")), "totalPlus"],
        // [Sequelize.fn("SUM", Sequelize.col("totalMinus")), "totalMinus"],
        [
          Sequelize.fn("ABS", Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalMinus"), "INTEGER"))),
          "totalMinus"
        ],
      ],
      where: { country: { [Op.ne]: null } },
      group: ["country", 'countryCode'],
      raw: true
    });
    return {
      dailyPoints,
      overallPoints,
      countryWisePoints,
    };
  }


  async createCharacter(data: { name: string; points: number; avatarUrl: string, }): Promise<Character> {
    let hateAvatarUrl = data.avatarUrl;
    let loveAvatarUrl = data.avatarUrl;
    let storeData = {
      ...data,
      hateAvatarUrl,
      loveAvatarUrl
    }
    return this.characterModel.create(storeData);
  }

  async characterPointsData(id: string, userId: string) {
    try {
      console.log("Query Params:", { characterId: id, sessionId: userId });

      const characterData: any = await this.characterModel.findOne({
        raw: true,
        where: {
          id: id
        }
      })
      const points = await this.pointsHistoryModel.findAll({
        attributes: [
          "characterId",
          "country",
          "countryCode",

          [Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("pointsChange"), "INTEGER")), "totalPoints"],
          [Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalPlus"), "INTEGER")), "totalPlus"],
          // [Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalMinus"), "INTEGER")), "totalMinus"],
          [
            Sequelize.fn("ABS", Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("totalMinus"), "INTEGER"))),
            "totalMinus"
          ],
        ],
        where: { characterId: id, sessionId: userId },
        group: ["characterId", 'sessionId', "country",
          "countryCode"],
        include: [
          {
            model: Character,
            attributes: [
              "name",
              "loveAvatarUrl",
              "hateAvatarUrl",
              "avatarUrl",
            ],
          },
        ],
        raw: true,
      });

      console.log("points", points);
      if (points.length > 0) {
        const pointsDatas = { ...points[0], sessionId: userId }
        return { points: pointsDatas }
      }
      else {
        const pointData = [
          {
            characterId: id,
            totalPoints: 0,
            totalPlus: 0,
            totalMinus: 0,
            'character.name': characterData.name,
            'country': null,
            'countryCode': null,
            'character.loveAvatarUrl': characterData.loveAvatarUrl,
            'character.hateAvatarUrl': characterData.hateAvatarUrl,
            'character.avatarUrl': characterData.avatarUrl
          }
        ]
        const pointsDatas = { ...pointData[0], sessionId: userId }
        return { points: pointsDatas }
      }
      // Return single object or null
    } catch (err) {
      console.error("Error fetching character points:", err);
      throw new Error("Could not fetch character points");
    }
  }

  async batchUpdatePoints(
    sessionId: string,

    data: {
      points: Array<{
        characterId: string;
        totalPlus: number;
        totalMinus: number;
        pointsChange: number;
        lastUpdate: number;
      }>
    },
    country, countryCode
  ) {
    const updates = data.points.map(async ({ characterId, totalPlus, totalMinus, pointsChange }) => {
      const character = await this.characterModel.findByPk(characterId);
      if (!character) return;
      // Get today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

     
      // Find existing entry for today
      const existingEntry = await this.pointsHistoryModel.findOne({
        where: {
          characterId,
          sessionId,
          created_at: {
            [Op.between]: [todayStart, todayEnd]
          },
          country: country,
          countryCode: countryCode,

        },
        raw: true
      });
      if (existingEntry) {
        // Calculate new values
        const newTotalPlus = Number(existingEntry.totalPlus) + Number(totalPlus);
        const newTotalMinus = Number(existingEntry.totalMinus) + Number(totalMinus);
        const newPointsChange = Number(newTotalPlus) - Number(newTotalMinus);


        await this.pointsHistoryModel.update(
          {
            totalPlus: newTotalPlus,
            totalMinus: newTotalMinus,
            pointsChange: newPointsChange,
          },
          {
            where: {
              characterId,
              country,
              countryCode,
              sessionId,
            },
          }
        );
      } else {
        // Create new entry if none exists for today
        const newEntry = await this.pointsHistoryModel.create({
          characterId,
          sessionId,
          totalPlus,
          totalMinus,
          pointsChange: totalPlus - totalMinus,
          country,
          countryCode,
        });
      }

      let allPoints = await this.pointsHistoryModel.findAll({ raw: true });
      const updatedCharacter = await this.characterModel.findByPk(characterId, { raw: true });
      this.socketGateway.sendUpdate("characterUpdated", updatedCharacter);
      let data = await this.getStats()
      this.socketGateway.sendUpdate("statsChanged", data)
      const totalPoints = await this.pointsHistoryModel.sum("pointsChange");
      this.socketGateway.sendUpdate("statsUpdated", { totalPoints });
      const updatedPoints = await this.characterPointsData(characterId, sessionId);
      this.socketGateway.sendToUser(sessionId, 'characterUpdatedForUser', updatedPoints);

    });

    await Promise.all(updates);
    return { success: true };
  }

}
