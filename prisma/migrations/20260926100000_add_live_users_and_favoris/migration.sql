-- Comptes individuels /live : additif uniquement (aucune colonne ni table existante n'est supprimée ou modifiée,
-- hors ajout de LiveAnalyse.auteurId, nullable).

-- CreateTable
CREATE TABLE "LiveUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveFavori" (
    "userId" INTEGER NOT NULL,
    "analyseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveFavori_pkey" PRIMARY KEY ("userId","analyseId")
);

-- AlterTable
ALTER TABLE "LiveAnalyse" ADD COLUMN "auteurId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "LiveUser_email_key" ON "LiveUser"("email");

-- CreateIndex
CREATE INDEX "LiveFavori_analyseId_idx" ON "LiveFavori"("analyseId");

-- CreateIndex
CREATE INDEX "LiveAnalyse_auteurId_createdAt_idx" ON "LiveAnalyse"("auteurId", "createdAt");

-- AddForeignKey
ALTER TABLE "LiveAnalyse" ADD CONSTRAINT "LiveAnalyse_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "LiveUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveFavori" ADD CONSTRAINT "LiveFavori_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LiveUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveFavori" ADD CONSTRAINT "LiveFavori_analyseId_fkey" FOREIGN KEY ("analyseId") REFERENCES "LiveAnalyse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
