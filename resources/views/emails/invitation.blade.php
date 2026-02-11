<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a;">
<div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
    <h2 style="margin-top: 0;">You're invited to collaborate</h2>
    <p><strong>{{ $inviterName }}</strong> invited you to join <strong>{{ $targetName }}</strong> ({{ $typeLabel }} invitation).</p>
    <p>Your assigned role: <strong>{{ $role }}</strong>.</p>

    <p style="margin: 24px 0;">
        <a href="{{ $acceptUrl }}" style="background: #4f46e5; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; display: inline-block;">
            Accept Invitation
        </a>
    </p>

    <p>If you do not have an account yet, register first using this link:</p>
    <p><a href="{{ $registerUrl }}">{{ $registerUrl }}</a></p>

    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">This invitation expires in 7 days.</p>
</div>
</body>
</html>
