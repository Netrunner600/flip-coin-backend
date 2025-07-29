// import {
//   Table,
//   Column,
//   Model,
//   ForeignKey,
//   DataType,
//   CreatedAt,
//   UpdatedAt,
//   DeletedAt,
//   PrimaryKey,
//   Default,
// } from "sequelize-typescript";
// import { Character } from "src/character/entity/character.model";
// import { v4 as uuidv4 } from "uuid";

// @Table({ tableName: "points_history" })
// export class PointsHistory extends Model {
//   @PrimaryKey
//   @Default(uuidv4)
//   @Column({ type: DataType.UUID })
//   id: string = uuidv4();

//   @ForeignKey(() => Character)
//   @Column({ type: DataType.STRING })
//   characterId: string;

//   @Column({ type: DataType.INTEGER, defaultValue: 0 })
//   totalPlus: number; // Total + clicks

//   @Column({ type: DataType.INTEGER, defaultValue: 0 })
//   totalMinus: number; // Total - clicks

//   @Column({ type: DataType.INTEGER, defaultValue: 0 })
//   pointsChange: number; // Net change in points

//   @Column({ type: DataType.STRING, allowNull: true })
//   country: string;

//   @CreatedAt
//   created_at: Date;

//   @UpdatedAt
//   updated_at: Date;

//   @DeletedAt
//   deleted_at: Date;
// }

import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import { Character } from "src/character/entity/character.model";
import { v4 as uuidv4 } from "uuid";

@Table({ tableName: "points_history" })
export class PointsHistory extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column({ type: DataType.UUID })
  id: string = uuidv4();

  @ForeignKey(() => Character)
  @Column({ type: DataType.UUID })
  characterId: string;

  @BelongsTo(() => Character)
  character: Character; // <-- Add this association

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  totalPlus: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  totalMinus: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  pointsChange: number;

  @Column({ type: DataType.STRING, defaultValue: 0 })
  sessionId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  country: string;

  @Column({ type: DataType.STRING, allowNull: true })
  countryCode: string;
  
  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}

