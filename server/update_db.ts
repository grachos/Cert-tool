import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const parseDbUrl = (url: string) => {
  const regex = /mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid DATABASE_URL');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
};

async function updateDb() {
  const dbConfig = parseDbUrl(process.env.DATABASE_URL || 'mysql://root:@localhost:3307/cert_techcol');
  const pool = createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Dropping tables if they exist to recreate with correct collation...');
    await pool.query('DROP TABLE IF EXISTS NonConformance');
    await pool.query('DROP TABLE IF EXISTS Audit');

    console.log('Creating Audit table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Audit (
        id VARCHAR(191) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        type ENUM('INTERNAL', 'EXTERNAL', 'CERTIFICATION') NOT NULL,
        auditorName VARCHAR(255) NOT NULL,
        status ENUM('SCHEDULED', 'IN_PROGRESS', 'CLOSED') DEFAULT 'SCHEDULED',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Creating NonConformance table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS NonConformance (
        id VARCHAR(191) PRIMARY KEY,
        auditId VARCHAR(191) NOT NULL,
        requirementId VARCHAR(191) NOT NULL,
        type ENUM('MAJOR_NC', 'MINOR_NC', 'OBSERVATION', 'OPPORTUNITY') NOT NULL,
        description TEXT NOT NULL,
        status ENUM('OPEN', 'PENDING_AI_REVIEW', 'CLOSED', 'REJECTED_BY_AI') DEFAULT 'OPEN',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (auditId) REFERENCES Audit(id) ON DELETE CASCADE,
        FOREIGN KEY (requirementId) REFERENCES Requirement(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Adding nonConformanceId to ActionPlan...');
    try {
      await pool.query(`
        ALTER TABLE ActionPlan 
        ADD COLUMN nonConformanceId VARCHAR(191) NULL,
        ADD FOREIGN KEY (nonConformanceId) REFERENCES NonConformance(id) ON DELETE SET NULL
      `);
    } catch {
      console.log('Column might already exist, skipping...');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

updateDb();
