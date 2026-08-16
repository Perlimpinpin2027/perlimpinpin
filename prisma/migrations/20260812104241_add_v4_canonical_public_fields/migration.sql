-- AlterTable
ALTER TABLE "Analyse" ADD COLUMN     "analyseCanonique" JSONB,
ADD COLUMN     "contenuPublic" JSONB,
ADD COLUMN     "controleFideliteEditorial" JSONB;
