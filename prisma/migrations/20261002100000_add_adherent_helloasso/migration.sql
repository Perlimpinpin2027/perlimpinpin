-- AlterTable
ALTER TABLE "Adherent" ADD COLUMN     "helloassoOrderId" INTEGER,
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Adherent_helloassoOrderId_key" ON "Adherent"("helloassoOrderId");
