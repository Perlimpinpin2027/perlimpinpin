-- AlterTable
ALTER TABLE "RelectureComment" ADD COLUMN     "adherentId" INTEGER;

-- CreateIndex
CREATE INDEX "RelectureComment_adherentId_idx" ON "RelectureComment"("adherentId");

-- AddForeignKey
ALTER TABLE "RelectureComment" ADD CONSTRAINT "RelectureComment_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

