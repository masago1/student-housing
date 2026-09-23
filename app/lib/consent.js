export const CONSENT_KEY = "shaus-consent";
export const CONSENT_VERSION = 1;

export function consentChoice(externalServices) {
  return { necessary: true, externalServices: externalServices === true, version: CONSENT_VERSION };
}

export function parseConsent(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== CONSENT_VERSION || value.necessary !== true ||
        typeof value.externalServices !== "boolean") return null;
    return consentChoice(value.externalServices);
  } catch {
    return null;
  }
}
