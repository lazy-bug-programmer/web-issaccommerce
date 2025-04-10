"use client";

import { useEffect, useRef } from "react";

type GiftCard = {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
};

export function GiftCards() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create gift cards
    const cards: GiftCard[] = [];
    const cardCount = 50;
    const colors = [
      "#FF5252",
      "#FF9800",
      "#4CAF50",
      "#2196F3",
      "#9C27B0",
      "#F44336",
    ];
    const values = ["$10", "$25", "$50", "$100", "$200", "VIP"];

    // Create initial cards
    function createCards() {
      if (!canvas) return;

      for (let i = 0; i < cardCount; i++) {
        setTimeout(() => {
          const width = 80 + Math.random() * 40;
          const height = width * 0.6;
          cards.push({
            x: Math.random() * canvas.width,
            y: -height - Math.random() * 500, // Start above the canvas
            width,
            height,
            value: values[Math.floor(Math.random() * values.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: 1 + Math.random() * 3,
            speedX: (Math.random() - 0.5) * 1.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
          });
        }, i * 80); // Stagger card creation
      }
    }

    // Draw a gift card
    function drawGiftCard(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      value: string,
      rotation: number,
      color: string
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Card body with rounded corners
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(-width / 2 + radius, -height / 2);
      ctx.lineTo(width / 2 - radius, -height / 2);
      ctx.arcTo(
        width / 2,
        -height / 2,
        width / 2,
        -height / 2 + radius,
        radius
      );
      ctx.lineTo(width / 2, height / 2 - radius);
      ctx.arcTo(width / 2, height / 2, width / 2 - radius, height / 2, radius);
      ctx.lineTo(-width / 2 + radius, height / 2);
      ctx.arcTo(
        -width / 2,
        height / 2,
        -width / 2,
        height / 2 - radius,
        radius
      );
      ctx.lineTo(-width / 2, -height / 2 + radius);
      ctx.arcTo(
        -width / 2,
        -height / 2,
        -width / 2 + radius,
        -height / 2,
        radius
      );
      ctx.closePath();

      // Create gradient fill
      const gradient = ctx.createLinearGradient(
        -width / 2,
        -height / 2,
        width / 2,
        height / 2
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color));
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add border
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add gift card text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${height / 3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(value, 0, 0);

      // Add "GIFT CARD" text
      ctx.font = `${height / 6}px Arial`;
      ctx.fillText("GIFT CARD", 0, height / 4);

      // Add decorative elements
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 10, -height / 4);
      ctx.lineTo(width / 2 - 10, -height / 4);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Helper function to adjust color brightness
    function adjustColor(color: string): string {
      return color;
    }

    createCards();

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw cards
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        // Update position
        card.y += card.speedY;
        card.x += card.speedX;
        card.rotation += card.rotationSpeed;

        // Draw card
        drawGiftCard(
          ctx,
          card.x,
          card.y,
          card.width,
          card.height,
          card.value,
          card.rotation,
          card.color
        );

        // Reset if below canvas
        if (card.y > canvas.height + card.height) {
          card.y = -card.height;
          card.x = Math.random() * canvas.width;
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
