-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'LOCAR EQUIPAMENTOS',
    "subtitle" TEXT NOT NULL DEFAULT 'Locação de equipamentos para construção civil',
    "location" TEXT NOT NULL DEFAULT 'Pacatuba - CE',
    "instagram" TEXT NOT NULL DEFAULT '@locarequipamento',
    "phone" TEXT NOT NULL DEFAULT '',
    "pixKey" TEXT NOT NULL DEFAULT '',
    "pixName" TEXT NOT NULL DEFAULT '',
    "pixBank" TEXT NOT NULL DEFAULT '',
    "quoteNotes" TEXT NOT NULL DEFAULT 'O prazo contratado deverá ser respeitado; dias excedentes serão cobrados.
Danos, perdas ou avarias decorrentes de uso inadequado serão cobrados.
Não é permitida a transferência ou sublocação sem autorização.',
    "footer" TEXT NOT NULL DEFAULT 'O senhor firmará as obras das nossas mãos. — Salmos 90:17',

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsible" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Cliente',
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "maintenanceQty" INTEGER NOT NULL DEFAULT 0,
    "priceDaily" DECIMAL(10,3),
    "priceWeekly" DECIMAL(10,3),
    "priceBiweekly" DECIMAL(10,3),
    "priceMonthly" DECIMAL(10,3),
    "countedAt" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "qtyChange" INTEGER NOT NULL,
    "totalAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'ORCAMENTO',
    "customerId" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "expectedEndDate" DATE,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "negotiating" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "quoteToken" TEXT NOT NULL,
    "closedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalItem" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,3) NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'DIARIA',
    "daysOverride" INTEGER,

    CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemReturn" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "chargedDays" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalExtra" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "RentalExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Site_customerId_address_key" ON "Site"("customerId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_name_key" ON "Equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Rental_number_key" ON "Rental"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Rental_quoteToken_key" ON "Rental"("quoteToken");

-- CreateIndex
CREATE INDEX "Rental_stage_idx" ON "Rental"("stage");

-- CreateIndex
CREATE INDEX "Rental_customerId_idx" ON "Rental"("customerId");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReturn" ADD CONSTRAINT "ItemReturn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RentalItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtra" ADD CONSTRAINT "RentalExtra_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;
