-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "grantedById" TEXT,
ADD COLUMN     "note" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
