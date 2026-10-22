import { APP_SUBTITLE, APP_TITLE } from "./config.ts";

export function App() {
  return (
    <main>
      <h1>{APP_TITLE}</h1>
      <p>{APP_SUBTITLE}</p>
    </main>
  );
}
