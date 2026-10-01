import ReactDOM from "react-dom/client"
import "./i18n"
import { applyLanguage } from "./i18n"
import App from "./App"
import ErrorBoundary from "./components/ErrorBoundary"
import { HashRouter } from "react-router-dom"
import { PostHogProvider } from "posthog-js/react"

// Resolve the display language (OS-region aware) and tell the main process
// so the tray menu matches. The i18n import above already initialized the UI.
void applyLanguage()

const rootElement = document.getElementById("root")
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    // <React.StrictMode>
    <PostHogProvider
      apiKey="phc_4vF2nxwQK17nl5wIQ4sT8UJae8iHZmsjGkPxgyQJhZo"
      options={{
        api_host: "https://us.i.posthog.com",
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
      }}
    >
      <HashRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HashRouter>
    </PostHogProvider>,
    // </React.StrictMode>
  )
}
