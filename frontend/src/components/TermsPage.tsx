import { Fragment } from 'react';
import LegalInfoPageShell from './LegalInfoPageShell';
import { useTranslation } from '../i18n';
import { TERMS_SECTION_COUNT } from '../i18n/translations/legalTermsAndPrivacyEn';

interface TermsPageProps {
  onClose?: () => void;
}


function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default function TermsPage({ onClose }: TermsPageProps) {
  const { t } = useTranslation();

  return (
    <LegalInfoPageShell
      titleKey="terms.header"
      onClose={onClose}
      preamble={
        <p className="text-xs text-white/50 leading-relaxed">{t('terms.lastUpdated')}</p>
      }
    >
      {Array.from({ length: TERMS_SECTION_COUNT }, (_, i) => {
        const n = pad2(i + 1);
        const titleKey = `terms.s${n}Title`;
        const bodyKey = `terms.s${n}Body`;
        return (
          <Fragment key={n}>
            {i > 0 ? <div className="h-px w-full bg-white/30 shrink-0" /> : null}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">
                {t(titleKey)}
              </h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {t(bodyKey)}
              </p>
            </section>
          </Fragment>
        );
      })}
    </LegalInfoPageShell>
  );
}
