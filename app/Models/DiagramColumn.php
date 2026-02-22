<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagramColumn extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'diagram_table_id',
        'name',
        'type',
        'enum_values',
        'length',
        'precision',
        'scale',
        'unsigned',
        'auto_increment',
        'nullable',
        'primary',
        'unique',
        'default',
        'collation',
        'index_type',
        'on_delete',
        'on_update',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'nullable' => 'boolean',
        'primary' => 'boolean',
        'unique' => 'boolean',
        'enum_values' => 'array',
        'unsigned' => 'boolean',
        'auto_increment' => 'boolean',
    ];

    public function diagramTable(): BelongsTo
    {
        return $this->belongsTo(DiagramTable::class);
    }
}
