-- AlterTable
ALTER TABLE "Adherent" ADD COLUMN     "pseudo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Adherent_pseudo_key" ON "Adherent"("pseudo");
