-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'EXACT');

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "split_type" "SplitType" NOT NULL DEFAULT 'EQUAL';
