-- CreateTable
CREATE TABLE "MessageContact" (
    "id" SERIAL NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageContact_pkey" PRIMARY KEY ("id")
);
