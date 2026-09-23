export function getCameraErrorMessage(error: unknown): string {
  const errorName =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: string }).name)
      : "";

  switch (errorName) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur pour ce site.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Aucune caméra n'a été détectée sur cet appareil.";
    case "NotReadableError":
    case "AbortError":
      return "Impossible d'accéder à la caméra. Fermez les autres applications qui l'utilisent.";
    case "OverconstrainedError":
      return "La caméra ne prend pas en charge la qualité demandée.";
    case "SecurityError":
      return "L'accès à la caméra est bloqué. Ouvrez Kodeks depuis une adresse HTTPS.";
    default:
      return "Impossible d'ouvrir la caméra. Vérifiez les permissions du navigateur.";
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
