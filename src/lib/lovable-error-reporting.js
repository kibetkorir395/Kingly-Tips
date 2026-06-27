
  handled?;
  severity?: "error" | "warning" | "info";
};

};

declare global {

}

export function reportLovableError(error, context= {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source,
      route,
      ...context,
    },
    {
      mechanism,
      handled,
      severity,
    },
  );
}
