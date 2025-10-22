import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users } from 'lucide-react';
import { getUserDisplayName } from '@/lib/userHelpers';

interface MemberCountProps {
  eventId: string;
}

export function MemberCount({ eventId }: MemberCountProps) {
  const [count, setCount] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadMembers();

    // Realtime subscription
    const channel = supabase
      .channel(`event_members:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_members',
          filter: `event_id=eq.${eventId}`,
        },
        () => loadMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadMembers() {
    const { data } = await supabase
      .from('event_members')
      .select('user_id')
      .eq('event_id', eventId);

    if (data) {
      setCount(data.length);

      // Load profiles with emails from auth.users
      const userIds = (data as any[]).map((d: any) => d.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        // Get emails from auth.users
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const usersMap = new Map(usersData?.users?.map(u => [u.id, u.email]) || []);

        const membersWithData = (profilesData || []).map((profile: any) => ({
          ...profile,
          email: usersMap.get(profile.id)
        }));

        setMembers(membersWithData as any);
      } else {
        setMembers([]);
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <Users className="w-4 h-4" />
        <span>{count} {count === 1 ? 'member' : 'members'}</span>
      </button>

      {showList && members.length > 0 && (
        <div className="absolute top-full mt-2 bg-popover border border-border rounded-lg shadow-lg p-4 min-w-[200px] z-10">
          <div className="text-sm font-semibold mb-2">Members</div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="text-sm">
                {getUserDisplayName({ display_name: member.display_name, email: member.email })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

