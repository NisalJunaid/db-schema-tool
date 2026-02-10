<?php

namespace App\Http\Requests;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreDiagramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'owner_type' => ['required', 'string', Rule::in(['user', 'team'])],
            'owner_id' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'viewport' => ['nullable', 'array'],
            'viewport.x' => ['nullable', 'numeric'],
            'viewport.y' => ['nullable', 'numeric'],
            'viewport.zoom' => ['nullable', 'numeric'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $ownerType = $this->input('owner_type');
            $ownerId = (int) $this->input('owner_id');

            if ($ownerType === 'user' && ! User::query()->whereKey($ownerId)->exists()) {
                $validator->errors()->add('owner_id', 'The selected owner id is invalid for user owner type.');
            }

            if ($ownerType === 'team' && ! Team::query()->whereKey($ownerId)->exists()) {
                $validator->errors()->add('owner_id', 'The selected owner id is invalid for team owner type.');
            }
        });
    }
}
