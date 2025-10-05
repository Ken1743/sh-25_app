import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import type { UnityInstance } from "../../types/unity";

const UnityGame = forwardRef<UnityInstance, {}>(function UnityGame(_, ref) {
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const [instance, setInstance] = useState<UnityInstance | null>(null);

useImperativeHandle(ref, () => ({
    SendMessage: (go: string, method: string, value?: string | number | boolean) => {
    if (instance) instance.SendMessage(go, method, value as any);
    else console.warn("[UnityGame] Unity not ready. Skip SendMessage:", { go, method, value });
    },
}), [instance]);

useEffect(() => {
    // TODO: 実際の Unity 初期化に置き換え
    const dummy: UnityInstance = { SendMessage: () => {} };
    setInstance(dummy);
    return () => { /* instance?.Quit?.(); */ };
}, []);

return (
    <div className="unity-container">
    <canvas ref={canvasRef} className="unity-canvas" aria-label="Unity Canvas" />
    </div>
);
});

export default UnityGame;
