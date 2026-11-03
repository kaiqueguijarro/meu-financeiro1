# Login por Magic Link — Meu Financeiro

O app utiliza `supabase.auth.signInWithOtp` com `emailRedirectTo` apontando para a origem e caminho do próprio aplicativo. O Supabase retorna a sessão quando o link abre o site; `detectSessionInUrl` está ativado.

## Configuração necessária no Supabase

1. Authentication → Providers → Email: confirme que o login por e-mail está habilitado.
2. Authentication → URL Configuration: configure **Site URL** com o domínio HTTPS final da Vercel.
3. Em **Redirect URLs**, adicione o mesmo endereço HTTPS da Vercel (com barra final) e os domínios de prévia apenas se realmente precisar. Evite curingas amplos em produção.
4. Authentication → Email Templates → Magic Link: pode manter o template padrão com `{{ .ConfirmationURL }}`. Não é necessário SMTP personalizado apenas para utilizar o modelo padrão.
5. Vercel → Environment Variables: defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com valores públicos do projeto. Nunca exponha service_role ou secret key.
6. Faça o deploy e solicite um link na página publicada. Abra o e-mail no iPhone e toque em **Sign in**. Verifique que o navegador retorna à aplicação autenticada.

**Limitações:** o provedor de e-mail padrão do Supabase tem restrições de envio; para uso contínuo pode ser necessário SMTP próprio. O primeiro login só pode ser validado com um domínio publicado e uma conta de e-mail real. Não publique dados financeiros pessoais no repositório ou em arquivos de demonstração.
