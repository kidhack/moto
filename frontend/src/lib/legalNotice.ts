import { LEGAL_VERSION } from '../i18n/translations/legalTermsAndPrivacyEn';

const KEY = 'moto_legal_version_seen';

/** Record that the user has been shown the current Terms and Privacy Policy. */
export function markLegalSeen(): void {
  try {
    localStorage.setItem(KEY, LEGAL_VERSION);
  } catch {
    /* storage unavailable */
  }
}

/** True when the Terms or Privacy Policy changed since this device last showed them. */
export function hasUnseenLegalUpdate(): boolean {
  try {
    return localStorage.getItem(KEY) !== LEGAL_VERSION;
  } catch {
    return false;
  }
}
