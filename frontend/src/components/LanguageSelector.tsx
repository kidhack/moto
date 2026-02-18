import { LANGUAGES } from '../data/languages';
import { usePreferredLanguage } from '../hooks/usePreferredLanguage';
import BackCloseButton from './BackCloseButton';

interface LanguageSelectorProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function LanguageSelector({ onClose, embedded }: LanguageSelectorProps) {
  const { preferredLanguage, setPreferredLanguage } = usePreferredLanguage();

  const handleSelectLanguage = (code: string) => {
    setPreferredLanguage(code);
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
            Language
          </p>
          <div className="h-8 w-8" /> {/* Empty space for symmetry */}
        </header>

        {/* Divider - mt-4 matches dashboard/menu */}
        <div className="px-5 shrink-0 mt-4">
          <div className="h-px w-full bg-white/50 shrink-0" />
        </div>

        {/* Language list container - scrollable, matching menu items container structure - extends to edge for scrollbar */}
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pb-5">
          {/* Content wrapper with padding - scrollbar stays at edge, pt-6 matches menu */}
          <div className="px-5 pt-6 flex flex-col gap-4">
            {/* Language items - matching menu structure */}
            {LANGUAGES.map((language) => {
              const isSelected = language.code === preferredLanguage;
              return (
                <button
                  key={language.code}
                  onClick={() => handleSelectLanguage(language.code)}
                  className="flex items-center gap-8 h-6 w-full justify-between shrink-0"
                >
                  <p className={`text-base tracking-[0.8px] text-left font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                    {language.name}
                  </p>
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

