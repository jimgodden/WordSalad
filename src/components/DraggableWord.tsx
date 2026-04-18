import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { type WordItem } from '../store/gameStore';

interface DraggableWordProps {
    word: WordItem;
    id: string;
    source: 'bank' | 'response';
}

export const DraggableWord: React.FC<DraggableWordProps> = ({ word, id, source }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: { word, source }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "cursor-grab active:cursor-grabbing select-none px-3 py-1.5 rounded-lg shadow-sm border-2 font-bold text-lg transition-colors touch-none",
                isDragging ? "opacity-50 scale-105 z-50 bg-yellow-100 border-yellow-400 text-yellow-800" : "bg-white border-slate-200 text-slate-700 hover:border-salad-400 hover:text-salad-700 hover:shadow-md",
                source === 'response' && "bg-salad-50 border-salad-200"
            )}
        >
            {word.text}
        </div>
    );
};
