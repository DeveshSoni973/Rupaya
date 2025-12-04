/*
  Warnings:

  - Added the required column `paid_by` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "paid_by" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "Bill_paid_by_idx" ON "Bill"("paid_by");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
