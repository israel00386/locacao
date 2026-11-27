CREATE TABLE "RentalPeriod" (
 "id" TEXT NOT NULL,
 "rentalId" TEXT NOT NULL,
 "sequence" INTEGER NOT NULL,
 "startDate" DATE NOT NULL,
 "endDate" DATE NOT NULL,
 "dueDate" DATE NOT NULL,
 "amount" DECIMAL(12,2) NOT NULL,
 "items" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RentalPeriod_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RentalPeriod_dates_check" CHECK ("endDate" >= "startDate"),
 CONSTRAINT "RentalPeriod_amount_check" CHECK ("amount" >= 0),
 CONSTRAINT "RentalPeriod_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RentalPeriod_rentalId_sequence_key" ON "RentalPeriod"("rentalId", "sequence");
