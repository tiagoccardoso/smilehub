const { neon } = require('@neondatabase/serverless')

async function run() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL não configurada')
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const startedAt = Date.now()

  try {
    const [pingRow] = await sql`SELECT 1 as ok`
    const [nowRow] = await sql`SELECT NOW() as now`

    console.log(
      JSON.stringify(
        {
          ok: Boolean(pingRow?.ok),
          dbTime: nowRow?.now ?? null,
          latencyMs: Date.now() - startedAt,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    const safeError =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: 'UnknownError', message: 'Erro desconhecido' }

    console.error('Falha ao testar conexão com o banco', safeError)
    process.exit(1)
  }
}

run()
