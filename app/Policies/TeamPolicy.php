<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasAppRole(['admin', 'super_admin'])) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->exists;
    }

    public function view(User $user, Team $team): bool
    {
        return $user->teams()->whereKey($team->getKey())->exists();
    }

    public function manageMembers(User $user, Team $team): bool
    {
        return $user->hasTeamRole($team, ['admin', 'owner']);
    }

    public function manageTeam(User $user, Team $team): bool
    {
        return $this->manageMembers($user, $team);
    }

    public function manage(User $user, Team $team): bool
    {
        return $this->manageTeam($user, $team);
    }
}
