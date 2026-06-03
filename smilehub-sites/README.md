# SmileHub

Projeto transformado para operar como plataforma multi-clínica, usando Next.js + Neon.

## Entregáveis principais

- `smilehub-gestao`: área administrativa com login, cadastro, dashboard, pacientes, profissionais, agenda interna, procedimentos, odontograma, prontuários, financeiro, orçamentos, configurações da clínica e assinatura.
- `smilehub-sites`: páginas públicas da clínica e APIs públicas de profissionais, disponibilidade e agendamento por domínio.
- `db/schema_neon_zero_smilehub.sql`: SQL completo para montar um banco Neon zerado.

## Banco Neon zerado

1. Crie um banco novo no Neon.
2. Abra o SQL Editor.
3. Execute o arquivo `db/schema_neon_zero_smilehub.sql`.
4. Configure `DATABASE_URL` na Vercel e localmente.

O SQL cria as tabelas multi-clínica, índices por `clinic_id`, domínios, permissões de plano, assinaturas, dados operacionais e conteúdo público inicial.

## Variáveis de ambiente

### smilehub-gestao

```env
DATABASE_URL="postgresql://usuario:senha@host.neon.tech/db?sslmode=require"
NEON_AUTH_COOKIE_SECRET="gere-um-token-forte"
NEXT_PUBLIC_APP_URL="https://gestao.seudominio.com.br"
NEXT_PUBLIC_PUBLIC_SITE_DOMAIN="smilehub.com.br"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
```

### smilehub-sites

```env
DATABASE_URL="postgresql://usuario:senha@host.neon.tech/db?sslmode=require"
NEXT_PUBLIC_PLATFORM_DOMAIN="smilehub.com.br"
NEXT_PUBLIC_APP_URL="https://sites.seudominio.com.br"
```

## Rodar localmente

```bash
bun install
bun run dev
```

ou:

```bash
npm install
npm run dev
```

## Cadastro inicial

A tela `/admin` permite alternar entre login e cadastro. O cadastro cria em uma única operação:

1. usuário administrativo;
2. clínica;
3. vínculo em `clinic_users`;
4. subdomínio padrão em `clinic_domains`;
5. permissões em `clinic_entitlements`;
6. assinatura em trial de 7 dias;
7. conteúdo público inicial.

## Isolamento multi-clínica

As rotas administrativas usam `requireCurrentClinic()`/`requireClinicAccess()` e filtram dados por `clinic_id`. O frontend não envia `clinic_id` livremente para gravações administrativas.

As páginas e APIs públicas usam `resolveClinicByHost()` para descobrir a clínica a partir do domínio acessado e validar site público + entitlement.

## Testes recomendados

1. Executar o SQL em um banco Neon vazio.
2. Configurar `.env.local` com `DATABASE_URL` e `NEON_AUTH_COOKIE_SECRET`.
3. Rodar `npm install && npm run build` ou `bun install && bun run build`.
4. Cadastrar uma clínica no plano Gestão e conferir que `public_website=false`.
5. Cadastrar uma clínica no plano Personalizado e conferir site público, agendamento online e domínio ativo.
6. Criar pacientes/profissionais/procedimentos/agendamentos em duas clínicas diferentes e validar isolamento por `clinic_id`.
7. Validar o domínio público em `clinic_domains.normalized_domain`.


## Projeto: smilehub-sites

Este pacote contém somente páginas públicas e APIs públicas. A área administrativa foi separada para `smilehub-gestao`.
