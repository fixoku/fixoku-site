import { useEffect, useState } from "react";

export default function FlyingBee() {
  const [position, setPosition] = useState({ x: 80, y: 50 });
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const moveBee = () => {
      setPosition((prev) => {
        let newX = prev.x + (Math.random() * 10 - 5);
        let newY = prev.y + (Math.random() * 10 - 5);

        newX = Math.max(0, Math.min(90, newX));
        newY = Math.max(10, Math.min(90, newY));

        return { x: newX, y: newY };
      });

      setDirection(Math.random() > 0.5 ? 1 : -1);
    };

    const interval = setInterval(moveBee, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src="/panelari.png"
      alt="Arı"
      className="flying-bee"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `scaleX(${direction})`,
      }}
    />
  );
}
