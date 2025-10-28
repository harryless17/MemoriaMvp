'use client';

import Link from 'next/link';
import { Heart, Github, Twitter } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo 
                className="w-12 h-12 rounded-lg"
                alt="Memoria Logo"
              />
              <h3 className="text-2xl font-bold gradient-text">Memoria</h3>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Capture and share your event moments with friends and family.
              Create lasting memories together.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-foreground transition-colors">
                  Discover Events
                </Link>
              </li>
              <li>
                <Link href="/events/new" className="hover:text-foreground transition-colors">
                  Create Event
                </Link>
              </li>
              <li>
                <Link href="/my-events" className="hover:text-foreground transition-colors">
                  My Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p suppressHydrationWarning>© {currentYear} Memoria. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for sharing memories
          </p>
        </div>
      </div>
    </footer>
  );
}

