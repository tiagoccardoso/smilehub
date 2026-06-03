# Entrega SmileHub

Pacote com dois projetos separados e SQL completo para Neon zerado.

## Estrutura

```text
smilehub-delivery/
├── smilehub-gestao/
│   ├── app/admin/
│   ├── app/api/auth/
│   ├── app/api/admin/clinic-settings/
│   ├── app/api/booking/
│   ├── db/schema_neon_zero_smilehub.sql
│   └── .env.example
└── smilehub-sites/
    ├── app/about/
    ├── app/services/
    ├── app/agenda/
    ├── app/api/professionals/
    ├── app/api/availability/
    ├── app/api/booking/
    ├── db/schema_neon_zero_smilehub.sql
    └── .env.example
```

## O que foi implementado

- Separação em `smilehub-gestao` e `smilehub-sites`.
- Renomeação de Ampedent/DentalSys para SmileHub.
- Novo ícone/logotipo em SVG/PNG/ICO/WebP.
- Cadastro completo de usuário + clínica, com slug, endereço, site público, plano, aceite de termos e política.
- Criação automática de clínica, vínculo `clinic_users`, domínio padrão, entitlements, assinatura trial 7 dias e conteúdo público inicial.
- SQL completo `db/schema_neon_zero_smilehub.sql` para banco Neon vazio.
- Tabelas multi-clínica: `clinics`, `clinic_users`, `clinic_domains`, `clinic_entitlements`, `clinic_subscriptions` e tabelas operacionais com `clinic_id`.
- Helpers administrativos: `getCurrentClinic`, `requireCurrentClinic`, `getCurrentUserClinicRole`, `requireClinicAccess`.
- Helper público: `resolveClinicByHost`.
- Configurações da clínica em `/admin/settings` e API `GET/PATCH /api/admin/clinic-settings`.
- Filtros por `clinic_id` em pacientes, profissionais, procedimentos, agenda, odontograma, prontuários, orçamentos, financeiro e bookings administrativos.
- APIs públicas filtrando pela clínica resolvida pelo domínio.

## Como aplicar

1. Escolha um banco Neon vazio.
2. Execute `smilehub-gestao/db/schema_neon_zero_smilehub.sql` no SQL Editor do Neon.
3. Configure as variáveis do `.env.example` em cada projeto.
4. Faça deploy separado na Vercel:
   - `smilehub-gestao` para o painel administrativo;
   - `smilehub-sites` para sites públicos/domínios das clínicas.
5. Configure os domínios públicos em `clinic_domains.normalized_domain`.

## Validação feita nesta entrega

- Verificação de sintaxe TypeScript/TSX por parser local.
- Verificação de ausência de referências textuais/arquivos com Ampedent/DentalSys.
- Conferência da estrutura final dos dois projetos.

Não foi executado `next build` completo porque as dependências (`node_modules`) não estavam instaladas no ambiente de montagem do pacote.
