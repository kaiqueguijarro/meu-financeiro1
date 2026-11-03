# Publicação de teste — Meu Financeiro

## Antes de publicar

O repositório GitHub precisa conter **os arquivos deste projeto na raiz**, inclusive `package.json`, `src/`, `index.html` e `vercel.json`. Extrair o ZIP no Codespaces não publica os arquivos no GitHub: é preciso fazer commit/push.

## Vercel

1. Acesse https://vercel.com/new e conecte o GitHub pessoal.
2. Importe `kaiqueguijarro/meu-financeiro1` **depois** de confirmar que o código atualizado está no repositório.
3. Framework: Vite; Build Command: `npm run build`; Output Directory: `dist`.
4. Adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, copiando os valores de `.env.example` (ambas são públicas; nunca utilize service_role/secret).
5. Faça o deploy. Se falhar, compartilhe somente o log sem tokens ou dados financeiros.

## Supabase

Depois de obter o endereço HTTPS da Vercel, em Supabase > Authentication > URL Configuration:
- Site URL: endereço exato do aplicativo, por exemplo `https://seu-app.vercel.app`.
- Redirect URLs: adicione o endereço exato com barra final, por exemplo `https://seu-app.vercel.app/`.

Mantenha o modelo padrão Magic Link com `{{ .ConfirmationURL }}`. Não é necessário editar o template.

## Validação

1. Abra o endereço publicado no Safari do iPhone.
2. Informe seu e-mail **no próprio app**; não envie código ou link de autenticação pelo chat.
3. Toque no link do e-mail e confirme que o aplicativo retorna com sessão iniciada.
4. Cadastre uma despesa pequena de teste, confirme que aparece somente na sua conta e depois exclua o teste, se houver opção de exclusão.

**Atenção:** o banco atualmente não contém as compras pessoais. A publicação por si só não as importa. Não coloque dados pessoais em arquivos de código ou no GitHub público.
