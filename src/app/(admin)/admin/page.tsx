import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Package, Truck } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="flex-1 space-y-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h2>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Link href="/admin/shipment_automation" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Shipment Automation
              </CardTitle>
              <Truck className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set up and manage automated shipments, delivery workflows, and
                tracking operations.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/product" className="block h-full">
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

        <Link href="/admin/seller" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Seller Management
              </CardTitle>
              <Users className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage seller accounts, view seller statistics, and handle
                seller-related operations.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
