import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./lib/AuthContext";
import { AppToaster } from "./components/AppToaster";
import { ErrorBoundary } from "./components/ErrorBoundary";

/* CapstonePH entry */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppToaster />
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}