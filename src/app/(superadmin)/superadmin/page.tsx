import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, DollarSign, Gift, Package, Settings } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="flex-1 space-y-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h2>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Link href="/superadmin/referral_code" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Referral Management
              </CardTitle>
              <Gift className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create and manage referral codes, track conversions, and analyze
                referral program performance.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/seller" className="block h-full">
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

        <Link href="/superadmin/seller_withdrawal" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Withdrawal Management
              </CardTitle>
              <DollarSign className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage withdrawal requests.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/product" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Product Management
              </CardTitle>
              <Package className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage products, review listings, and handle product-related
                operations.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/task_settings" className="block h-full">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Task Settings
              </CardTitle>
              <Settings className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure and manage task-related settings and parameters.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
