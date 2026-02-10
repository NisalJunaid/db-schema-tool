<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiagramTable extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'diagram_id',
        'name',
        'schema',
        'x',
        'y',
        'w',
        'h',
    ];

    public function diagram(): BelongsTo
    {
        return $this->belongsTo(Diagram::class);
    }

    public function diagramColumns(): HasMany
    {
        return $this->hasMany(DiagramColumn::class);
    }
}
