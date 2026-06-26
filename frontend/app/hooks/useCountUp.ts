import { useEffect, useState } from "react";

interface UseCountUpProps {
    end: number;
    decimals?: number;
    duration?: number;
    delay?: number;
}

export function useCountUp({ end, decimals = 0, duration = 1000, delay = 0 }: UseCountUpProps): string {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const startTime = Date.now();
            const timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentCount = end * easeOut;

                setCount(currentCount);

                if (progress >= 1) {
                    clearInterval(timer);
                }
            }, 16); // ~60fps

            return () => clearInterval(timer);
        }, delay);

        return () => clearTimeout(timeout);
    }, [end, duration, delay]);

    return count.toFixed(decimals);
}
