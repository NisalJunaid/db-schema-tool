<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagramAccess extends Model
{
    use HasFactory;

    protected $table = 'diagram_access';

    protected $fillable = [
        'diagram_id',
        'subject_type',
        'subject_id',
        'role',
    ];

    public function diagram(): BelongsTo
    {
        return $this->belongsTo(Diagram::class);
    }
}
