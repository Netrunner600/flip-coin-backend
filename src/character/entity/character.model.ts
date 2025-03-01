import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
  Default,
  PrimaryKey,
} from "sequelize-typescript";
import { PointsHistory } from "src/history/points-history.model";
import { v4 as uuidv4 } from "uuid";

@Table({ tableName: "characters" })
export class Character extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column({ type: DataType.UUID })
  id: string = uuidv4();

  @Column({ type: DataType.STRING, allowNull: false })
  avatarUrl: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  hateAvatarUrl: string;

  @Column({ type: DataType.STRING, allowNull: true })
  loveAvatarUrl: string;

  @Column({ type: DataType.STRING, allowNull: true })
  country: string;

  @Column({ type: DataType.STRING, allowNull: true })
  countryCode: string;
  //   @Column({ type: DataType.INTEGER, defaultValue: 0 })
  // points: number;

  // @Column({ type: DataType.INTEGER, defaultValue: 0 })
  // points24h: number;++
  @HasMany(() => PointsHistory)
  history: PointsHistory[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
