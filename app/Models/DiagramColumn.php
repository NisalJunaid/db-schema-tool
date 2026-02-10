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
        'nullable',
        'primary',
        'unique',
        'default',
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
    ];

    public function diagramTable(): BelongsTo
    {
        return $this->belongsTo(DiagramTable::class);
    }
}
