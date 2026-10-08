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

/**
 * True when the Terms or Privacy Policy changed after this device last recorded a version.
 * A device with no recorded version (first visit, or signed in before versions were tracked)
 * just records the current one: there is nothing it agreed to that has since changed.
 */
export function hasUnseenLegalUpdate(): boolean {
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === null) {
      localStorage.setItem(KEY, LEGAL_VERSION);
      return false;
    }
    return seen !== LEGAL_VERSION;
  } catch {
    return false;
  }
}
