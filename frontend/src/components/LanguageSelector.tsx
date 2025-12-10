import { LANGUAGES } from '../data/languages';
import { usePreferredLanguage } from '../hooks/usePreferredLanguage';

interface LanguageSelectorProps {
  onClose: () => void;
}

export default function LanguageSelector({ onClose }: LanguageSelectorProps) {
  const { preferredLanguage, setPreferredLanguage } = usePreferredLanguage();

  const handleSelectLanguage = (code: string) => {
    setPreferredLanguage(code);
    // Close after a brief delay to show selection
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Main container matching menu screen: pt-8 (32px) */}
      <div className="flex flex-col pt-8 flex-1 min-h-0">
        {/* Header with close button, title, and empty space - matching menu header height (40px logo) - fixed at top */}
        <header className="flex items-center justify-between h-10 mb-8 shrink-0 px-5">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
          >
            {/* Close icon - 80% opacity, 100% on hover */}
            <img 
              src="/assets/close.png" 
              alt="Close" 
              className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
            />
          </button>
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            Language
          </p>
          <div className="h-8 w-8" /> {/* Empty space for symmetry */}
        </header>

        {/* Divider - fixed above scrollable content, matching menu location */}
        <div className="px-5 shrink-0">
          <div className="bg-[rgba(255,255,255,0.5)] h-[1px] w-full" />
        </div>

        {/* Language list container - scrollable, matching menu items container structure - extends to edge for scrollbar */}
        <div className="flex flex-col gap-10 flex-1 min-h-0 overflow-y-auto pb-5">
          {/* Content wrapper with padding - scrollbar stays at edge */}
          <div className="px-5 pt-8 flex flex-col gap-10">
            {/* Language items - matching menu structure */}
            {LANGUAGES.map((language) => {
              const isSelected = language.code === preferredLanguage;
              return (
                <button
                  key={language.code}
                  onClick={() => handleSelectLanguage(language.code)}
                  className="flex items-center gap-8 h-6 w-full justify-between shrink-0"
                >
                  <p className="text-xl text-white tracking-[0.8px] text-left font-medium">
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

