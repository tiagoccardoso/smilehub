const { MongoClient } = require('mongodb')

async function neonDataRequest(resource, options = {}) {
  const dataApiUrl = process.env.NEON_AUTH_BASE_URL
  const serviceRoleKey = process.env.NEON_AUTH_SERVICE_ROLE_KEY

  if (!dataApiUrl) throw new Error('Missing NEON_AUTH_BASE_URL')
  if (!serviceRoleKey) throw new Error('Missing NEON_AUTH_SERVICE_ROLE_KEY')

  const endpoint = new URL(`${dataApiUrl.replace(/\/$/, '')}/rest/v1/${resource}`)
  Object.entries(options.searchParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined) endpoint.searchParams.set(key, String(value))
  })

  const response = await fetch(endpoint, {
    method: options.method ?? 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.message ?? `Data API request failed: ${response.status}`)
  }

  return data
}

function toDateOnly(value) {
  return new Date(value).toISOString().split('T')[0]
}

function normalizeBookingStatus(status) {
  if (status === 'completed' || status === 'canceled') return status
  if (status === 'uncompleted') return 'canceled'
  return 'pending'
}

async function main() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('Missing MONGODB_URI')

  const mongo = new MongoClient(mongoUri)
  await mongo.connect()

  const db = mongo.db()
  const bookings = await db.collection('bookings').find().toArray()

  if (bookings.length > 0) {
    await neonDataRequest('bookings', {
      method: 'POST',
      body: bookings.map(booking => ({
        mongo_id: booking._id.toString(),
        first_name: booking.firstName,
        last_name: booking.lastName,
        email: booking.email,
        phone: booking.phone,
        message: booking.message || null,
        status: normalizeBookingStatus(booking.status),
        date: toDateOnly(booking.date),
        time: booking.time,
        created_at: booking.createdAt ?? new Date().toISOString(),
        updated_at: booking.updatedAt ?? new Date().toISOString(),
      })),
      searchParams: {
        on_conflict: 'mongo_id',
      },
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    })
  }

  const users = await db.collection('users').find().toArray()

  if (users.length > 0) {
    await neonDataRequest('admin_users', {
      method: 'POST',
      body: users.map(user => ({
        mongo_id: user._id.toString(),
        name: user.name,
        email: user.email ?? null,
        role: user.role ?? 'admin',
        created_at: user.createdAt ?? new Date().toISOString(),
        updated_at: user.updatedAt ?? new Date().toISOString(),
      })),
      searchParams: {
        on_conflict: 'mongo_id',
      },
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    })
  }

  await mongo.close()
  console.log(`Migrated ${bookings.length} bookings and ${users.length} user profiles`)
  console.log('Após migração, defina password_hash em admin_users para habilitar login administrativo.')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
