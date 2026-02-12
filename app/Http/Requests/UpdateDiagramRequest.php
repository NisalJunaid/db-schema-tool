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
            'editor_mode' => ['nullable', 'string', 'in:db,flow,mind'],
            'flow_state' => ['nullable', 'array'],
            'mind_state' => ['nullable', 'array'],
            'preview_image' => ['nullable', 'string'],
            'preview_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
