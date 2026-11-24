-- CreateIndex
CREATE INDEX "ItemReturn_itemId_idx" ON "ItemReturn"("itemId");

-- CreateIndex
CREATE INDEX "Payment_rentalId_idx" ON "Payment"("rentalId");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "RentalExtra_rentalId_idx" ON "RentalExtra"("rentalId");

-- CreateIndex
CREATE INDEX "RentalItem_rentalId_idx" ON "RentalItem"("rentalId");

-- CreateIndex
CREATE INDEX "RentalItem_equipmentId_idx" ON "RentalItem"("equipmentId");

-- CreateIndex
CREATE INDEX "StockEntry_equipmentId_date_idx" ON "StockEntry"("equipmentId", "date");

