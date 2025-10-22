'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Search, Loader2, UserPlus, Mail, CheckCircle2, Users, Sparkles, CheckSquare, Square } from 'lucide-react'
import { Avatar } from './ui/avatar'
import { cn } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/userHelpers'

interface AssignModalProps {
  facePerson: any
  eventId: string
  onClose: () => void
  onAssigned?: () => void
}

export default function AssignModalV2({
  facePerson,
  eventId,
  onClose,
  onAssigned,
}: AssignModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  
  // Check if this is an AI-generated cluster
  const isAIGenerated = facePerson?.metadata?.is_ai_generated || false
  const confidence = facePerson?.metadata?.confidence || 'unknown'
  
  // Existing members tab
  const [members, setMembers] = useState<any[]>([])
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]) // Multi-selection
  const [loading, setLoading] = useState(false)
  const [existingClusters, setExistingClusters] = useState<any[]>([])
  
  // New member tab
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [userExists, setUserExists] = useState<boolean | null>(null)
  const [creatingMember, setCreatingMember] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
    loadExistingClusters()
  }, [eventId])

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter((member) => {
        const displayName = getUserDisplayName({ display_name: member.user?.display_name, email: member.email });
        return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               member.email?.toLowerCase().includes(searchQuery.toLowerCase());
      })
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(members)
    }
  }, [searchQuery, members])

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('event_members')
        .select(`
          id,
          name,
          email,
          user_id,
          role,
          joined_at
        `)
        .eq('event_id', eventId)
        .order('name')

      if (error) throw error
      
      setMembers(data || [])
    } catch (err) {
      console.error('Error loading members:', err)
    }
  }

  async function loadExistingClusters() {
    try {
      const { data, error } = await supabase
        .from('face_persons')
        .select('id, linked_user_id, metadata')
        .eq('event_id', eventId)
        .not('linked_user_id', 'is', null)

      if (error) throw error
      setExistingClusters(data || [])
    } catch (err) {
      console.error('Error loading existing clusters:', err)
    }
  }

  // Check if user exists when email changes
  useEffect(() => {
    const checkUserExists = async () => {
      if (!newMemberEmail) {
        setUserExists(null)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newMemberEmail)) {
        setUserExists(null)
        return
      }

      try {
        // Check if THIS SPECIFIC EMAIL has a user_id in any event_members
        const { data, error } = await supabase
          .from('event_members')
          .select('user_id, email')
          .eq('email', newMemberEmail)
          .not('user_id', 'is', null)
          .limit(1)
          .maybeSingle()

        if (error) {
          console.warn('Cannot check if user exists:', error)
          setUserExists(false)
        } else {
          const result = data as any
          setUserExists(!!result && !!result.user_id)
        }
      } catch (err) {
        console.warn('Error checking user existence:', err)
        setUserExists(false)
      }
    }

    const timer = setTimeout(checkUserExists, 500)
    return () => clearTimeout(timer)
  }, [newMemberEmail])

  // Toggle user selection for multi-select
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Select all visible users
  const selectAllVisible = () => {
    const visibleUserIds = filteredMembers
      .filter(member => member.user_id)
      .map(member => member.user_id)
    setSelectedUserIds(visibleUserIds)
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedUserIds([])
  }

  // Multi-assign to existing users
  async function handleMultiAssign() {
    if (selectedUserIds.length === 0) {
      setError('Sélectionnez au moins un participant')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvxipiqffizembeyauwt.supabase.co'
      const results = []
      const errors = []

      // Process each selected user
      // In multi-select mode, ALWAYS use create-and-assign (copies faces)
      // This prevents the issue where merge() moves faces and breaks subsequent assignments
      for (let i = 0; i < selectedUserIds.length; i++) {
        const userId = selectedUserIds[i]
        const isLastUser = i === selectedUserIds.length - 1
        
        try {
          // Create or add to existing cluster for this user
          // Only delete the source cluster on the LAST assignment
          const response = await fetch(
            `${supabaseUrl}/functions/v1/create-and-assign`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                source_face_person_id: facePerson.id,
                linked_user_id: userId,
                event_id: eventId,
                delete_source: isLastUser, // Only delete on last user
                merge_if_exists: true, // Merge with existing cluster if user already has one
              }),
            }
          )

          if (!response.ok) {
            const error = await response.json()
            errors.push(`${userId}: ${error.error || 'Échec de l\'assignation'}`)
            continue
          }

          const result = await response.json()
          results.push({ userId, type: result.merged ? 'merge' : 'create', result })
        } catch (err: any) {
          errors.push(`${userId}: ${err.message}`)
        }
      }

      // Show results
      const totalTags = results.reduce((sum, r) => sum + (r.result.tags_created || r.result.faces_copied || 0), 0)
      const mergeCount = results.filter(r => r.type === 'merge').length
      const createCount = results.filter(r => r.type === 'create').length

      let message = `✅ Cluster traité !\n\n`
      if (createCount > 0) message += `• ${createCount} nouveau(x) cluster(s) créé(s)\n`
      if (mergeCount > 0) message += `• ${mergeCount} fusion(s) de clusters\n`
      message += `• ${totalTags} photos taguées au total\n`
      
      if (errors.length > 0) {
        message += `\n⚠️ Erreurs:\n${errors.join('\n')}`
      }

      alert(message)
      
      if (onAssigned) onAssigned()
    } catch (err: any) {
      console.error('Error in multi-assign:', err)
      setError(err.message || 'Erreur lors de l\'assignation')
    } finally {
      setLoading(false)
    }
  }

  // Create and assign new member
  async function handleCreateAndAssign() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setError('Nom et email sont requis')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newMemberEmail)) {
      setError('Email invalide')
      return
    }

    try {
      setCreatingMember(true)
      setError(null)
      setUserExists(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let newMemberId: string | null = null
      let memberUserId: string | null = null

      // 1. Check if email already exists in this event
      const { data: existingMember } = await supabase
        .from('event_members')
        .select('id, user_id')
        .eq('event_id', eventId)
        .eq('email', newMemberEmail)
        .maybeSingle()

      if (existingMember) {
        // Member already exists in event
        newMemberId = (existingMember as any).id
        memberUserId = (existingMember as any).user_id
        
        if (!memberUserId) {
          throw new Error('Ce participant existe mais n\'a pas de compte utilisateur')
        }
      } else {
        // 2. Create new event member
        const { data: createdMemberId, error: createError } = await (supabase as any).rpc('add_event_member', {
          p_event_id: eventId,
          p_name: newMemberName,
          p_email: newMemberEmail,
          p_role: 'participant'
        })

        if (createError) throw createError
        newMemberId = createdMemberId

        // 3. Check if this email has a user_id (account exists)
        try {
          const { data: memberWithAccount, error: checkError } = await supabase
            .from('event_members')
            .select('user_id, email')
            .eq('email', newMemberEmail)
            .not('user_id', 'is', null)
            .limit(1)
            .maybeSingle()

          if (!checkError && memberWithAccount && (memberWithAccount as any).email === newMemberEmail) {
            memberUserId = (memberWithAccount as any)?.user_id || null
          } else {
            memberUserId = null
          }
        } catch (err) {
          console.warn('Cannot check if account exists:', err)
          memberUserId = null
        }

        if (!memberUserId) {
          // User doesn't have an account yet, send invitation
          await fetch('/api/send-invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              memberIds: [newMemberId],
              skipPhotoCheck: true,
            }),
          })
          
          alert(`✅ ${newMemberName} ajouté et invité par email.\n\n⚠️ L'assignation du cluster sera faite une fois qu'il/elle aura créé son compte.`)
          if (onAssigned) onAssigned()
          return
        }
      }

      // 4. Assign cluster to user
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvxipiqffizembeyauwt.supabase.co'
      
      // Check if user already has a cluster
      const existingCluster = existingClusters.find(c => c.linked_user_id === memberUserId)
      
      if (existingCluster && existingCluster.id !== facePerson.id) {
        // Merge clusters
        const mergeResponse = await fetch(
          `${supabaseUrl}/functions/v1/face-person-actions/merge`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              primary_person_id: existingCluster.id,
              secondary_person_id: facePerson.id,
            }),
          }
        )

        if (!mergeResponse.ok) {
          const error = await mergeResponse.json()
          throw new Error(error.error || 'Échec de la fusion des clusters')
        }

        const mergeResult = await mergeResponse.json()
        alert(`✅ ${newMemberName} créé et clusters fusionnés !\n\n${mergeResult.faces_reassigned} photos fusionnées.`)
      } else {
        // Direct assignment
        const response = await fetch(
          `${supabaseUrl}/functions/v1/face-person-actions/link-user`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              face_person_id: facePerson.id,
              linked_user_id: memberUserId,
            }),
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Échec de l\'assignation')
        }

        const result = await response.json()
        alert(`✅ ${newMemberName} créé et assigné !\n\n${result.tags_created} photos taguées.`)
      }

      if (onAssigned) onAssigned()
      
      // Reset form after successful creation
      setNewMemberName('')
      setNewMemberEmail('')
      setUserExists(null)
    } catch (err: any) {
      console.error('Error creating and assigning:', err)
      setError(err.message || 'Erreur lors de la création et assignation')
    } finally {
      setCreatingMember(false)
    }
  }

  const handleClose = () => {
    setSelectedUserIds([])
    setNewMemberName('')
    setNewMemberEmail('')
    setUserExists(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Assigner ce cluster
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cluster info */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              {facePerson.thumbnail_url ? (
                <Image
                  src={facePerson.thumbnail_url}
                  alt="Cluster thumbnail"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Users className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {isAIGenerated 
                  ? `🤖 L'IA a identifié cette personne avec ${confidence === 'high' ? 'haute' : 'moyenne'} confiance dans ${facePerson?.face_count || 0} photo${(facePerson?.face_count || 0) > 1 ? 's' : ''}`
                  : `📸 Ce cluster contient ${facePerson?.face_count || 0} photo${(facePerson?.face_count || 0) > 1 ? 's' : ''}`
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Qualité moyenne: {facePerson.avg_quality ? `${Math.round(facePerson.avg_quality)}%` : 'N/A'}
              </p>
              {isAIGenerated && (
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  💡 L'IA a analysé toutes vos photos pour identifier cette personne de manière unique
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('existing')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              activeTab === 'existing'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Users className="w-4 h-4" />
            Participants ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              activeTab === 'new'
                ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Nouveau
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'existing' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un participant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Multi-select controls */}
              {filteredMembers.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllVisible}
                    className="text-xs"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Tout sélectionner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllSelections}
                    className="text-xs"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Tout désélectionner
                  </Button>
                  <span className="text-sm text-gray-500 self-center">
                    {selectedUserIds.length} sélectionné(s)
                  </span>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.user_id)
                  const hasAccount = !!member.user_id
                  
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                      )}
                      onClick={() => hasAccount && toggleUserSelection(member.user_id)}
                    >
                      <Avatar
                        src={member.user?.avatar_url}
                        name={getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasAccount ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-orange-500" />
                        )}
                        {hasAccount && (
                          <div className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center',
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredMembers.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Aucun participant trouvé
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet
                </label>
                <Input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Ex: jean.dupont@example.com"
                />
                
                {userExists !== null && (
                  <div className={cn(
                    "flex items-center gap-2 mt-2 text-xs p-2 rounded-lg",
                    userExists 
                      ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                      : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  )}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {userExists 
                        ? "✅ Cette personne a déjà un compte Memoria"
                        : "📧 Cette personne devra créer un compte"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          
          {activeTab === 'existing' ? (
            <Button
              onClick={handleMultiAssign}
              disabled={loading || selectedUserIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              {isAIGenerated 
                ? `Valider l'IA et assigner à ${selectedUserIds.length} personne(s)`
                : `Assigner à ${selectedUserIds.length} personne(s)`
              }
            </Button>
          ) : (
            <Button
              onClick={handleCreateAndAssign}
              disabled={creatingMember || !newMemberName.trim() || !newMemberEmail.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creatingMember ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Créer, assigner et notifier
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
