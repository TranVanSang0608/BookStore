-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shipping_distance_km" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ShippingZone" ADD COLUMN     "distance_km" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ShippingConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "warehouse_lat" DOUBLE PRECISION NOT NULL,
    "warehouse_lng" DOUBLE PRECISION NOT NULL,
    "base_fee" INTEGER NOT NULL,
    "per_km_fee" INTEGER NOT NULL,
    "free_km" INTEGER NOT NULL,
    "free_threshold" INTEGER,
    "max_fee" INTEGER,
    "road_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingConfig_pkey" PRIMARY KEY ("id")
);
