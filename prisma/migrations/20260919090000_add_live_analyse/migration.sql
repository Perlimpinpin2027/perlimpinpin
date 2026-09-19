-- CreateTable
CREATE TABLE "LiveAnalyse" (
    "id" SERIAL NOT NULL,
    "declaration" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "nbMesures" INTEGER NOT NULL,
    "resultat" JSONB NOT NULL,
    "candidatId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAnalyse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveAnalyse_createdAt_idx" ON "LiveAnalyse"("createdAt");

-- AddForeignKey
ALTER TABLE "LiveAnalyse" ADD CONSTRAINT "LiveAnalyse_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
