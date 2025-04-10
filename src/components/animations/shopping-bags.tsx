"use client";

import { useEffect, useRef } from "react";

type ShoppingBag = {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
};

export function ShoppingBags() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create shopping bags
    const bags: ShoppingBag[] = [];
    const bagCount = 40;
    const colors = ["#FF5252", "#FF9800", "#4CAF50", "#2196F3", "#9C27B0"];

    // Create initial bags
    function createBags() {
      if (!canvas) return;

      for (let i = 0; i < bagCount; i++) {
        setTimeout(() => {
          const size = 40 + Math.random() * 40;
          bags.push({
            x: Math.random() * canvas.width,
            y: canvas.height + size, // Start below the canvas
            size,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: -(1 + Math.random() * 3), // Negative for upward movement
            speedX: (Math.random() - 0.5) * 1.5,
            rotation: Math.random() * Math.PI * 0.2 - Math.PI * 0.1, // Slight tilt
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            opacity: 0.8 + Math.random() * 0.2,
          });
        }, i * 100); // Stagger bag creation
      }
    }

    // Draw a shopping bag
    function drawShoppingBag(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;

      // Bag body
      ctx.beginPath();
      ctx.rect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = color;
      ctx.fill();

      // Bag handles
      const handleWidth = size / 5;
      const handleHeight = size / 2;
      const handleY = -size / 2 - handleHeight / 2;

      // Left handle
      ctx.beginPath();
      ctx.moveTo(-size / 4 - handleWidth / 2, -size / 2);
      ctx.quadraticCurveTo(
        -size / 4 - handleWidth,
        handleY,
        -size / 4,
        handleY
      );
      ctx.quadraticCurveTo(
        -size / 4 + handleWidth,
        handleY,
        -size / 4 + handleWidth / 2,
        -size / 2
      );
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Right handle
      ctx.beginPath();
      ctx.moveTo(size / 4 - handleWidth / 2, -size / 2);
      ctx.quadraticCurveTo(size / 4 - handleWidth, handleY, size / 4, handleY);
      ctx.quadraticCurveTo(
        size / 4 + handleWidth,
        handleY,
        size / 4 + handleWidth / 2,
        -size / 2
      );
      ctx.stroke();

      // Bag logo or text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${size / 5}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SHOP", 0, 0);

      ctx.restore();
    }

    createBags();

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw bags
      for (let i = 0; i < bags.length; i++) {
        const bag = bags[i];

        // Update position
        bag.y += bag.speedY;
        bag.x += bag.speedX;
        bag.rotation += bag.rotationSpeed;

        // Slow down as they rise
        bag.speedY *= 0.995;

        // Draw bag
        drawShoppingBag(
          ctx,
          bag.x,
          bag.y,
          bag.size,
          bag.rotation,
          bag.color,
          bag.opacity
        );

        // Reset if above canvas
        if (bag.y < -bag.size * 2) {
          bag.y = canvas.height + bag.size;
          bag.x = Math.random() * canvas.width;
          bag.speedY = -(1 + Math.random() * 3);
        }
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
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
    </div>
  );
}
