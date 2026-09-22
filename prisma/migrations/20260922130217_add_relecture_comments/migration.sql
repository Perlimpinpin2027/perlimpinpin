-- CreateTable
CREATE TABLE "RelectureComment" (
    "id" TEXT NOT NULL,
    "ficheSlug" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sectionLabel" TEXT,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelectureComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelectureComment_ficheSlug_sectionId_idx" ON "RelectureComment"("ficheSlug", "sectionId");
