<?php

namespace App\Http\Middleware;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user()?->only('id', 'name', 'email', 'role', 'permissions'),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
            'pendingInvitations' => fn () => $request->user()
                ? Invitation::query()
                    ->where('status', 'pending')
                    ->where('expires_at', '>', now())
                    ->whereRaw('LOWER(TRIM(email)) = ?', [Invitation::normalizeEmail($request->user()->email)])
                    ->count()
                : 0,
        ];
    }
}
