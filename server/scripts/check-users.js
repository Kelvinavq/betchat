import dotenv from 'dotenv';
import { initializePool, query, closePool } from '../config/database.js';

dotenv.config();

async function checkUsers() {
  try {
    await initializePool();

    const { rows: users, error } = await query(
      'SELECT id, username, email, role, is_active FROM users',
      []
    );

    if (error) {
      throw error;
    }

    console.log('Usuarios en la base de datos:');
    console.log('================================');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Active: ${user.is_active}`);
      console.log('--------------------------------');
    });

    if (users.length === 0) {
      console.log('No hay usuarios en la base de datos.');
      console.log('Ejecuta: npm run seed:user');
    }

  } catch (error) {
    console.error('Error:', error.message || error);
  } finally {
    await closePool();
  }
}

checkUsers();