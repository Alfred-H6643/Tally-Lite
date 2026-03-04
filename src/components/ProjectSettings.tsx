import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectTag } from '../types';
import ConfirmDialog from './ConfirmDialog';

const ProjectSettings: React.FC = () => {
    const navigate = useNavigate();
    const { projectTags, addProjectTag, updateProjectTag, deleteProjectTag } = useAppContext();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void }>({
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const handleBack = () => {
        navigate('/settings');
    };

    const handleAdd = () => {
        const newTag: ProjectTag = {
            id: uuidv4(),
            name: '新專案',
            status: 'active',
            order: projectTags.length,
        };
        addProjectTag(newTag);
        startEdit(newTag);
    };

    const startEdit = (tag: ProjectTag) => {
        setIsEditing(tag.id);
        setEditName(tag.name);
    };

    const saveEdit = (id: string) => {
        const tag = projectTags.find(t => t.id === id);
        if (tag) {
            updateProjectTag({ ...tag, name: editName });
        }
        setIsEditing(null);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-3 flex items-center shadow-sm z-10">
                <button onClick={handleBack} className="flex items-center text-gray-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <span>設定</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-gray-800 pr-8">專案標籤設定</h1>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {projectTags
                    .map((tag) => (
                        <div key={tag.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                            {isEditing === tag.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 border border-blue-500 rounded px-2 py-1 outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => saveEdit(tag.id)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                                    >
                                        儲存
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-medium ${tag.status === 'archived' ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {tag.name}
                                        </span>
                                        {tag.status === 'archived' && (
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已隱藏</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                updateProjectTag({
                                                    ...tag,
                                                    status: tag.status === 'active' ? 'archived' : 'active'
                                                });
                                            }}
                                            className={`p-2 ${tag.status === 'active' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-blue-500'}`}
                                            title={tag.status === 'active' ? '隱藏 (不顯示於新增交易)' : '顯示'}
                                        >
                                            {tag.status === 'active' ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => startEdit(tag)}
                                            className="text-gray-400 hover:text-blue-500 p-2"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfirmConfig({
                                                    title: '刪除專案標籤',
                                                    message: `確定要刪除「${tag.name}」嗎？`,
                                                    onConfirm: () => deleteProjectTag(tag.id)
                                                });
                                                setIsConfirmOpen(true);
                                            }}
                                            className="text-gray-400 hover:text-red-500 p-2"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
            </div>

            {/* Scale-like Floating Action Button */}
            <button
                onClick={handleAdd}
                className="absolute bottom-24 right-6 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 active:scale-95 transition-all z-20"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
            />
        </div>
    );
};

export default ProjectSettings;
