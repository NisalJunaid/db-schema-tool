<?php

namespace App\Policies;

use App\Models\Diagram;
use App\Models\Team;
use App\Models\User;

class DiagramPolicy
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
        return $diagram->is_public
            || $this->isOwner($user, $diagram)
            || $this->belongsToOwnerTeam($user, $diagram)
            || $this->hasExplicitAccess($user, $diagram, ['viewer', 'editor', 'admin']);
    }

    public function update(User $user, Diagram $diagram): bool
    {
        return $this->isOwner($user, $diagram)
            || $this->hasOwnerTeamRole($user, $diagram, ['admin', 'owner'])
            || $this->hasExplicitAccess($user, $diagram, ['editor', 'admin']);
    }

    public function delete(User $user, Diagram $diagram): bool
    {
        return $this->isOwner($user, $diagram)
            || $this->hasOwnerTeamRole($user, $diagram, ['admin', 'owner'])
            || $this->hasExplicitAccess($user, $diagram, ['admin']);
    }

    public function manageAccess(User $user, Diagram $diagram): bool
    {
        return $this->delete($user, $diagram);
    }

    private function isOwner(User $user, Diagram $diagram): bool
    {
        return $diagram->owner instanceof User
            && (int) $diagram->owner->getKey() === (int) $user->getKey();
    }

    private function belongsToOwnerTeam(User $user, Diagram $diagram): bool
    {
        return $diagram->owner instanceof Team
            && $user->teams()->whereKey($diagram->owner->getKey())->exists();
    }

    private function hasOwnerTeamRole(User $user, Diagram $diagram, array $roles): bool
    {
        return $diagram->owner instanceof Team
            && $user->hasTeamRole($diagram->owner, $roles);
    }

    private function hasExplicitAccess(User $user, Diagram $diagram, array $roles): bool
    {
        $teamIds = $user->teams()->pluck('teams.id')->all();

        return $diagram->accessEntries()
            ->where(function ($query) use ($user, $teamIds) {
                $query
                    ->where(function ($userQuery) use ($user) {
                        $userQuery->where('subject_type', 'user')->where('subject_id', $user->getKey());
                    })
                    ->orWhere(function ($teamQuery) use ($teamIds) {
                        $teamQuery->where('subject_type', 'team')->whereIn('subject_id', $teamIds);
                    });
            })
            ->whereIn('role', $roles)
            ->exists();
    }
}
