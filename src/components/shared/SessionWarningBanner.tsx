type SessionWarningBannerProps = {
  visible: boolean;
  countdown: number;
};

export const SessionWarningBanner = ({ visible, countdown }: SessionWarningBannerProps) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-amber-900">
        Session will expire due to inactivity in {countdown} seconds.
      </p>
    </div>
  );
};
