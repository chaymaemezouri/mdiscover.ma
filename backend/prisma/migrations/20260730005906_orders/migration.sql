-- CreateEnum
CREATE TYPE "OrderDocumentType" AS ENUM ('INVOICE', 'DELIVERY_NOTE', 'PROFORMA', 'RECEIPT', 'CREDIT_NOTE', 'PURCHASE_ORDER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "admin_note" TEXT,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "carrier_name" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "shipped_at" TIMESTAMP(3),
ADD COLUMN     "tracking_number" TEXT;

-- CreateTable
CREATE TABLE "order_documents" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "OrderDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'FR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_documents_order_id_idx" ON "order_documents"("order_id");

-- CreateIndex
CREATE INDEX "order_documents_type_idx" ON "order_documents"("type");

-- AddForeignKey
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
