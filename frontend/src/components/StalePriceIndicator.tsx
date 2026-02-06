/** 16×16px icon shown next to BTC price when the price data is stale (e.g. last updated > 5 min ago). */
export default function StalePriceIndicator({ isStale }: { isStale: boolean }) {
  if (!isStale) return null;
  return (
    <img
      src="/assets/stale.svg"
      alt="Stale price"
      className="inline-block size-4 shrink-0 align-middle"
      width={16}
      height={16}
      title="Price may be outdated"
    />
  );
}
