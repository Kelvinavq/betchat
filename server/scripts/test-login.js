import dotenv from 'dotenv';
import { initializePool, query, closePool } from '../config/database.js';
import { verifyPassword } from '../utils/password.js';

dotenv.config();

async function testLogin() {
  try {
    await initializePool();

    const username = 'admin';
    const password = 'Admin1234!';

    console.log(`Intentando login con usuario: ${username}`);

    const { rows, error } = await query(
      'SELECT id, username, full_name, email, password_hash, role, is_active, last_login_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (error) {
      console.error('Error en query:', error);
      return;
    }

    const user = rows?.[0];

    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }

    console.log(`Usuario encontrado: ${user.username}`);
    console.log(`Activo: ${user.is_active}`);
    console.log(`Rol: ${user.role}`);

    const passwordMatches = await verifyPassword(password, user.password_hash);
    console.log(`Contraseña coincide: ${passwordMatches}`);

    if (!user.is_active) {
      console.log('Usuario inactivo');
      return;
    }

    if (!['admin', 'cashier'].includes(user.role)) {
      console.log(`Rol no permitido: ${user.role}`);
      return;
    }

    if (!passwordMatches) {
      console.log('Contraseña incorrecta');
      return;
    }

    console.log('Login exitoso!');

  } catch (error) {
    console.error('Error:', error.message || error);
  } finally {
    await closePool();
  }
}

testLogin();