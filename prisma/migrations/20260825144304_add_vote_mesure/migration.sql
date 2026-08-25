-- CreateTable
CREATE TABLE "VoteMesure" (
    "id" SERIAL NOT NULL,
    "propositionId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteMesure_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoteMesure" ADD CONSTRAINT "VoteMesure_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
