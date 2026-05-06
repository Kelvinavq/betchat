import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { initializePool, query, closePool } from '../config/database.js';

dotenv.config();

async function testPassword() {
  try {
    await initializePool();

    const { rows: users, error } = await query(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      ['admin']
    );

    if (error) {
      throw error;
    }

    if (users.length === 0) {
      console.log('Usuario no encontrado');
      return;
    }

    const user = users[0];
    const testPassword = 'Admin1234!';

    console.log('Verificando contraseña...');
    console.log(`Usuario: ${user.username}`);
    console.log(`Hash almacenado: ${user.password_hash.substring(0, 20)}...`);

    const isValid = await bcrypt.compare(testPassword, user.password_hash);

    console.log(`Contraseña "${testPassword}" es válida: ${isValid}`);

    if (!isValid) {
      console.log('La contraseña no coincide. Intentando recrear el hash...');

      const newHash = await bcrypt.hash(testPassword, 12);
      console.log(`Nuevo hash: ${newHash.substring(0, 20)}...`);

      const updateResult = await query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, user.id]
      );

      if (updateResult.error) {
        console.log('Error al actualizar:', updateResult.error);
      } else {
        console.log('Hash actualizado. Intenta loguearte nuevamente.');
      }
    }

  } catch (error) {
    console.error('Error:', error.message || error);
  } finally {
    await closePool();
  }
}

testPassword();