'use client';

import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { Sparkles, CheckCircle, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ClusterSuggestionProps {
  cluster: any;
  suggestion: {
    member: any;
    confidence: number;
    reasonText: string;
  };
  onAccept?: () => void;
  onReject?: () => void;
}

export function ClusterSuggestion({ 
  cluster, 
  suggestion, 
  onAccept, 
  onReject 
}: ClusterSuggestionProps) {
  const [accepting, setAccepting] = useState(false);
  const [rejected, setRejected] = useState(false);

  if (rejected) return null;

  async function handleAccept() {
    try {
      setAccepting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call assign API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/face-person-actions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'assign',
            face_person_id: cluster.id,
            member_id: suggestion.member.id,
            user_id: user.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign');
      }

      onAccept?.();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      alert('Erreur lors de l\'assignation');
    } finally {
      setAccepting(false);
    }
  }

  function handleReject() {
    setRejected(true);
    onReject?.();
  }

  return (
    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Suggestion IA
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            {suggestion.confidence}% sûr
          </span>
        </div>
      </div>

      {/* Member info */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar 
          src={suggestion.member.user?.avatar_url} 
          name={suggestion.member.name}
          size="sm" 
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {suggestion.member.name}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {suggestion.reasonText}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {accepting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Assignation...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Accepter
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={accepting}
          className="border-emerald-200 dark:border-emerald-800"
        >
          <X className="w-4 h-4 mr-2" />
          Refuser
        </Button>
      </div>
    </div>
  );
}

