"use client";

import { useEffect, useRef } from "react";

type Balloon = {
  x: number;
  y: number;
  radius: number;
  color: string;
  speedX: number;
  speedY: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  stringLength: number;
};

export function BalloonRelease() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create balloons
    const balloons: Balloon[] = [];
    const colors = [
      "#FF5252",
      "#FFD740",
      "#64FFDA",
      "#448AFF",
      "#E040FB",
      "#69F0AE",
    ];
    const balloonCount = 30;

    for (let i = 0; i < balloonCount; i++) {
      const radius = 20 + Math.random() * 30;
      balloons.push({
        x: Math.random() * canvas.width,
        y: canvas.height + radius + Math.random() * 200, // Start below the screen
        radius,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: -1 - Math.random() * 1.5,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        wobbleAmount: 2 + Math.random() * 3,
        wobbleOffset: Math.random() * Math.PI * 2,
        stringLength: 50 + Math.random() * 50,
      });
    }

    // Animation loop
    let animationId: number;
    let time = 0;

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // Update and draw balloons
      for (let i = 0; i < balloons.length; i++) {
        const balloon = balloons[i];

        // Update position
        balloon.y += balloon.speedY;
        balloon.x +=
          balloon.speedX +
          Math.sin(time * balloon.wobbleSpeed + balloon.wobbleOffset) *
            balloon.wobbleAmount;

        // Draw balloon
        ctx.beginPath();
        ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
        ctx.fillStyle = balloon.color;
        ctx.fill();

        // Draw balloon highlight
        ctx.beginPath();
        ctx.arc(
          balloon.x - balloon.radius * 0.3,
          balloon.y - balloon.radius * 0.3,
          balloon.radius * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // Draw balloon knot
        ctx.beginPath();
        ctx.arc(balloon.x, balloon.y + balloon.radius, 3, 0, Math.PI * 2);
        ctx.fillStyle = balloon.color;
        ctx.fill();

        // Draw string
        ctx.beginPath();
        ctx.moveTo(balloon.x, balloon.y + balloon.radius + 3);
        ctx.lineTo(
          balloon.x +
            Math.sin(time * balloon.wobbleSpeed + balloon.wobbleOffset) * 5,
          balloon.y + balloon.radius + balloon.stringLength
        );
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Continue animation if balloons are still visible
      if (
        balloons.some(
          (balloon) => balloon.y + balloon.radius + balloon.stringLength > 0
        )
      ) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
}
