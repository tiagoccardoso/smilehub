const { neon } = require('@neondatabase/serverless')
const crypto = require('node:crypto')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Missing DATABASE_URL')
const sql = neon(databaseUrl)

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function createSuperUser() {
  const name = 'admin'
  const email = 'admin@example.com'
  const password = '123456'
  const role = 'superadmin'

  await sql`INSERT INTO admin_users (email, name, role, password_hash)
            VALUES (${email}, ${name}, ${role}, ${hashPassword(password)})
            ON CONFLICT (email)
            DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, updated_at = NOW()`

  console.log('superadmin user created/updated')
}

createSuperUser().catch(error => {
  console.error(error)
  process.exit(1)
})
