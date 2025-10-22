import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simple email template (no preview photos for now)
function generateEmailHTML(
  memberName: string,
  eventTitle: string,
  photoCount: number,
  inviteUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vous avez de nouvelles photos</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Memoria</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                Bonjour ${memberName} 👋
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                ${photoCount > 0 
                  ? `Vous avez été invité à découvrir vos photos de <strong>${eventTitle}</strong>.`
                  : `Vous avez été invité à rejoindre l'événement <strong>${eventTitle}</strong>.`
                }
              </p>
              
              ${photoCount > 0 ? `
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0; color: #667eea; font-size: 48px; font-weight: bold;">${photoCount}</p>
                <p style="margin: 10px 0 0 0; color: #4a4a4a; font-size: 16px;">
                  ${photoCount === 1 ? 'photo vous attend' : 'photos vous attendent'}
                </p>
              </div>
              
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Créez votre compte pour accéder à vos photos et pouvoir les télécharger.
              </p>
              ` : `
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  📸 Vous pourrez voir toutes les photos de l'événement dès qu'elles seront uploadées et que vous serez taggué.
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  🔔 Vous recevrez une notification par email quand vos photos seront prêtes.
                </p>
              </div>
              
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Créez votre compte dès maintenant pour ne rien manquer !
              </p>
              `}

              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      ${photoCount > 0 ? 'Voir mes photos' : 'Rejoindre l\'événement'}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Ce lien est personnel et sécurisé. Ne le partagez pas avec d'autres personnes.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Memoria - Partagez vos souvenirs facilement
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, memberIds, skipPhotoCheck = false } = await request.json();

    if (!eventId || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: eventId and memberIds are required' },
        { status: 400 }
      );
    }

    // Load event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const results = [];

    // Process each member
    for (const memberId of memberIds) {
      try {
        // Get member details
        const { data: member, error: memberError } = await supabaseAdmin
          .from('event_members')
          .select('*')
          .eq('id', memberId)
          .single();

        if (memberError || !member) {
          results.push({ memberId, success: false, error: 'Member not found' });
          continue;
        }

        // Count their tagged photos
        const { count: photoCount } = await supabaseAdmin
          .from('media_tags')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', memberId);

        // Skip photo check if requested (for new invitations)
        if (!skipPhotoCheck && (!photoCount || photoCount === 0)) {
          results.push({ memberId, success: false, error: 'No photos tagged' });
          continue;
        }

        // Generate invite URL
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${member.invitation_token}`;

        // Generate email HTML
        const emailHTML = generateEmailHTML(
          member.name,
          event.title,
          photoCount || 0,
          inviteUrl
        );

        // Generate email subject
        const emailSubject = photoCount && photoCount > 0
          ? `Vous avez ${photoCount} nouvelle${photoCount > 1 ? 's' : ''} photo${photoCount > 1 ? 's' : ''} de ${event.title}`
          : `Invitation à rejoindre ${event.title}`;

        // Send email using Resend (if configured) or log it
        if (process.env.RESEND_API_KEY) {
          // TODO: Integrate with Resend
          // For now, we'll just log and update the sent_at timestamp
          console.log(`📧 Would send email to ${member.email}`);
          console.log(`Subject: ${emailSubject}`);
          console.log(`Invite URL: ${inviteUrl}`);
        } else {
          // Development mode: just log
          console.log(`
========================================
📧 EMAIL TO: ${member.email}
SUBJECT: ${emailSubject}
URL: ${inviteUrl}
========================================
          `);
        }

        // Update invitation_sent_at
        await supabaseAdmin
          .from('event_members')
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq('id', memberId);

        results.push({
          memberId,
          success: true,
          email: member.email,
          photoCount,
          inviteUrl
        });
      } catch (err) {
        console.error(`Error processing member ${memberId}:`, err);
        results.push({
          memberId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount}/${memberIds.length} invitations sent`,
      results
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
