-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "cashOpeningBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cashOpeningDate" DATE;

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "isFreight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "CashEntry_date_idx" ON "CashEntry"("date");


-- Categorias padrão (ids fixos = valores já gravados em "Expense"."category")
INSERT INTO "ExpenseCategory" ("id", "name", "color", "icon", "isFreight", "sortOrder") VALUES
  ('ENTREGA', 'Entrega', 'sky', 'truck', true, 1),
  ('RETIRADA', 'Retirada', 'indigo', 'package', true, 2),
  ('COMBUSTIVEL', 'Combustível', 'amber', 'fuel', false, 3),
  ('MANUTENCAO', 'Manutenção', 'rose', 'wrench', false, 4),
  ('COMPRA', 'Compra de material', 'emerald', 'cart', false, 5),
  ('OUTROS', 'Outros', 'slate', 'tag', false, 99)
ON CONFLICT DO NOTHING;
