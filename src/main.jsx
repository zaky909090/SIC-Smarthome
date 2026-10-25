import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/styles/index.css";
import App from "@/App.jsx";
import { IotProvider } from "@/context/IotProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <IotProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IotProvider>
  </StrictMode>,
);
