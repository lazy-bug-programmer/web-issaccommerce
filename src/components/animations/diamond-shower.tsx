"use client";

import { useEffect, useRef } from "react";

type Diamond = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
};

export function DiamondShower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create diamonds
    const diamonds: Diamond[] = [];
    const diamondCount = 100;
    const colors = [
      "#A5F2F3", // Light blue
      "#DEF8F9", // Very light blue
      "#A1EAFB", // Sky blue
      "#D1F4FF", // Pale blue
      "#FFFFFF", // White
      "#E0F7FA", // Ice blue
      "#84FFFF", // Cyan
      "#18FFFF", // Bright cyan
    ];

    // Create initial diamonds
    function createDiamonds() {
      if (!canvas) return;

      for (let i = 0; i < diamondCount; i++) {
        setTimeout(() => {
          const size = 30 + Math.random() * 50;
          diamonds.push({
            x: Math.random() * canvas.width,
            y: -size - Math.random() * 500,
            size,
            speedY: 1 + Math.random() * 4,
            speedX: (Math.random() - 0.5) * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            opacity: 0.7 + Math.random() * 0.3,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }, i * 50);
      }
    }

    // Draw a more realistic diamond shape
    function drawDiamond(
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

      // Draw diamond crown (top part)
      const crown = size * 0.6;

      // Main diamond outline
      ctx.beginPath();
      // Top point
      ctx.moveTo(0, -crown);
      // Upper right facet
      ctx.lineTo(size * 0.3, -crown * 0.3);
      // Right point
      ctx.lineTo(size * 0.5, 0);
      // Lower right facet
      ctx.lineTo(size * 0.3, crown * 0.3);
      // Bottom point
      ctx.lineTo(0, size * 0.5);
      // Lower left facet
      ctx.lineTo(-size * 0.3, crown * 0.3);
      // Left point
      ctx.lineTo(-size * 0.5, 0);
      // Upper left facet
      ctx.lineTo(-size * 0.3, -crown * 0.3);
      ctx.closePath();

      // Create complex gradient to simulate light refraction
      const gradient = ctx.createLinearGradient(
        -size * 0.5,
        -crown,
        size * 0.5,
        size * 0.5
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.3, "#FFFFFF");
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(0.7, "#FFFFFF");
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add outer highlight for better definition
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add inner facets for more realism
      ctx.beginPath();
      ctx.moveTo(0, -crown * 0.6);
      ctx.lineTo(size * 0.15, 0);
      ctx.lineTo(0, crown * 0.6);
      ctx.lineTo(-size * 0.15, 0);
      ctx.closePath();

      // Create radial gradient for the inner facets
      const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
      innerGradient.addColorStop(0, "#FFFFFF");
      innerGradient.addColorStop(1, "rgba(255,255,255,0.2)");

      ctx.fillStyle = innerGradient;
      ctx.globalAlpha = 0.8 * opacity;
      ctx.fill();

      // Add sparkle effect
      const sparkleSize = size * 0.1;
      ctx.fillStyle = "#FFFFFF";
      ctx.globalAlpha = opacity;

      // Draw small sparkles at corners
      ctx.beginPath();
      ctx.arc(0, -crown, sparkleSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(size * 0.4, 0, sparkleSize * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    createDiamonds();

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw diamonds
      for (let i = 0; i < diamonds.length; i++) {
        const diamond = diamonds[i];

        // Update position
        diamond.y += diamond.speedY;
        diamond.x += diamond.speedX;
        diamond.rotation += diamond.rotationSpeed;

        // Draw diamond
        drawDiamond(
          ctx,
          diamond.x,
          diamond.y,
          diamond.size,
          diamond.rotation,
          diamond.color,
          diamond.opacity
        );

        // Reset if below canvas
        if (diamond.y > canvas.height + diamond.size) {
          diamond.y = -diamond.size;
          diamond.x = Math.random() * canvas.width;
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
