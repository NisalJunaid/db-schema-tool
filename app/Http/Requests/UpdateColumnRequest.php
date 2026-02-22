<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateColumnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'enum_values' => ['nullable', 'array'],
            'enum_values.*' => ['nullable', 'string', 'max:255'],
            'length' => ['nullable', 'integer', 'min:1'],
            'precision' => ['nullable', 'integer', 'min:1'],
            'scale' => ['nullable', 'integer', 'min:0'],
            'unsigned' => ['sometimes', 'boolean'],
            'auto_increment' => ['sometimes', 'boolean'],
            'nullable' => ['sometimes', 'boolean'],
            'primary' => ['sometimes', 'boolean'],
            'unique' => ['sometimes', 'boolean'],
            'default' => ['nullable', 'string', 'max:255'],
            'collation' => ['nullable', 'string', 'max:255'],
            'index_type' => ['nullable', 'in:primary,unique,index'],
            'on_delete' => ['nullable', 'string', 'max:255'],
            'on_update' => ['nullable', 'string', 'max:255'],
        ];
    }
}
