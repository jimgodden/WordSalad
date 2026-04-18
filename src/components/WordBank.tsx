import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { DraggableWord } from './DraggableWord';
import clsx from 'clsx';

export const WordBank: React.FC = () => {
    const words = useGameStore((state) => state.myHand); // Changed from myWords to myHand
    const { setNodeRef, isOver } = useDroppable({
        id: 'bank-zone',
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "bg-slate-100 p-4 rounded-xl min-h-[200px] max-h-[400px] overflow-y-auto border-2 border-dashed transition-colors scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent",
                isOver ? "border-slate-400 bg-slate-200" : "border-slate-300"
            )}
        >
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Your Word Bank</h3>
            <div className="flex flex-wrap gap-2">
                {words.map((word) => (
                    <DraggableWord key={word.id} id={word.id} word={word} source="bank" />
                ))}
                {words.length === 0 && (
                    <div className="w-full text-center text-slate-400 py-8 italic">
                        {/* Logic to show different msg if submitted vs empty */}
                        Waiting for others...
                    </div>
                )}
            </div>
        </div>
    );
};
