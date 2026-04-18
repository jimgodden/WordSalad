import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { type WordItem } from '../store/gameStore';

interface SortableWordProps {
    word: WordItem;
    id: string;
}

export const SortableWord: React.FC<SortableWordProps> = ({ word, id }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: id,
        data: { word, source: 'response' } // Keep source 'response' for logic in App.tsx
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "cursor-grab active:cursor-grabbing select-none px-3 py-1.5 rounded-lg shadow-sm border-2 font-bold text-lg transition-colors touch-none",
                isDragging
                    ? "opacity-50 scale-105 z-50 bg-salad-100 border-salad-400 text-salad-800"
                    : "bg-salad-50 border-salad-200 text-slate-700 hover:border-salad-400 hover:text-salad-700 hover:shadow-md"
            )}
        >
            {word.text}
        </div>
    );
};
