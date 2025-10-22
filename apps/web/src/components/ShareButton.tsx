'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  eventId: string;
  eventTitle: string;
}

export function ShareButton({ eventId, eventTitle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/e/${eventId}`;

    // Try native share if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out this event: ${eventTitle}`,
          url,
        });
        return;
      } catch (error) {
        // User cancelled or share failed, fallback to copy
      }
    }

    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          Share
        </>
      )}
    </Button>
  );
}

