/*
  Warnings:

  - You are about to drop the column `district_code` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `district_name` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_district_name` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "district_code",
DROP COLUMN "district_name";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shipping_district_name";

-- CreateTable
CREATE TABLE "Province" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Ward" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province_code" TEXT NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "Ward_province_code_idx" ON "Ward"("province_code");

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "Province"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
