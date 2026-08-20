import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
let config: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cert_techcol',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: 'Z'
};

if (databaseUrl && databaseUrl.startsWith('mysql://')) {
  try {
    // Format: mysql://user:password@host:port/database
    const rawUrl = databaseUrl.replace('mysql://', '');
    const [auth, rest] = rawUrl.split('@');
    const [user, passPart] = auth.split(':');
    const password = passPart || '';
    
    const [hostPort, dbNamePart] = rest.split('/');
    const [host, portPart] = hostPort.split(':');
    const port = portPart ? Number(portPart) : 3306;
    const database = dbNamePart ? dbNamePart.split('?')[0] : 'cert_techcol';

    config.user = user;
    config.password = password;
    config.host = host;
    config.port = port;
    config.database = database;
  } catch (e) {
    console.error('Error parsing DATABASE_URL, using defaults:', e);
  }
}

const pool = mysql.createPool(config);

export default pool;
