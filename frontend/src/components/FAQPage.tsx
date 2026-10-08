import BackCloseButton from './BackCloseButton';
import { useTranslation } from '../i18n';
import { useBTCPrice } from '../hooks/useQueries';
import { useIndexerUsed } from '../hooks/useCkBTCTransactions';

interface FAQPageProps {
  onClose?: () => void;
}

export default function FAQPage({ onClose }: FAQPageProps) {
  const { t } = useTranslation();
  const { data: priceData } = useBTCPrice();
  const indexerUsed = useIndexerUsed();

  const status = priceData?.priceSourceStatus;
  const priceLabel = status
    ? status.coinGecko && status.mempool
      ? t('faq.statusPriceBoth')
      : status.coinGecko
        ? status.proxyUsed
          ? t('faq.statusPriceCoinGeckoDegraded')
          : t('faq.statusPriceCoinGecko')
        : status.mempool
          ? t('faq.statusPriceMempool')
          : status.coinDesk
            ? t('faq.statusPriceCoinDesk')
            : status.binance
              ? t('faq.statusPriceBinance')
          : t('faq.statusPriceUnknown')
    : t('faq.statusPriceUnknown');
  const indexerLabel =
    indexerUsed === 'blockstream'
      ? t('faq.statusIndexerBlockstream')
      : indexerUsed === 'mempool'
        ? t('faq.statusIndexerMempool')
        : t('faq.statusIndexerMixed');

  return (
    <div className="flex flex-col h-full min-h-0 bg-black">
      <div className="flex flex-col flex-1 min-h-0 pt-4">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          <BackCloseButton onClose={onClose ?? (() => {})} />
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {t('faq.header')}
          </p>
          <div className="h-8 w-8" />
        </header>

        <div className="px-5 shrink-0 mt-4">
          <div className="h-px w-full bg-white/50 shrink-0" />
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-5" style={{ touchAction: 'pan-y' }}>
          <div className="px-5 pt-6 flex flex-col gap-6">
            {/* System status row */}
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm text-white/80 tracking-[0.8px]">{t('faq.systemStatus')}</p>
              <div className="flex flex-col gap-1 text-sm text-white/60 font-mono">
                <span>{t('faq.statusPrice')}: {priceLabel}</span>
                <span>{t('faq.statusIndexer')}: {indexerLabel}</span>
              </div>
            </div>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* How MOTO Works */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.howItWorksTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.howItWorksBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.canisterTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.canisterBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Instant MOTO-to-MOTO sends */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.instantTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.instantBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.txFeesTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.txFeesBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Services We Use */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.servicesTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.servicesBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* What Is Not On-Chain */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.notOnChainTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.notOnChainBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Non-custodial */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.nonCustodialTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.nonCustodialBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Login backup / recovery */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.backupTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.backupBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Disclaimers */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.disclaimersTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.disclaimersBody')}</p>
            </section>

            <div className="h-px w-full bg-white/30 shrink-0" />

            {/* Networks */}
            <section>
              <h2 className="font-medium text-base text-white tracking-[0.8px] mb-2">{t('faq.networksTitle')}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{t('faq.networksBody')}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
