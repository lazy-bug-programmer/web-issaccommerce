import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

const products = [
  {
    id: "1",
    name: "Premium T-Shirt",
    description: "High-quality cotton t-shirt",
    price: "29.99",
    stock: "100",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "2",
    name: "Designer Jeans",
    description: "Stylish jeans for any occasion",
    price: "59.99",
    stock: "50",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "3",
    name: "Leather Wallet",
    description: "Genuine leather wallet with multiple compartments",
    price: "39.99",
    stock: "75",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "4",
    name: "Wireless Headphones",
    description: "Premium sound quality with noise cancellation",
    price: "129.99",
    stock: "30",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "5",
    name: "Smart Watch",
    description: "Track your fitness and stay connected",
    price: "199.99",
    stock: "25",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "6",
    name: "Backpack",
    description: "Durable backpack with multiple compartments",
    price: "49.99",
    stock: "60",
    image: "/placeholder.svg?height=200&width=200",
  },
];

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to our E-commerce Platform
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover amazing products from our sellers
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden flex flex-col h-full"
          >
            <div className="aspect-square w-full">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold">${product.price}</p>
                <p className="text-sm text-muted-foreground">
                  In stock: {product.stock}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/login">View Details</Link>
              </Button>
              <Button className="w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </main>
  );
}
