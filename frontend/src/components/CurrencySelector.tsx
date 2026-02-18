import { CURRENCIES } from '../data/currencies';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import BackCloseButton from './BackCloseButton';
import { useTranslation } from '../i18n';

interface CurrencySelectorProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function CurrencySelector({ onClose, embedded }: CurrencySelectorProps) {
  const { preferredCurrency, setPreferredCurrency } = usePreferredCurrency();
  const { t } = useTranslation();

  const handleSelectCurrency = (code: string) => {
    setPreferredCurrency(code);
    // Close after a brief delay to show selection
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className={embedded ? 'w-full h-full min-h-0 flex flex-col bg-black' : 'fixed inset-0 bg-black z-[9999] flex flex-col'}>
      {/* Main container - pt-4 matches dashboard/menu header */}
      <div className="flex flex-col pt-4 flex-1 min-h-0">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          <BackCloseButton onClose={onClose} />
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {t('currencySelector.header')}
          </p>
          <div className="h-8 w-8" /> {/* Empty space for symmetry */}
        </header>

        {/* Divider - mt-4 matches dashboard/menu */}
        <div className="px-5 shrink-0 mt-4">
          <div className="h-px w-full bg-white/50 shrink-0" />
        </div>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pb-5" style={{ touchAction: 'pan-y' }}>
          {/* Content wrapper with padding - scrollbar stays at edge, pt-6 matches menu */}
          <div className="px-5 pt-6 flex flex-col gap-4">
            {/* Currency items - matching menu structure */}
            {CURRENCIES.map((currency) => {
              const isSelected = currency.code === preferredCurrency;
              return (
                <button
                  key={currency.code}
                  onClick={() => handleSelectCurrency(currency.code)}
                  className="flex items-center gap-8 h-6 w-full justify-between shrink-0"
                >
                  <div className={`flex items-center gap-10 text-base tracking-[0.8px] text-left font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                    <span className="font-mono font-bold">{currency.code}</span>
                    <span className="font-medium">{currency.name}</span>
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 flex items-center justify-center shrink-0">
                      {/* Selection icon - checkmark */}
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

