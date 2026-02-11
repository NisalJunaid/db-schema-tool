<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDiagramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'viewport' => ['nullable', 'array'],
            'viewport.x' => ['nullable', 'numeric'],
            'viewport.y' => ['nullable', 'numeric'],
            'viewport.zoom' => ['nullable', 'numeric'],
            'preview_image' => ['nullable', 'string'],
        ];
    }
}
