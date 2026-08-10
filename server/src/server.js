import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './db.js';

connectDatabase()
  .then(() => app.listen(env.PORT, () => console.log(`CareerAI API listening on ${env.SERVER_URL}`)))
  .catch((error) => {
    console.error('Unable to connect to MongoDB', error);
    process.exit(1);
  });
