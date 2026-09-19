-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'FUEL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'TICKET';
ALTER TYPE "ExpenseCategory" ADD VALUE 'RENTAL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'ENTRANCE_FEE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'TOLLWAY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'SERVICE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'COMMON_FUND';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SplitType" ADD VALUE 'ITEMIZED';
ALTER TYPE "SplitType" ADD VALUE 'HYBRID';

-- AlterTable
ALTER TABLE "expense_items" ADD COLUMN     "is_shared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "discount_amount" DECIMAL(12,2),
ADD COLUMN     "service_charge_amount" DECIMAL(12,2),
ADD COLUMN     "service_charge_percentage" DECIMAL(5,2),
ADD COLUMN     "subtotal_amount" DECIMAL(12,2),
ADD COLUMN     "vat_amount" DECIMAL(12,2),
ADD COLUMN     "vat_percentage" DECIMAL(5,2),
ALTER COLUMN "category" SET DEFAULT 'FOOD';

-- CreateIndex
CREATE INDEX "idx_expenses_category" ON "expenses"("category");
