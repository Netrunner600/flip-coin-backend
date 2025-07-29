import { registerAs } from '@nestjs/config';
export default registerAs('database', () => ({
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, 
    port: parseInt(process.env.DB_PORT || '8000', 10), 
}));