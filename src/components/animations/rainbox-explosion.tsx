"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  gravity: number;
  life: number;
  maxLife: number;
};

export function RainbowExplosion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const particles: Particle[] = [];
    const colors = [
      "#FF0000", // Red
      "#FF7F00", // Orange
      "#FFFF00", // Yellow
      "#00FF00", // Green
      "#0000FF", // Blue
      "#4B0082", // Indigo
      "#9400D3", // Violet
    ];

    // Create initial explosion
    function createExplosion(x: number, y: number, particleCount: number) {
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 2;
        const size = Math.random() * 10 + 5;
        const life = Math.random() * 100 + 50;

        particles.push({
          x,
          y,
          size,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          gravity: 0.1,
          life,
          maxLife: life,
        });
      }
    }

    // Create multiple explosions
    function createMultipleExplosions() {
      if (!canvas) return;

      const explosionCount = 5;
      const delay = 300;

      for (let i = 0; i < explosionCount; i++) {
        setTimeout(() => {
          const x = Math.random() * canvas.width;
          const y = Math.random() * (canvas.height * 0.7);
          createExplosion(x, y, 100);
        }, i * delay);
      }
    }

    // Create initial explosions
    createExplosion(canvas.width / 2, canvas.height / 2, 200);
    setTimeout(() => createMultipleExplosions(), 1000);

    // Animation loop
    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;

      // Clear with fade effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += p.gravity;
        p.life--;

        // Calculate opacity based on life
        const opacity = p.life / p.maxLife;

        // Draw particle
        if (p.life > 0) {
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * opacity, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Remove dead particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Create new explosions if all particles are gone
      if (particles.length === 0) {
        createMultipleExplosions();
      }

      animationId = requestAnimationFrame(animate);
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

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-shadow">
          Amazing Achievement!
        </h2>
        <p className="text-xl text-white text-shadow">
          You&apos;ve unlocked a special reward!
        </p>
      </div>
    </div>
  );
}
