const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect()
  .then(() => { console.log('CONECTÓ OK'); return client.end(); })
  .catch(err => console.error('FALLÓ:', err.message));
