<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Diagram extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_type',
        'owner_id',
        'name',
        'description',
        'viewport',
        'is_public',
        'preview_image',
        'preview_path',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'viewport' => 'array',
        'is_public' => 'boolean',
    ];

    protected $appends = [
        'preview_url',
    ];

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    public function diagramTables(): HasMany
    {
        return $this->hasMany(DiagramTable::class);
    }

    public function diagramRelationships(): HasMany
    {
        return $this->hasMany(DiagramRelationship::class);
    }

    public function accessEntries(): HasMany
    {
        return $this->hasMany(DiagramAccess::class);
    }

    public function getPreviewUrlAttribute(): ?string
    {
        if (! $this->preview_path) {
            return null;
        }

        return asset('storage/'.$this->preview_path);
    }
}
