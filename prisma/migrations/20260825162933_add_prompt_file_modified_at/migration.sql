-- AlterTable
ALTER TABLE "Analyse" ALTER COLUMN "versionMethodologie" SET DEFAULT '1.0',
ADD COLUMN     "promptFileModifiedAt" TIMESTAMP(3);
