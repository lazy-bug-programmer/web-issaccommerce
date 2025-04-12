import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="flex-1 space-y-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Seller Dashboard
        </h2>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Link href="/seller/product" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Product Management
              </CardTitle>
              <Package className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage products</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/seller/shipment" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Shipment Management
              </CardTitle>
              <Truck className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage shipments</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
