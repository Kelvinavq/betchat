import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { initializePool, query, closePool } from '../config/database.js';

dotenv.config();

const DEFAULT_USER = {
  username: 'admin',
  full_name: 'Administrador Principal',
  email: 'admin@betchat.local',
  password: 'Admin1234!',
  role: 'admin',
};

async function main() {
  try {
    await initializePool();

    const { rows: existingRows, error: selectError } = await query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [DEFAULT_USER.username]
    );

    if (selectError) {
      throw selectError;
    }

    if (existingRows?.length > 0) {
      console.log(`El usuario '${DEFAULT_USER.username}' ya existe en la base de datos.`);
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_USER.password, 12);

    const insertSql = `
      INSERT INTO users
        (username, full_name, email, password_hash, role, is_active)
      VALUES
        (?, ?, ?, ?, ?, 1)
    `;

    const { rows: insertResult, error: insertError } = await query(insertSql, [
      DEFAULT_USER.username,
      DEFAULT_USER.full_name,
      DEFAULT_USER.email,
      passwordHash,
      DEFAULT_USER.role,
    ]);

    if (insertError) {
      throw insertError;
    }

    console.log(`Usuario creado: ${DEFAULT_USER.username}`);
    console.log('Recuerda cambiar la contraseña por una segura en producción.');
  } catch (error) {
    console.error('Error al sembrar usuario:', error.message || error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
