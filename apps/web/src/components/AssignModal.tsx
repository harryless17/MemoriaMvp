'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Search, Loader2, UserPlus, Mail, CheckCircle2, Users, Sparkles } from 'lucide-react'
import { Avatar } from './ui/avatar'
import { cn } from '@/lib/utils'

interface AssignModalProps {
  facePerson: any
  eventId: string
  onClose: () => void
  onAssigned?: () => void
}

export default function AssignModal({
  facePerson,
  eventId,
  onClose,
  onAssigned,
}: AssignModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  
  // Check if this is a group cluster
  const isGroupCluster = facePerson?.metadata?.is_group_cluster || false
  
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
      const filtered = members.filter((member) =>
        member.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(members)
    }
  }, [searchQuery, members])

  async function loadMembers() {
    try {
      if (!eventId) {
        setMembers([])
        setFilteredMembers([])
        return
      }

      // 1. Get event members
      const { data: membersData, error: membersError } = await supabase
        .from('event_members')
        .select('user_id, name, email')
        .eq('event_id', eventId)

      if (membersError) throw membersError

      if (!membersData || membersData.length === 0) {
        setMembers([])
        setFilteredMembers([])
        return
      }

      // 2. Get profiles for these users
      const userIds = (membersData as any[]).map((m: any) => m.user_id).filter(Boolean)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // 3. Merge the data
      const membersWithProfiles = (membersData as any[]).map((member: any) => ({
        ...member,
        profile: (profilesData as any[] || []).find((p: any) => p.id === member.user_id) || null
      }))

      setMembers(membersWithProfiles)
      setFilteredMembers(membersWithProfiles)
    } catch (err) {
      console.error('Error loading members:', err)
    }
  }

  async function loadExistingClusters() {
    try {
      if (!eventId) {
        setExistingClusters([])
        return
      }

      // Charger tous les clusters déjà liés pour cet événement
      const { data: clustersData, error } = await supabase
        .from('face_persons')
        .select('id, linked_user_id, cluster_label, metadata')
        .eq('event_id', eventId)
        .eq('status', 'linked')
        .not('linked_user_id', 'is', null)

      if (error) throw error

      setExistingClusters(clustersData || [])
    } catch (err) {
      console.error('Error loading existing clusters:', err)
      setExistingClusters([])
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
        // IMPORTANT: Filter by email FIRST, then check for user_id
        const { data, error } = await supabase
          .from('event_members')
          .select('user_id, email')
          .eq('email', newMemberEmail)  // ← Filter by email first
          .not('user_id', 'is', null)    // ← Then check if user_id exists
          .limit(1)
          .maybeSingle()

        if (error) {
          console.warn('Cannot check if user exists:', error)
          setUserExists(false)
        } else {
          // User exists only if we found a row with this specific email AND a user_id
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

  async function handleCreateAndAssign() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setError('Nom et email sont requis')
      return
    }

    if (!facePerson?.id) {
      setError('Cluster invalide')
      return
    }

    if (!eventId) {
      setError('Événement invalide')
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
      
      // Reset userExists state for this specific operation
      setUserExists(null)

      let newMemberId: string | null = null
      let memberUserId: string | null = null

      // 1. Check if email already exists in this event
      let existingMember: any = null
      try {
        const { data, error } = await supabase
          .from('event_members')
          .select('id, user_id')
          .eq('event_id', eventId)
          .eq('email', newMemberEmail)
          .maybeSingle()

        if (!error) {
          existingMember = data
        }
      } catch (err) {
        console.warn('Cannot check existing member:', err)
        // Continue anyway, will create new member
      }

      if (existingMember) {
        // Member already exists in event, use their data
        newMemberId = (existingMember as any).id
        memberUserId = (existingMember as any).user_id
        
        if (!memberUserId) {
          setError('Ce membre existe déjà mais n\'a pas de compte associé')
          setCreatingMember(false)
          return
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

        // 3. Check if THIS SPECIFIC EMAIL has a user_id (means account exists)
        try {
          const { data: memberWithAccount, error: checkError } = await supabase
            .from('event_members')
            .select('user_id, email')
            .eq('email', newMemberEmail)  // ← Critical: filter by THIS email
            .not('user_id', 'is', null)
            .limit(1)
            .maybeSingle()

          if (!checkError && memberWithAccount && (memberWithAccount as any).email === newMemberEmail) {
            // Double-check that the email matches to avoid wrong user_id
            memberUserId = (memberWithAccount as any)?.user_id || null
          } else {
            memberUserId = null
          }
        } catch (err) {
          console.warn('Cannot check if account exists:', err)
          memberUserId = null
        }

        if (!memberUserId) {
          // User doesn't have an account yet, we'll send invitation later
          // For now, we can't assign the cluster without a user_id
          
          // Send invitation
          await fetch('/api/send-invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              memberIds: [newMemberId],
              skipPhotoCheck: true,
            }),
          })

          alert(`✅ ${newMemberName} a été ajouté et invité par email.\n\n⚠️ L'assignation du cluster sera faite une fois qu'il/elle aura créé son compte.`)
          if (onAssigned) onAssigned()
          return
        }
      }

      // 4. Assign cluster to user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvxipiqffizembeyauwt.supabase.co'
      
      // Check for existing cluster for this user
      const existingCluster = existingClusters.find(c => c.linked_user_id === memberUserId)

      if (existingCluster && existingCluster.id !== facePerson.id) {
        // Merge clusters automatically
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
          throw new Error(error.error || 'Échec de la fusion')
        }

        const mergeResult = await mergeResponse.json()
        
        // Send notification if user exists
        if (userExists && newMemberId) {
          await fetch('/api/send-invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              memberIds: [newMemberId],
              skipPhotoCheck: false,
            }),
          })
        }

        alert(`✅ ${newMemberName} créé et assigné !\n\n${mergeResult.faces_reassigned} photos fusionnées avec le cluster existant.${userExists ? '\n📧 Email de notification envoyé.' : ''}`)
        if (onAssigned) onAssigned()
        return
      } else {
        // Normal assignment
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

        // Send notification if user exists
        if (userExists && !existingMember && newMemberId) {
          await fetch('/api/send-invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              memberIds: [newMemberId],
              skipPhotoCheck: false,
            }),
          })
        }

        alert(`✅ ${newMemberName} créé et assigné !\n\n${result.tags_created} photos taguées.${userExists ? '\n📧 Email de notification envoyé.' : ''}`)
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

  async function handleAssign() {
    if (selectedUserIds.length === 0) {
      setError('Sélectionnez au moins un participant')
      return
    }

    if (!facePerson?.id) {
      setError('Cluster invalide')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Traiter tous les utilisateurs sélectionnés
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvxipiqffizembeyauwt.supabase.co'
      const results: Array<{ memberName: string; type: string; tagsCreated: number }> = []
      const errors: string[] = []

      // Vérifier qu'il y a des utilisateurs sélectionnés
      if (selectedUserIds.length === 0) {
        setError('Aucun utilisateur sélectionné')
        return
      }

      // Assigner le cluster à TOUTES les personnes sélectionnées simultanément
      const assignPromises = selectedUserIds.map(async (userId) => {
        try {
          const selectedMember = members.find(m => m.user_id === userId)
          const memberName = selectedMember?.profile?.display_name || selectedMember?.name || 'cette personne'

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
                linked_user_id: userId,
              }),
            }
          )

          if (!response.ok) {
            const error = await response.json()
            throw new Error(`${memberName}: ${error.error || 'Échec de l\'assignation'}`)
          }

          const result = await response.json()
          return { 
            memberName, 
            type: 'assign', 
            tagsCreated: result.tags_created || 0 
          }
        } catch (err: any) {
          const selectedMember = members.find(m => m.user_id === userId)
          const memberName = selectedMember?.profile?.display_name || selectedMember?.name || 'cette personne'
          throw new Error(`${memberName}: ${err.message}`)
        }
      })

      // Exécuter toutes les assignations en parallèle
      const assignResults = await Promise.allSettled(assignPromises)
      
      assignResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          errors.push(result.reason)
        }
      })

      // Afficher les résultats
      const totalTags = (results || []).reduce((sum, r) => sum + (r.tagsCreated || 0), 0)
      const assignCount = (results || []).length

      let message = `✅ Cluster assigné à ${assignCount} personne(s) !\n\n`
      message += `• ${totalTags} photos taguées au total\n`
      
      if (errors.length > 0) {
        message += `\n⚠️ Erreurs:\n${errors.join('\n')}`
      }

      alert(message)
      
      if (onAssigned) onAssigned()
    } catch (err: any) {
      console.error('Error assigning user:', err)
      alert(err.message || 'Échec de l\'assignation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assigner ce cluster</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
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
        <div className="p-4">
          {/* Info */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {isGroupCluster 
                ? `👥 Ce groupe contient ${facePerson?.metadata?.person_count || 0} personnes dans ${facePerson?.face_count || 0} photo${(facePerson?.face_count || 0) > 1 ? 's' : ''}`
                : `📸 Ce cluster contient ${facePerson?.face_count || 0} photo${(facePerson?.face_count || 0) > 1 ? 's' : ''}`
              }
            </p>
            {isGroupCluster && (
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                💡 Vous pouvez assigner ce groupe à plusieurs participants en même temps
              </p>
            )}
          </div>

          {/* Existing members tab */}
          {activeTab === 'existing' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher un participant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* Multi-select controls */}
              {filteredMembers.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllVisible}
                    className="text-xs"
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllSelections}
                    className="text-xs"
                  >
                    Tout désélectionner
                  </Button>
                  <span className="text-sm text-gray-500 self-center">
                    {selectedUserIds.length} sélectionné(s)
                  </span>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.user_id)
                  const hasAccount = !!member.user_id
                  
                  return (
                    <div
                      key={member.user_id || member.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      } ${hasAccount ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      onClick={() => hasAccount && toggleUserSelection(member.user_id)}
                    >
                      <Avatar
                        src={member.profile?.avatar_url}
                        name={member.profile?.display_name || member.name || member.email || 'Utilisateur'}
                        size="md"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.profile?.display_name || member.name || member.email || 'Utilisateur'}
                        </p>
                        {member.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasAccount ? (
                          <div className="w-4 h-4 text-green-500">✓</div>
                        ) : (
                          <div className="w-4 h-4 text-orange-500">📧</div>
                        )}
                        {hasAccount && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredMembers.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {searchQuery ? 'Aucun participant trouvé' : 'Aucun participant dans cet événement'}
                </p>
              )}
            </>
          )}

          {/* New member tab */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              {/* Quick form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom complet *
                  </label>
                  <Input
                    type="text"
                    placeholder="Marie Dupont"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="marie@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full"
                  />
                  
                  {/* User exists indicator */}
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
                          ? "✅ Cette personne a déjà un compte"
                          : "📧 Cette personne devra créer un compte"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info box */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-purple-900 dark:text-purple-100">
                    <p className="font-semibold mb-1">En 1 clic :</p>
                    <ul className="text-xs space-y-1 text-purple-700 dark:text-purple-300">
                      <li>✅ Création du participant</li>
                      <li>✅ Assignation des {facePerson?.face_count || 0} photos</li>
                      <li>✅ Envoi de l'invitation par email</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading || creatingMember}
          >
            Annuler
          </Button>
          
          {activeTab === 'existing' && (
            <Button
              onClick={handleAssign}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              disabled={selectedUserIds.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Attribution...
                </>
              ) : (
                isGroupCluster 
                  ? `Assigner le groupe à ${selectedUserIds.length} personne(s)`
                  : `Assigner à ${selectedUserIds.length} personne(s)`
              )}
            </Button>
          )}

          {activeTab === 'new' && (
            <Button
              onClick={handleCreateAndAssign}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={!newMemberName.trim() || !newMemberEmail.trim() || creatingMember}
            >
              {creatingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Créer, assigner et notifier
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

