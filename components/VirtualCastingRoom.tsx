

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type SavedActor, type ActorDefinition } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { UsersIcon } from './icons/UsersIcon';
import ActorCreatorModal from './ActorCreatorModal';
import { SparklesIcon } from './icons/SparklesIcon';
import { DEFAULT_ACTOR_DEFINITION } from '../constants';

interface VirtualCastingRoomProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (actor: SavedActor) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

const VirtualCastingRoom: React.FC<VirtualCastingRoomProps> = ({ isOpen, onClose, onSelect }) => {
    const [savedActors, setSavedActors] = useState<SavedActor[]>([]);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            try {
                const actorsRaw = localStorage.getItem('virtualCastingRoom_v1');
                if (actorsRaw) {
                    setSavedActors(JSON.parse(actorsRaw));
                }
            } catch (error) {
                console.error("Failed to load actors from local storage", error);
            }
        }
    }, [isOpen]);

    const handleDeleteActor = (actorId: string) => {
        if (window.confirm("確定要從選角室刪除這位演員嗎？")) {
            const newActors = savedActors.filter(actor => actor.id !== actorId);
            setSavedActors(newActors);
            try {
                localStorage.setItem('virtualCastingRoom_v1', JSON.stringify(newActors));
            } catch (error) {
                console.error("Failed to save updated actors list", error);
            }
        }
    };

    const handleActorFinalized = async (result: { file: File; definition: ActorDefinition; saveToCollection: boolean; name?: string; }) => {
        if (result.saveToCollection && result.name) {
             try {
                const base64Image = await blobToBase64(result.file);
                const newActor: SavedActor = {
                    id: uuidv4(),
                    name: result.name,
                    definition: result.definition,
                    base64Image: base64Image
                };
                const newActors = [newActor, ...savedActors];
                setSavedActors(newActors);
                localStorage.setItem('virtualCastingRoom_v1', JSON.stringify(newActors));
            } catch (error) {
                console.error("Failed to process and save actor:", error);
            }
        }
        setIsCreatorOpen(false);
    };
    
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <UsersIcon className="w-6 h-6 mr-3 text-purple-600" />
                            虛擬選角室
                        </h2>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsCreatorOpen(true)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                塑造新演員
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
                        {savedActors.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {savedActors.map(actor => (
                                    <div key={actor.id} className="group relative border bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                                        <div className="aspect-[9/16] bg-gray-200">
                                            <img src={`data:image/jpeg;base64,${actor.base64Image}`} alt={actor.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="p-3 flex-grow flex flex-col justify-between">
                                            <p className="font-semibold text-sm text-gray-800 truncate">{actor.name}</p>
                                            <p className="text-xs text-gray-500">{`${actor.definition.facialFeaturesTemplate.join(', ')} / ${actor.definition.age}`}</p>
                                        </div>
                                        {onSelect && (
                                            <button onClick={() => onSelect(actor)} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2 hover:bg-indigo-700 transition-colors">
                                                選用
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteActor(actor.id)} className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                <UsersIcon className="w-12 h-12 mb-4 text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-700">選角室空無一人</h3>
                                <p className="mt-1">在此處「塑造新演員」，或在腳本中生成後儲存，以便重複使用。</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-gray-100 border-t flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            關閉
                        </button>
                    </div>
                </div>
            </div>
            {isCreatorOpen && (
                <ActorCreatorModal
                    isOpen={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    actorName="新演員"
                    initialDefinition={DEFAULT_ACTOR_DEFINITION}
                    onFinalize={handleActorFinalized}
                    context="casting_room"
                />
            )}
        </>
    );
};

export default VirtualCastingRoom;