# Meu Financeiro

Aplicativo responsivo de finanças pessoais em React, TypeScript, Vite e Supabase.

## Executar

1. `npm install`
2. Copie `.env.example` para `.env`.
3. Preencha `VITE_SUPABASE_ANON_KEY` com a chave **publicável/anon** do projeto Supabase. Nunca use `service_role`.
4. `npm run dev`
5. `npm run build` para verificar compilação.

## Recursos desta versão

- Cadastro e login com Supabase Auth.
- Contas, cartões e lançamentos persistidos no banco com RLS.
- Saldo estimado a partir de saldo inicial e movimentações não-cartão.
- Consulta de faturas confirmadas do mês atual.
- Interface responsiva para iPhone e manifesto de instalação na tela inicial.

## Limitações conhecidas

- Ainda não gera parcelas, recorrências, conciliação ou projeção de 6 meses.
- O saldo usa até 100 lançamentos recentes; não é adequado para saldo histórico completo.
- A competência da fatura é a que estiver salva no banco, não calculada automaticamente.
- Não importar dados reais antes de validar autenticação e regras de acesso.
- Não há automação de implantação ou serviço de notificações push nesta versão.

## Previsão de cartões (atualização)

O painel **Previsão das faturas** permite selecionar um dos próximos 12 meses e detalha por cartão as parcelas, as regras recorrentes ativas e o total previsto. A consulta usa as tabelas `transactions`, `installments`, `recurring_rules` e `statements` do Supabase. Os valores confirmados em `statements` prevalecem sobre o cálculo. Nenhum dado financeiro pessoal foi incluído no código-fonte.

A previsão usa o fechamento do cartão para atribuir a compra à fatura e divide o valor total em centavos quando não existem parcelas materializadas. Regras recorrentes são previstas com base no dia da cobrança e nas datas de vigência. É necessário cadastrar os cartões, compras parceladas e recorrências no banco autenticado para visualizar valores reais. O ZIP não inclui credenciais.

## Verificação da previsão (V3)

Os testes de lógica financeira estão em `tests/forecast.test.mjs`. Para executá-los após instalar Node.js/TypeScript:

```bash
npx tsc src/forecast.ts --target es2022 --module nodenext --moduleResolution nodenext --outDir .test-build --skipLibCheck
node tests/forecast.test.mjs
```

Foram verificadas as viradas de fechamento (24/25), mudança de ano, rateio em centavos, encerramento de parcelas, recorrências e prevalência de faturas confirmadas.

**Limitação:** a integração ponta a ponta com o Supabase requer autenticação e dados cadastrados. Não há dados financeiros pessoais embutidos no código. A compilação React/Vite precisa ser executada em ambiente com acesso ao registro npm.


## Login por link de e-mail (Magic Link)

O aplicativo envia um link de acesso usando `signInWithOtp` e abre a sessão automaticamente após o redirecionamento autorizado. Não é necessário alterar o modelo padrão de e-mail nem configurar um código OTP. Consulte `CONFIGURAR-MAGIC-LINK.md` para as etapas de URL Configuration e Vercel.
