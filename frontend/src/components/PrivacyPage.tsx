import { Fragment } from 'react';
import LegalInfoPageShell from './LegalInfoPageShell';
import { useTranslation } from '../i18n';

interface PrivacyPageProps {
  onClose?: () => void;
}

const PRIVACY_SECTION_COUNT = 11;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default function PrivacyPage({ onClose }: PrivacyPageProps) {
  const { t } = useTranslation();

  return (
    <LegalInfoPageShell
      titleKey="privacy.header"
      onClose={onClose}
      preamble={
        <p className="text-xs text-white/50 leading-relaxed">{t('privacy.lastUpdated')}</p>
      }
    >
      {Array.from({ length: PRIVACY_SECTION_COUNT }, (_, i) => {
        const n = pad2(i + 1);
        const titleKey = `privacy.s${n}Title`;
        const bodyKey = `privacy.s${n}Body`;
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
