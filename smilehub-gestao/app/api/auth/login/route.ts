import { authenticate, setSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return Response.json({ message: 'Email e senha são obrigatórios' }, { status: 400 })
    const user = await authenticate(email.toLowerCase(), password)
    if (!user) return Response.json({ message: 'Credenciais inválidas' }, { status: 401 })
    await setSession({ id: user.id, email: user.email, name: user.name, role: user.role })
    return Response.json({ message: 'Login realizado com sucesso' })
  } catch {
    return Response.json({ message: 'Não foi possível entrar no momento. Tente novamente em instantes.' }, { status: 500 })
  }
}
