import { Column, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'documents',
  timestamps: false,
})
export class Document extends Model<Document, { title: string; location: string }> {
  @Column
  title!: string;

  @Column
  location!: string;
}
