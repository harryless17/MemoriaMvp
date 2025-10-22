'use client';

import { useState, useEffect } from 'react';
import type { EventMember } from '@memoria/ui';

interface ClusterSuggestion {
  member: EventMember;
  confidence: number;
  reason: 'vip_frequency' | 'name_match' | 'photo_count' | 'recent_activity';
  reasonText: string;
}

/**
 * Hook to suggest which member to assign to a face cluster
 * Uses multiple signals: frequency, patterns, etc.
 */
export function useSuggestMemberForCluster(
  cluster: any,
  members: EventMember[],
  allClusters: any[]
) {
  const [suggestion, setSuggestion] = useState<ClusterSuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cluster || !members || members.length === 0) {
      setSuggestion(null);
      return;
    }

    findBestMatch();
  }, [cluster?.id, members]);

  async function findBestMatch() {
    try {
      setLoading(true);

      const suggestions: Array<{
        member: EventMember;
        score: number;
        reason: string;
        reasonText: string;
      }> = [];

      // Calculate total faces in event
      const totalFaces = allClusters.reduce((sum, c) => sum + (c.face_count || 0), 0);
      const clusterFaceCount = cluster.face_count || 0;
      const clusterAvgQuality = typeof cluster.avg_quality === 'number' ? cluster.avg_quality : undefined;

      // Track members déjà liés pour pénaliser (mais pas exclure) leurs scores
      const userIdWithLinkedCluster = new Set(
        allClusters
          .filter((c: any) => c.status === 'linked' && Boolean(c.linked_user_id))
          .map((c: any) => c.linked_user_id as string)
      );

      const candidateMembers = members as any[];

      // Garde‑fou STRICT: pas de suggestion si cluster à une seule photo
      const isClusterRobust = clusterFaceCount >= 2 && (clusterAvgQuality ?? 0) >= 0.7;

      if (!isClusterRobust) {
        setSuggestion(null);
        return;
      }

      // Signal 1: VIP Frequency (appears in many photos)
      // Stricter threshold to reduce false positives
      const frequencyScore = totalFaces > 0 ? clusterFaceCount / totalFaces : 0;
      if (clusterFaceCount >= 3 && frequencyScore >= 0.2) {
        const vipMembers = candidateMembers
          .sort((a: any, b: any) => (b.media_count || 0) - (a.media_count || 0))
          .slice(0, 3);

        vipMembers.forEach((member) => {
          suggestions.push({
            member,
            score: frequencyScore * 80, // slightly reduced weight
            reason: 'vip_frequency',
            reasonText: `Personne très photographiée (${Math.round(frequencyScore * 100)}% des photos)`
          });
        });
      }

      // Signal 2: Photo count similarity
      // Match clusters with similar photo counts to members with similar tag counts
      if (clusterFaceCount >= 2) {
      candidateMembers.forEach((member: any) => {
        const memberPhotoCount = member.media_count || 0;
        const diff = Math.abs(memberPhotoCount - clusterFaceCount);
        const maxCount = Math.max(memberPhotoCount, clusterFaceCount);
        
        if (maxCount > 0) {
          const similarity = 1 - (diff / maxCount);
          
          if (similarity > 0.6 && memberPhotoCount > 0) {
            // Pénaliser légèrement les membres déjà liés à un autre cluster
            const penalty = userIdWithLinkedCluster.has(member.user_id) ? 0.9 : 1;
            suggestions.push({
              member,
              score: similarity * 80 * penalty,
              reason: 'photo_count',
              reasonText: `Nombre de photos similaire (${clusterFaceCount} photos dans le cluster)`
            });
          }
        }
      });
      }

      // Signal 3: Name similarity (if we had OCR or metadata)
      // TODO: Could analyze EXIF data, file names, etc.
      // For now, we skip this

      // Signal 4: Heuristique de "défragmentation" de clusters (plus stricte)
      // Objectif: ne proposer le rattachement qu'en cas de plausibilité suffisante
      // (au moins 2 photos dans le cluster ET volumes de photos comparables).
      const linkedCountsByUser: Record<string, number> = {};
      allClusters.forEach((c: any) => {
        if (c.status === 'linked' && c.linked_user_id) {
          linkedCountsByUser[c.linked_user_id] = (linkedCountsByUser[c.linked_user_id] || 0) + 1;
        }
      });

      Object.entries(linkedCountsByUser).forEach(([userId, existingCount]) => {
        const m = candidateMembers.find((cm: any) => cm.user_id === userId);
        if (!m) return;

        // Conditions minimales de plausibilité
        if (clusterFaceCount < 2) return; // éviter les 1-photos
        const memberPhotoCount = m.media_count || 0;
        if (memberPhotoCount === 0) return;
        const diff = Math.abs(memberPhotoCount - clusterFaceCount);
        const maxCount = Math.max(memberPhotoCount, clusterFaceCount);
        const similarity = 1 - (diff / maxCount);
        if (similarity < 0.5) return; // volumes trop différents => pas de bonus

        // Score basé sur: nb de clusters déjà liés, qualité et taille du cluster courant
        const qualityPart = Math.max(0, Math.min(1, (clusterAvgQuality ?? 0)));
        const sizePart = clusterFaceCount >= 3 ? 8 : 4;
        const base = 20; // base plus faible pour ne pas écraser les autres signaux
        const score = base + Math.min(existingCount * 8, 20) + Math.round(qualityPart * 15) + sizePart;

        suggestions.push({
          member: m as any,
          score,
          reason: 'recent_activity',
          reasonText: `Déjà identifié dans ${existingCount} autre${existingCount > 1 ? 's' : ''} cluster${existingCount > 1 ? 's' : ''}`
        });
      });

      // Sort by score and pick the best
      suggestions.sort((a, b) => b.score - a.score);

      // Only suggest if confidence is reasonable (>55%)
      const best = suggestions[0];
      if (best && best.score > 55) {
        setSuggestion({
          member: best.member,
          confidence: Math.round(best.score),
          reason: best.reason as any,
          reasonText: best.reasonText,
        });
      } else {
        setSuggestion(null);
      }
    } catch (error) {
      console.error('Error finding suggestion:', error);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  }

  return { suggestion, loading };
}

/**
 * String similarity using Levenshtein distance
 * Returns a value between 0 and 1
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

