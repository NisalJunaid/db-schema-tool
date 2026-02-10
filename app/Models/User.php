<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class)->withPivot('role');
    }

    public function ownedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'owner_user_id');
    }

    public function isTeamOwner(Team $team): bool
    {
        return (int) $team->owner_user_id === (int) $this->getKey();
    }

    public function hasTeamRole(Team $team, string|array $roles): bool
    {
        $roles = (array) $roles;

        if ($this->isTeamOwner($team)) {
            return true;
        }

        $membership = $this->teams()
            ->whereKey($team->getKey())
            ->first();

        if (! $membership) {
            return false;
        }

        return in_array($membership->pivot?->role, $roles, true);
    }
}
