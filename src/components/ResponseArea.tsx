import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useGameStore } from '../store/gameStore';
import { SortableWord } from './SortableWord';
import clsx from 'clsx';

export const ResponseArea = () => {
    const response = useGameStore((state) => state.response);
    const { setNodeRef, isOver } = useDroppable({
        id: 'response-zone',
    });

    return (
        <SortableContext
            items={response.map(w => w.id)}
            strategy={horizontalListSortingStrategy}
        >
            <div
                ref={setNodeRef}
                className={clsx(
                    "min-h-[120px] bg-white rounded-xl border-b-4 border-slate-200 p-4 flex flex-wrap gap-2 items-center justify-center transition-all shadow-sm",
                    isOver ? "ring-2 ring-pasta-400 bg-pasta-50" : ""
                )}
            >
                {response.length === 0 && !isOver && (
                    <div className="text-slate-300 font-medium italic select-none">
                        Drag words here to plate your answer...
                    </div>
                )}

                {response.map((word) => (
                    <SortableWord key={word.id} id={word.id} word={word} />
                ))}
            </div>
        </SortableContext>
    );
};
