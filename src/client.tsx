import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";
import { getObservabilityService } from "./shared/observability";

const observability = getObservabilityService();

hydrateRoot(document, <StartClient />, {
  onUncaughtError(error, errorInfo) {
    observability.captureReactError(error, errorInfo);
  },
  onCaughtError(error, errorInfo) {
    observability.captureReactError(error, errorInfo);
  },
  onRecoverableError(error, errorInfo) {
    observability.captureReactError(error, errorInfo);
  },
});
