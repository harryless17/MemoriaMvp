'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Share2, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/toast';

interface EventQRCodeProps {
  eventId: string;
  eventTitle: string;
}

export function EventQRCode({ eventId, eventTitle }: EventQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      generateQRCode();
    }
  }, [isOpen, eventId]);

  const generateQRCode = async () => {
    try {
      const eventUrl = `${window.location.origin}/e/${eventId}`;
      const url = await QRCode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        type: 'error',
        title: 'Error generating QR code',
        description: 'Please try again later.',
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${eventTitle}-qrcode.png`;
    link.click();

    toast({
      type: 'success',
      title: 'QR Code downloaded',
      description: 'The QR code has been saved to your device.',
    });
  };

  const handleShare = async () => {
    const eventUrl = `${window.location.origin}/e/${eventId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Join my event: ${eventTitle}`,
          url: eventUrl,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(eventUrl);
      toast({
        type: 'success',
        title: 'Link copied',
        description: 'Event link copied to clipboard.',
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <QrCodeIcon className="w-4 h-4" />
        QR Code
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-8 py-6">
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="glass-card p-6 rounded-2xl">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Event QR Code"
                    className="w-[300px] h-[300px]"
                  />
                ) : (
                  <div className="w-[300px] h-[300px] flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <h3 className="font-semibold mb-2">{eventTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Scan this QR code to join the event
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                disabled={!qrCodeUrl}
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}

