"use client";

import { useEffect, useRef } from "react";

export function MoneyRainAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Money bills
    const bills: {
      x: number;
      y: number;
      width: number;
      height: number;
      speed: number;
      rotation: number;
      rotationSpeed: number;
      color: string;
      value: string;
    }[] = [];

    // Money colors with high visibility
    const moneyColors = [
      "#85bb65", // Dollar green
      "#118C4F", // Darker green
      "#66a359", // Money green
      "#D4AF37", // Gold/yellow for coins
    ];

    // Dollar denominations
    const denominations = ["$", "$$", "$$$"];

    // Create 150 bills for better visual density
    const totalBills = 150;
    for (let i = 0; i < totalBills; i++) {
      // Randomize bill size for variety
      const width = 60 + Math.random() * 60; // 60-120px width
      const height = width * 0.45; // maintain aspect ratio

      bills.push({
        x: Math.random() * canvas.width,
        y: -100 - Math.random() * 1000, // Stagger starting positions more
        width: width,
        height: height,
        speed: 2 + Math.random() * 8, // Faster motion
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        color: moneyColors[Math.floor(Math.random() * moneyColors.length)],
        value: denominations[Math.floor(Math.random() * denominations.length)],
      });
    }

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw bills
      for (let i = 0; i < bills.length; i++) {
        const bill = bills[i];

        // Update position
        bill.y += bill.speed;
        bill.rotation += bill.rotationSpeed;

        // Reset if below canvas
        if (bill.y > canvas.height + 100) {
          bill.y = -100 - Math.random() * 200;
          bill.x = Math.random() * canvas.width;
        }

        // Draw bill
        ctx.save();
        ctx.translate(bill.x + bill.width / 2, bill.y + bill.height / 2);
        ctx.rotate(bill.rotation);

        // Draw a colored rectangle as money
        ctx.fillStyle = bill.color;
        ctx.fillRect(
          -bill.width / 2,
          -bill.height / 2,
          bill.width,
          bill.height
        );

        // Add border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          -bill.width / 2 + 4,
          -bill.height / 2 + 4,
          bill.width - 8,
          bill.height - 8
        );

        // Add dollar sign
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `${bill.height * 0.6}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bill.value, 0, 0);

        ctx.restore();
      }

      requestAnimationFrame(animate);
    }

    animate();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ background: "transparent" }}
      data-testid="money-rain-canvas"
    />
  );
}
