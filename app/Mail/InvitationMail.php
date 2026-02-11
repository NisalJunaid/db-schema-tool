<?php

namespace App\Mail;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Invitation $invitation)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You have been invited to collaborate',
        );
    }

    public function content(): Content
    {
        $targetName = $this->invitation->type === 'team'
            ? ($this->invitation->team?->name ?? 'a team')
            : ($this->invitation->diagram?->name ?? 'a diagram');

        return new Content(
            view: 'emails.invitation',
            with: [
                'inviterName' => $this->invitation->inviter?->name ?? 'A teammate',
                'typeLabel' => $this->invitation->type,
                'targetName' => $targetName,
                'role' => $this->invitation->role,
                'acceptUrl' => route('invitations.accept', $this->invitation->token),
                'registerUrl' => route('register', ['invitation' => $this->invitation->token]),
            ],
        );
    }
}
