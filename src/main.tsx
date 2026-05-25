import { StrictMode } from "react";
import ConfigProvider from "antd/es/config-provider";
import BaseProvider from "baseui/helpers/base-provider";
import { LightTheme } from "baseui/themes";
import { createRoot } from "react-dom/client";
import { Client as Styletron } from "styletron-engine-monolithic";
import { Provider as StyletronProvider } from "styletron-react";
import App from "./App";
import "antd/dist/reset.css";
import "./styles/global.css";

const engine = new Styletron();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StyletronProvider value={engine}>
      <BaseProvider theme={LightTheme}>
        <ConfigProvider
          theme={{
            token: {
              borderRadius: 14,
              colorBgContainer: "transparent",
              colorBorder: "var(--line)",
              colorPrimary: "var(--primary)",
              colorText: "var(--text)",
              colorTextHeading: "var(--text)",
              colorTextSecondary: "var(--muted)",
              fontFamily: "var(--app-font)",
            },
            components: {
              Collapse: {
                contentBg: "transparent",
                headerBg: "transparent",
              },
            },
          }}
        >
          <App />
        </ConfigProvider>
      </BaseProvider>
    </StyletronProvider>
  </StrictMode>,
);
