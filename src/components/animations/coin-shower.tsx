"use client";

import { useEffect, useRef } from "react";

type Coin = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
};

export function CoinShower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create coins
    const coins: Coin[] = [];
    const coinCount = 100;

    // Load coin image
    const coinImage = new Image();
    coinImage.crossOrigin = "anonymous";
    coinImage.src = "/coin.png"; // Replace with actual coin image

    // Create initial coins
    function createCoins() {
      if (!canvas) return;

      for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
          const size = 20 + Math.random() * 30;
          coins.push({
            x: Math.random() * canvas.width,
            y: -size - Math.random() * 500, // Start above the canvas
            size,
            speedY: 2 + Math.random() * 5,
            speedX: (Math.random() - 0.5) * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
          });
        }, i * 50); // Stagger coin creation
      }
    }

    // Wait for image to load
    coinImage.onload = () => {
      createCoins();
      animate();
    };

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw coins
      for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];

        // Update position
        coin.y += coin.speedY;
        coin.x += coin.speedX;
        coin.rotation += coin.rotationSpeed;

        // Draw coin
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(coin.rotation);

        // Draw gold coin (circle with $ symbol)
        if (!coinImage.complete) {
          ctx.beginPath();
          ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = "#FFD700";
          ctx.fill();
          ctx.strokeStyle = "#FFA000";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw $ symbol
          ctx.fillStyle = "#FFA000";
          ctx.font = `${coin.size * 0.6}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("$", 0, 0);
        } else {
          ctx.drawImage(
            coinImage,
            -coin.size / 2,
            -coin.size / 2,
            coin.size,
            coin.size
          );
        }

        ctx.restore();

        // Reset if below canvas
        if (coin.y > canvas.height + coin.size) {
          coin.y = -coin.size;
          coin.x = Math.random() * canvas.width;
        }
      }

      requestAnimationFrame(animate);
    }

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
