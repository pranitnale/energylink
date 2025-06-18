// Follow Supabase Edge Function format
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface OperationLog {
  operation: string
  success: boolean
  timestamp: string
  error?: string
  details: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { userId, email } = await req.json()
    
    // Initialize Supabase client with service role for admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Operation log to track progress
    const operationLog: OperationLog[] = []

    // 1. Verify user exists
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !user) {
      throw new Error(userError?.message || 'User not found')
    }
    operationLog.push({
      operation: 'verify_user',
      success: true,
      timestamp: new Date().toISOString(),
      details: { email }
    })

    // 2. Sign out all sessions for this user
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId)
    if (signOutError) {
      console.error('Error signing out sessions:', signOutError)
      // Non-blocking - continue with deletion
    }
    
    // 3. Check for any remaining references
    const remainingRefs: Array<{ table: string; count: number; note?: string }> = []
    const tables = ['profiles', 'chats', 'chat_members', 'saved_profiles', 'query_matches']
    
    for (const table of tables) {
      const { count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      if (count && count > 0) {
        remainingRefs.push({ table, count })
      }
    }

    // Also check messages but don't delete them - they'll be preserved with NULL sender_id
    const { count: messageCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)

    if (messageCount && messageCount > 0) {
      remainingRefs.push({ 
        table: 'messages', 
        count: messageCount,
        note: 'Messages will be preserved with sender_id set to NULL'
      })
    }

    operationLog.push({
      operation: 'check_references',
      success: true,
      timestamp: new Date().toISOString(),
      details: { remainingRefs }
    })

    // 4. Clean up all references EXCEPT messages
    // Messages will have their sender_id set to NULL automatically via ON DELETE SET NULL
    for (const { table } of remainingRefs) {
      if (table !== 'messages') {
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(table === 'messages' ? 'sender_id' : 'user_id', userId)
        
        if (deleteError) {
          console.error(`Error deleting from ${table}:`, deleteError)
        }
      }
    }

    // 5. Wait a moment for session cleanup
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 6. Attempt to delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      
      // Fallback: Disable the user if deletion fails
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: '100y',
          user_metadata: {
            disabled: true,
            disabled_at: new Date().toISOString(),
            disabled_reason: 'Account deletion requested',
            deletion_attempted: true,
            email,
            remaining_refs: remainingRefs
          }
        }
      )

      operationLog.push({
        operation: 'delete_auth_user',
        success: false,
        timestamp: new Date().toISOString(),
        error: deleteError.message,
        details: {
          fallback: 'user_disabled',
          disableSuccess: !updateError,
          remainingRefs
        }
      })

      // Return partial success - user is disabled but not deleted
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User disabled and data cleaned up (full deletion failed)',
          details: {
            userId,
            email,
            status: 'disabled',
            timestamp: new Date().toISOString(),
            operationLog,
            remainingReferences: remainingRefs,
            userState: user.user,
            deletionError: {
              message: deleteError.message,
              code: 500,
              hint: 'Try signing out all sessions and waiting a few minutes before retrying'
            }
          }
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // Success - user fully deleted
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User and all associated data deleted successfully (messages preserved)',
        details: {
          userId,
          email,
          status: 'deleted',
          timestamp: new Date().toISOString(),
          operationLog: [
            ...operationLog,
            {
              operation: 'delete_auth_user',
              success: true,
              timestamp: new Date().toISOString(),
              details: {
                preservedMessages: messageCount || 0
              }
            }
          ]
        }
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
}) 