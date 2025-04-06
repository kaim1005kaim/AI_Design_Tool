import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { google } from 'https://esm.sh/googleapis@105'
import { corsHeaders } from '../_shared/cors.ts'

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const REDIRECT_URI = Deno.env.get('REDIRECT_URI') || 'http://localhost:3000/auth-callback'

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive.photos.readonly'
      ]
    })

    const response = {
      url: authUrl
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate auth URL' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})