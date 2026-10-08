import { useTranslation } from '../i18n';

/** Shown instead of the app in sanctioned regions (Terms §12). */
export default function RegionUnavailable() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 flex h-dvh flex-col items-center justify-center gap-8 bg-black px-5 text-white">
      <img src="/assets/moto-logo-mark.svg" alt="MOTO" className="size-16" />
      <div className="flex max-w-[320px] flex-col gap-3 text-center">
        <p className="text-lg font-medium">{t('region.unavailableTitle')}</p>
        <p className="text-sm leading-relaxed text-white/60">{t('region.unavailableBody')}</p>
      </div>
    </div>
  );
}
