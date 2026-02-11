<?php

namespace App\Providers;

use App\Models\Diagram;
use App\Models\Invitation;
use App\Models\Team;
use App\Policies\DiagramPolicy;
use App\Policies\InvitationPolicy;
use App\Policies\TeamPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Diagram::class => DiagramPolicy::class,
        Team::class => TeamPolicy::class,
        Invitation::class => InvitationPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
