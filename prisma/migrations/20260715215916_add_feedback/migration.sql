-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "analyseId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "raison" TEXT,
    "raisonAutre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_analyseId_fkey" FOREIGN KEY ("analyseId") REFERENCES "Analyse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
