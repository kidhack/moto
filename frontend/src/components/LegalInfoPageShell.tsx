import type { ReactNode } from 'react';
import BackCloseButton from './BackCloseButton';
import { useTranslation } from '../i18n';

type LegalInfoPageShellProps = {
  titleKey: string;
  onClose?: () => void;
  /** e.g. last-updated line above sections */
  preamble?: ReactNode;
  children: ReactNode;
};

export default function LegalInfoPageShell({
  titleKey,
  onClose,
  preamble,
  children,
}: LegalInfoPageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full min-h-0 bg-black">
      <div className="flex flex-col flex-1 min-h-0 pt-4">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          <BackCloseButton onClose={onClose ?? (() => {})} />
          <p className="font-medium text-xl text-white tracking-[-0.22px]">{t(titleKey)}</p>
          <div className="h-8 w-8" />
        </header>

        <div className="px-5 shrink-0 mt-4">
          <div className="h-px w-full bg-white/50 shrink-0" />
        </div>

        <div
          className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-5"
          style={{ touchAction: 'pan-y' }}
        >
          <div className="px-5 pt-6 flex flex-col gap-6">
            {preamble}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
