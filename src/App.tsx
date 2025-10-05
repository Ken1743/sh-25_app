import { useEffect, useMemo, useState, type JSX } from "react";
import Home from "./pages/Test";
import ResultPage from "./pages/Result";

type Route = { path: string; element: JSX.Element };

export default function App() {
  // 現在のハッシュ（#/result など）→ パスへ
  const getPath = () => {
    const h = window.location.hash || "#/";
    return h.startsWith("#") ? h.slice(1) : h; // "#/result" → "/result"
  };

  const [path, setPath] = useState<string>(getPath());

  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener("hashchange", onHashChange);
    // 初回直アクセス対策（リロード時など）
    if (!window.location.hash) {
      window.location.hash = "#/"; // デフォルトは Home
    }
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const routes: Route[] = useMemo(
    () => [
      { path: "/", element: <Home /> },
      { path: "/result", element: <ResultPage /> },
    ],
    []
  );

  const match = routes.find((r) => r.path === path);
  return match ? match.element : <NotFound />;
}

function NotFound() {
  return (
    <div style={{ padding: 16 }}>
      <h1>404</h1>
      <p>Page not found. <a href="#/">Go Home</a></p>
    </div>
  );
}
