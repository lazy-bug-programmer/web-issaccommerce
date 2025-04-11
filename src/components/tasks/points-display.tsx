"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PointsDisplay() {
  const [points, setPoints] = useState(0);

  // Load points from localStorage on component mount
  useEffect(() => {
    const storedPoints = localStorage.getItem("taskPoints");
    if (storedPoints) {
      setPoints(parseInt(storedPoints));
    }
  }, []);

  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">🏆 Points: {points}</div>
          </div>
          <Link
            href="/task"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            View Tasks
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
