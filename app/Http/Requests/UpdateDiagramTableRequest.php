<?php

namespace App\Http\Requests;

use App\Models\DiagramTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDiagramTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var DiagramTable $diagramTable */
        $diagramTable = $this->route('diagram_table');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('diagram_tables')
                    ->ignore($diagramTable->getKey())
                    ->where(fn ($query) => $query->where('diagram_id', $diagramTable->diagram_id)),
            ],
            'schema' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'x' => ['sometimes', 'required', 'integer'],
            'y' => ['sometimes', 'required', 'integer'],
            'w' => ['sometimes', 'required', 'integer'],
            'h' => ['sometimes', 'required', 'integer'],
        ];
    }
}
