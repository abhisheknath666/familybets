import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { friendlyError } from '../lib/errors'

const GroupContext = createContext(null)

export function GroupProvider({ children }) {
  const { session } = useAuth()
  const [group, setGroup] = useState(null)
  const [membership, setMembership] = useState(null) // { tokens, ... }
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) { setLoading(false); return }
    loadGroup()
  }, [session])

  async function loadGroup() {
    setLoading(true)
    // Load first group the user belongs to
    const { data: memberships } = await supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', session.user.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      setGroup(memberships[0].groups)
      setMembership(memberships[0])
      await loadMembers(memberships[0].group_id)
    }
    setLoading(false)
  }

  async function loadMembers(groupId) {
    const { data } = await supabase
      .from('group_members')
      .select('*, profiles(*)')
      .eq('group_id', groupId)
      .order('tokens', { ascending: false })
    setMembers(data || [])
  }

  async function createGroup(name) {
    const { data: grp, error } = await supabase.rpc('create_group', { group_name: name })
    if (error) return { error: new Error(friendlyError(error)) }
    await loadGroup()
    return { data: grp }
  }

  async function joinGroup(joinCode) {
    const { data: grp, error } = await supabase.rpc('join_group', { code: joinCode })
    if (error) return { error: new Error(friendlyError(error)) }
    await loadGroup()
    return { data: grp }
  }

  async function refreshMembership() {
    if (!group || !session) return
    const { data } = await supabase
      .from('group_members')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('group_id', group.id)
      .single()
    setMembership(data)
  }

  return (
    <GroupContext.Provider value={{ group, membership, members, loading, createGroup, joinGroup, loadGroup, loadMembers, refreshMembership }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  return useContext(GroupContext)
}
