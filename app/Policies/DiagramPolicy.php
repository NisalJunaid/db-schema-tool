<?php

namespace App\Policies;

use App\Models\Diagram;
use App\Models\Team;
use App\Models\User;

class DiagramPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->exists;
    }

    public function create(User $user, string $ownerType, int $ownerId): bool
    {
        if ($ownerType === 'user') {
            return (int) $user->getKey() === $ownerId;
        }

        if ($ownerType === 'team') {
            return $user->teams()->whereKey($ownerId)->exists();
        }

        return false;
    }

    public function view(User $user, Diagram $diagram): bool
    {
        return $this->isOwner($user, $diagram)
            || $this->belongsToOwnerTeam($user, $diagram);
    }

    public function update(User $user, Diagram $diagram): bool
    {
        return $this->isOwner($user, $diagram)
            || $this->hasOwnerTeamRole($user, $diagram, ['admin', 'owner']);
    }

    public function delete(User $user, Diagram $diagram): bool
    {
        return $this->isOwner($user, $diagram)
            || $this->hasOwnerTeamRole($user, $diagram, ['admin', 'owner']);
    }

    private function isOwner(User $user, Diagram $diagram): bool
    {
        return $diagram->owner instanceof User
            && (int) $diagram->owner->getKey() === (int) $user->getKey();
    }

    private function belongsToOwnerTeam(User $user, Diagram $diagram): bool
    {
        return $diagram->owner instanceof Team
            && $user->teams()
                ->whereKey($diagram->owner->getKey())
                ->exists();
    }

    private function hasOwnerTeamRole(User $user, Diagram $diagram, array $roles): bool
    {
        return $diagram->owner instanceof Team
            && $user->hasTeamRole($diagram->owner, $roles);
    }
}
