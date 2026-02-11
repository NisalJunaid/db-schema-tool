<?php

namespace App\Policies;

use App\Models\Invitation;
use App\Models\User;

class InvitationPolicy
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
        return false;
    }

    public function createTeam(User $user, int $teamId): bool
    {
        return $user->teams()->whereKey($teamId)->exists();
    }

    public function createDiagram(User $user, int $diagramId): bool
    {
        return $user->exists && $diagramId > 0;
    }

    public function manage(User $user, Invitation $invitation): bool
    {
        return (int) $invitation->inviter_user_id === (int) $user->getKey();
    }
}
