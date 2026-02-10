<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagramRelationship extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'diagram_id',
        'from_column_id',
        'to_column_id',
        'type',
        'on_delete',
        'on_update',
    ];

    public function diagram(): BelongsTo
    {
        return $this->belongsTo(Diagram::class);
    }

    public function fromColumn(): BelongsTo
    {
        return $this->belongsTo(DiagramColumn::class, 'from_column_id');
    }

    public function toColumn(): BelongsTo
    {
        return $this->belongsTo(DiagramColumn::class, 'to_column_id');
    }
}
