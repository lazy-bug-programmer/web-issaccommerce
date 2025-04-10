"use client";

import { useEffect, useRef } from "react";

type CreditCard = {
  x: number;
  y: number;
  width: number;
  height: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
};

export function CreditCardRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create credit cards
    const cards: CreditCard[] = [];
    const cardCount = 50;
    const colors = ["#5D5FEF", "#EF5DA8", "#5DEFCB", "#EFCF5D", "#A6A6A6"];

    // Create initial cards
    function createCards() {
      if (!canvas) return;

      for (let i = 0; i < cardCount; i++) {
        setTimeout(() => {
          const width = 60 + Math.random() * 20;
          const height = width * 0.63; // Standard credit card ratio
          cards.push({
            x: Math.random() * canvas.width,
            y: -height - Math.random() * 500, // Start above the canvas
            width,
            height,
            speedY: 1 + Math.random() * 3,
            speedX: (Math.random() - 0.5) * 1.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }, i * 100); // Stagger card creation
      }
    }

    // Draw a credit card
    function drawCreditCard(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      rotation: number,
      color: string
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Card body with rounded corners
      ctx.beginPath();
      const radius = 5;
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

      // Fill card
      ctx.fillStyle = color;
      ctx.fill();

      // Add chip
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(-width / 4, -height / 4, width / 5, height / 5);

      // Add magnetic stripe
      ctx.fillStyle = "#333333";
      ctx.fillRect(-width / 2, -height / 6, width, height / 8);

      // Add some card details (simplified)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `${width / 10}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("****  ****  ****  ****", 0, height / 8);
      ctx.fillText("PREMIUM", 0, height / 3);

      ctx.restore();
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
        drawCreditCard(
          ctx,
          card.x,
          card.y,
          card.width,
          card.height,
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
