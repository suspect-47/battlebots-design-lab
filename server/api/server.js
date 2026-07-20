// Load .env for local runs (`npm run api`). In production the platform injects
// the environment directly — Function Compute from s.yaml — and there is no .env
// file, so a missing one is not an error. Without this the DASHSCOPE_API_KEY the
// README tells you to set never reaches the agents and every AI route 503s.
import 'dotenv/config'
import { buildApp } from './app.js'
import { getPool } from '../db/pool.js'

const app = buildApp({ pool: getPool() })
const port = Number(process.env.PORT) || 3001

app.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`api listening on :${port}`))
  .catch((err) => { console.error(err); process.exit(1) })
