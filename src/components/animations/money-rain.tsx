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
      image: HTMLImageElement;
    }[] = [];

    // Create money bill images
    const billImages = [
      "/placeholder.svg?height=50&width=100",
      "/placeholder.svg?height=50&width=100",
    ];

    // Create 100 bills
    for (let i = 0; i < 100; i++) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = billImages[Math.floor(Math.random() * billImages.length)];

      bills.push({
        x: Math.random() * canvas.width,
        y: -100 - Math.random() * 500, // Start above the canvas
        width: 100,
        height: 50,
        speed: 1 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        image: image,
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
          bill.y = -100;
          bill.x = Math.random() * canvas.width;
        }

        // Draw bill
        ctx.save();
        ctx.translate(bill.x + bill.width / 2, bill.y + bill.height / 2);
        ctx.rotate(bill.rotation);
        ctx.drawImage(
          bill.image,
          -bill.width / 2,
          -bill.height / 2,
          bill.width,
          bill.height
        );
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
    />
  );
}
