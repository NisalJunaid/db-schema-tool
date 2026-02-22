<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiagramDatabase extends Model
{
    use HasFactory;

    protected $fillable = [
        'diagram_id',
        'name',
        'color',
        'x',
        'y',
        'width',
        'height',
    ];

    public function tables(): HasMany
    {
        return $this->hasMany(DiagramTable::class, 'database_id');
    }

    public function diagram(): BelongsTo
    {
        return $this->belongsTo(Diagram::class);
    }
}
