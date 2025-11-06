import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletAddress, useCompleteOnboarding } from '../hooks/useQueries';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Copy, CheckCircle } from 'lucide-react';

export default function OnboardingFlow() {
  const { data: walletAddress, isLoading, error, refetch } = useWalletAddress();
  const completeOnboarding = useCompleteOnboarding();
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletAddress) {
      toast.error('Wallet address not available yet. Please wait.');
      return;
    }
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      toast.success('Address copied to clipboard!', {
        duration: 2000,
      });
      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleSkip = () => {
    completeOnboarding.mutate(undefined, {
      onError: (error) => {
        console.error('Failed to complete onboarding:', error);
        toast.error('Failed to proceed. Please try again.');
      }
    });
  };

  const handleRetry = () => {
    toast.info('Retrying...');
    refetch();
  };

  const hasError = !!error;
  const hasAddress = !!walletAddress && walletAddress.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Main content area with centered text - matches Figma exactly */}
      {/* Figma: Text vertically and horizontally centered */}
      <div className="flex flex-1 items-center justify-center px-5">
        <h1 
          className="text-center text-xl leading-normal font-medium"
          style={{ letterSpacing: '-0.22px' }}
        >
          Deposit Bitcoin to fund your wallet.
        </h1>
      </div>
      
      {/* Bottom section with wallet address and buttons - anchored at bottom */}
      {/* Figma: Wallet address and buttons at bottom */}
      <div className="flex w-full flex-col gap-4 px-5 pb-5">
        {/* Error Alert */}
        {hasError && (
          <Alert variant="destructive" className="rounded-none border-red-500/50 bg-red-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Failed to load wallet address. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Address Display */}
        {isLoading ? (
          <div className="flex w-full items-center justify-center rounded-none border-2 border-[#1a1a1a] bg-[#1a1a1a] px-6 py-5">
            <Loader2 className="h-5 w-5 animate-spin text-[#CC8800]" />
            <p className="ml-3 text-center text-base text-white/60">
              Loading wallet address...
            </p>
          </div>
        ) : hasError ? (
          <div className="w-full rounded-none border-2 border-red-500/30 bg-[#1a1a1a] px-6 py-5">
            <p className="text-center text-base text-red-400">
              Unable to load wallet address
            </p>
          </div>
        ) : hasAddress ? (
          <button
            onClick={handleCopyAddress}
            className="group w-full cursor-pointer rounded-none border-2 border-[#1a1a1a] bg-[#1a1a1a] px-5 py-5 transition-all hover:border-[#CC8800]/30 hover:bg-[#222222] active:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCopying}
            aria-label="Click to copy wallet address"
          >
            <div className="flex items-center justify-center gap-4">
              {/* Figma: Wallet address - IBM Plex Mono Bold, 16px, #CC8800, tracking 0.32px */}
              <p 
              className="break-all text-center font-mono text-base leading-6 text-[#CC8800]"
              style={{ letterSpacing: '0.32px' }}
            >
                {walletAddress}
              </p>
              {copySuccess ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 flex-shrink-0 text-[#CC8800] opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          </button>
        ) : (
          <div className="w-full rounded-none border-2 border-[#1a1a1a] bg-[#1a1a1a] px-6 py-5">
            <p className="text-center text-base text-white/60">
              No wallet address available
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {hasError ? (
          <Button
            onClick={handleRetry}
            variant="outline"
            size="lg"
            className="h-14 w-full rounded-none border-2 border-white bg-white text-base font-normal text-black hover:bg-white/90 hover:text-black"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleCopyAddress}
            variant="outline"
            size="lg"
            className="h-16 w-full rounded-none border-2 border-white bg-white text-base font-bold text-black hover:bg-white/90 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            style={{ letterSpacing: '0.15px' }}
            disabled={isCopying || !hasAddress || isLoading}
          >
            {isCopying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : copySuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy my wallet address
              </>
            )}
          </Button>
        )}
        
        {/* Figma: "Skip for now" button - #818181 border, black background, white text */}
        <Button
          onClick={handleSkip}
          variant="outline"
          size="lg"
          className="h-16 w-full rounded-none border-2 border-[#818181] bg-black text-base font-bold text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          style={{ letterSpacing: '0.15px' }}
          disabled={completeOnboarding.isPending}
        >
          {completeOnboarding.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Skip for now'
          )}
        </Button>
      </div>
    </div>
  );
}
