-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Candidat" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "parti" TEXT NOT NULL,
    "photoUrl" TEXT,
    "scoreMoyen" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposition" (
    "id" SERIAL NOT NULL,
    "texteOriginal" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "dateDeclaration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidatId" INTEGER NOT NULL,

    CONSTRAINT "Proposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analyse" (
    "id" SERIAL NOT NULL,
    "propositionId" INTEGER NOT NULL,
    "scoreFaisabilite" INTEGER NOT NULL,
    "scoreSolidite" INTEGER NOT NULL,
    "scoreJuridique" INTEGER NOT NULL,
    "scoreOperationnel" INTEGER NOT NULL,
    "scoreBudgetaire" INTEGER NOT NULL,
    "scorePertinence" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "cequiEstEtabli" TEXT NOT NULL,
    "cequiEstProbable" TEXT NOT NULL,
    "cequiEstDiscutable" TEXT NOT NULL,
    "cequiEstInconnu" TEXT NOT NULL,
    "sourcesUtilisees" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "versionMethodologie" TEXT NOT NULL DEFAULT 'v1.0',
    "contenuComplet" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analyse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidat_nom_key" ON "Candidat"("nom");

-- AddForeignKey
ALTER TABLE "Proposition" ADD CONSTRAINT "Proposition_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analyse" ADD CONSTRAINT "Analyse_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

