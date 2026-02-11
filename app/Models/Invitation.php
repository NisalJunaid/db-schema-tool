<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Invitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'email_status',
        'email_last_error',
        'inviter_user_id',
        'type',
        'team_id',
        'diagram_id',
        'role',
        'token',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Invitation $invitation): void {
            $invitation->email = self::normalizeEmail($invitation->email);

            if (! $invitation->token) {
                $invitation->token = (string) Str::uuid();
            }

            if (! $invitation->status) {
                $invitation->status = 'pending';
            }

            if (! $invitation->expires_at) {
                $invitation->expires_at = now()->addDays(7);
            }

            if (! $invitation->email_status) {
                $invitation->email_status = 'pending';
            }
        });

        static::updating(function (Invitation $invitation): void {
            if ($invitation->isDirty('email')) {
                $invitation->email = self::normalizeEmail($invitation->email);
            }
        });
    }

    public static function normalizeEmail(?string $email): string
    {
        return strtolower(trim((string) $email));
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_user_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function diagram(): BelongsTo
    {
        return $this->belongsTo(Diagram::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at?->isPast() ?? false;
    }
}
