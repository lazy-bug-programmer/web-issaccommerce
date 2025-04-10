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
  opacity: number;
  opacitySpeed: number;
};

type Firework = {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  color: string;
  particles: Particle[];
  exploded: boolean;
};

export function FireworksDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create fireworks
    const fireworks: Firework[] = [];
    const colors = ["#FF5252", "#FFD740", "#64FFDA", "#448AFF", "#E040FB"];

    // Create initial fireworks
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        createFirework();
      }, i * 500);
    }

    function createFirework() {
      if (!canvas) return;

      const x = Math.random() * canvas.width;
      const y = canvas.height;
      const targetY =
        canvas.height * 0.2 + Math.random() * (canvas.height * 0.5);

      fireworks.push({
        x,
        y,
        targetY,
        speed: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        particles: [],
        exploded: false,
      });
    }

    function explodeFirework(firework: Firework) {
      const particleCount = 100 + Math.floor(Math.random() * 50);

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;

        firework.particles.push({
          x: firework.x,
          y: firework.y,
          size: Math.random() * 3 + 1,
          color: firework.color,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          gravity: 0.05 + Math.random() * 0.03,
          opacity: 1,
          opacitySpeed: 0.01 + Math.random() * 0.01,
        });
      }

      firework.exploded = true;
    }

    // Animation loop
    let animationId: number;
    let lastFireworkTime = 0;

    function animate(timestamp: number) {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create new fireworks periodically
      if (timestamp - lastFireworkTime > 800) {
        createFirework();
        lastFireworkTime = timestamp;
      }

      // Update and draw fireworks
      for (let i = 0; i < fireworks.length; i++) {
        const fw = fireworks[i];

        if (!fw.exploded) {
          // Move firework up
          fw.y -= fw.speed;

          // Draw firework
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.fill();

          // Check if firework should explode
          if (fw.y <= fw.targetY) {
            explodeFirework(fw);
          }
        } else {
          // Update and draw particles
          for (let j = 0; j < fw.particles.length; j++) {
            const p = fw.particles[j];

            // Update position
            p.x += p.speedX;
            p.y += p.speedY;
            p.speedY += p.gravity;
            p.opacity -= p.opacitySpeed;

            // Draw particle
            if (p.opacity > 0) {
              ctx.globalAlpha = p.opacity;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // Remove fireworks with no visible particles
      fireworks.forEach((fw, index) => {
        if (fw.exploded && fw.particles.every((p) => p.opacity <= 0)) {
          fireworks.splice(index, 1);
        }
      });

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

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
}
