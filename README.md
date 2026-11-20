# Locação de Equipamentos

Sistema para controlar a locação de equipamentos de construção civil (andaimes, escoras, plataformas, betoneiras…).
Funciona no navegador do celular e do computador e pode ser **instalado na tela inicial** como um aplicativo.

Ele substitui a planilha "Locar Equipamento e Serviços" e resolve os problemas dela:

| Na planilha | No sistema |
|---|---|
| Uma linha por equipamento, repetindo cliente e endereço | **Uma locação com vários equipamentos**, escolhidos numa lista |
| Para devolver parte do material, era preciso encerrar e criar outra locação | **Devolução parcial**: cada parte cobra os próprios dias |
| Se marcava "Finalizado" e esquecia a data de entrega, o estoque ficava errado | O estoque só volta quando a **devolução é registrada**. Encerrar exige tudo devolvido |
| "Devolvido" e "pago" se misturavam | **Situação do material** (na obra / atrasada / devolvida / encerrada) e **situação financeira** (em aberto / pago em parte / pago) separadas |
| Preços em papel e foto no celular | **Tabela de preços** (diária, semana, quinzena, mês) por equipamento, mais o **último valor cobrado de cada cliente** |
| Financeiro em outro aplicativo | **Pagamentos** por locação, painel do que falta receber e do que foi recebido no mês |
| Orçamento montado à mão numa aba | **Orçamento gerado da locação**, com link para o cliente, PDF e envio pelo WhatsApp |
| Esquecia de somar compras ao total do estoque | **Entrada, baixa e recontagem** de estoque, com histórico e data |

## Como usar no dia a dia

1. **Nova locação** (botão verde `+`): escolha o cliente (ou cadastre digitando o nome), toque num endereço já usado,
   escolha o prazo (1, 7, 15 ou 30 dias, ou a data), toque em **Adicionar** e marque os equipamentos.
   O valor por dia vem sozinho: primeiro o último valor cobrado daquele cliente, depois a tabela de preços, depois o último valor cobrado de qualquer cliente. Dá para trocar.
2. **Salvar orçamento** não tira nada do estoque. Envie pelo WhatsApp. Quando o material sair, toque em **Confirmar locação**.
3. **Devolução**: na locação, informe quantas unidades voltaram e a data. Pode ser parcial, quantas vezes for preciso.
   Se for cobrar outro número de dias (domingo, responsável ausente…), abra "Cobrar outro nº de dias".
4. **Pagamento**: registre cada valor recebido (Pix, dinheiro…).
5. **Encerrar** quando tudo voltou. Se ainda houver saldo, ele continua aparecendo no **Financeiro**.

Atraso: com material na obra depois da data prevista, a locação fica **Atrasada** e os dias excedentes passam a ser somados.

### Como os dias são contados

Contam o dia da retirada e o dia da devolução (21/08 → 19/09 = 30 dias), como na planilha. Em qualquer item ou devolução dá para informar os dias cobrados à mão.

## Tecnologia

- [Next.js 15](https://nextjs.org) (App Router, server actions) + React 19 + Tailwind CSS 4
- [Prisma 6](https://www.prisma.io) + PostgreSQL
- Login próprio (e-mail e senha, sessão em cookie assinado)
- PWA (manifest + service worker) para instalar no celular

## Publicar na Vercel (gratuito)

1. Crie um banco Postgres gratuito no [Neon](https://neon.tech) (ou Supabase) e copie a **connection string direta** (sem `-pooler`).
2. Na [Vercel](https://vercel.com/new), importe este repositório.
3. Em *Environment Variables*, cadastre:
   - `DATABASE_URL`: a connection string do passo 1
   - `AUTH_SECRET`: um texto aleatório longo (por exemplo, gerado com `openssl rand -hex 32`)
4. Clique em **Deploy**. O build já cria as tabelas (`prisma migrate deploy`).
5. Abra o site. Na primeira vez, ele pede para **criar o usuário do dono**.
6. Vá em **Configurações → Importar planilha** e envie o `.xlsx` (no Google Sheets: Arquivo → Fazer download → Microsoft Excel).
7. No celular, abra o site no Chrome e toque em **⋮ → Instalar app** (no iPhone: Compartilhar → Adicionar à Tela de Início).

## Rodar no computador

```bash
pnpm install
cp .env.example .env    # preencha DATABASE_URL e AUTH_SECRET
pnpm db:migrate         # cria as tabelas
pnpm dev                # http://localhost:3000
```

Importar a planilha pela linha de comando:

```bash
pnpm importar "Locar Equipamento e Serviços.xlsx"            # banco vazio
pnpm importar "Locar Equipamento e Serviços.xlsx" --substituir  # apaga clientes/estoque/locações e importa de novo
```

Testes das regras de cálculo: `pnpm test`.

## Como a importação interpreta a planilha

- Linhas de **Locações Ativas** com o mesmo cliente, obra e data de retirada viram uma locação com vários itens.
- Com **Entrega** preenchida, o item conta como devolvido nessa data, com os **Dias** da planilha.
- Sem Entrega, o item continua na obra. Mas se o status for "Finalizado", ele é marcado como devolvido na data prevista (o relatório informa quantos foram).
- Status "Pago" ou "Finalizado" vira locação quitada. Se o "Valor Pago" for menor que o calculado, a diferença vira desconto.
- Previsão anterior à retirada (erro de digitação) é deixada em branco e aparece nos avisos.
- Dados do Pix, observações e rodapé vêm da aba **Orçamento**.

## Estrutura

```
prisma/schema.prisma        modelo de dados
src/lib/calc.ts             regras de cálculo (dias, valores, atraso, preço sugerido)
src/lib/importer.ts         importação da planilha
src/app/(app)/              telas internas (painel, locações, estoque, clientes, financeiro, configurações)
src/app/o/[token]/          orçamento público enviado ao cliente
tests/                      testes do cálculo
```
