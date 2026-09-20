-- AlterTable
ALTER TABLE "LiveAnalyse" ADD COLUMN     "affirmations" JSONB,
ADD COLUMN     "confiance" TEXT,
ADD COLUMN     "sources" JSONB,
ADD COLUMN     "syntheseChiffrage" TEXT,
ADD COLUMN     "syntheseFaisabilite" TEXT,
ADD COLUMN     "syntheseGlobale" TEXT,
ADD COLUMN     "syntheseImpact" TEXT;
