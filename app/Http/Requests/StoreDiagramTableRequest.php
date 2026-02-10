<?php

namespace App\Http\Requests;

use App\Models\Diagram;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiagramTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'diagram_id' => ['required', 'integer', 'exists:diagrams,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('diagram_tables')->where(fn ($query) => $query->where('diagram_id', $this->integer('diagram_id'))),
            ],
            'schema' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'x' => ['required', 'integer'],
            'y' => ['required', 'integer'],
            'w' => ['required', 'integer'],
            'h' => ['required', 'integer'],
        ];
    }

    public function diagram(): Diagram
    {
        return Diagram::query()->findOrFail($this->integer('diagram_id'));
    }
}
