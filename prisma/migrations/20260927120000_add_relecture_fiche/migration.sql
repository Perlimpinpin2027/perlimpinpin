-- CreateTable
CREATE TABLE "RelectureFiche" (
    "id" TEXT NOT NULL,
    "ficheSlug" TEXT NOT NULL,
    "reviewStartedAt" TIMESTAMP(3),
    "reviewDeadline" TIMESTAMP(3),

    CONSTRAINT "RelectureFiche_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelectureFiche_ficheSlug_key" ON "RelectureFiche"("ficheSlug");
