import React, { useState } from 'react';
import { Trash2, Check, X, Edit2 } from 'lucide-react';
import { MeetingType } from '../types';

interface MeetingTypeCardProps {
  meetingType: MeetingType;
  onUpdate: (updated: MeetingType) => void;
  onDelete: () => void;
}

export const MeetingTypeCard: React.FC<MeetingTypeCardProps> = ({
  meetingType,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedType, setEditedType] = useState(meetingType.type);
  const [editedDescription, setEditedDescription] = useState(meetingType.description);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (editedType.trim()) {
      onUpdate({
        ...meetingType,
        type: editedType.trim(),
        description: editedDescription.trim(),
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedType(meetingType.type);
    setEditedDescription(meetingType.description);
    setIsEditing(false);
  };

  const handleToggle = () => {
    onUpdate({
      ...meetingType,
      enabled: !meetingType.enabled,
    });
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedType}
              onChange={(e) => setEditedType(e.target.value)}
              maxLength={100}
              className="w-full bg-[#0d1117] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Meeting type name"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <h3
                className={`text-lg font-semibold ${
                  meetingType.enabled ? 'text-white' : 'text-gray-500'
                }`}
              >
                {meetingType.type}
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-blue-500/20 rounded transition-colors opacity-70 hover:opacity-100"
                title="Edit meeting type"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 hover:bg-green-500/20 rounded transition-colors"
                title="Save"
              >
                <Check className="w-5 h-5 text-green-500" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5 text-red-500" />
              </button>
            </>
          ) : (
            <>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={meetingType.enabled}
                  onChange={handleToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full bg-[#0d1117] text-gray-300 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Meeting description (optional)"
        />
      ) : (
        <p
          className={`text-sm cursor-pointer hover:text-gray-300 transition-colors ${
            meetingType.enabled ? 'text-gray-400' : 'text-gray-600'
          }`}
          onClick={() => setIsEditing(true)}
        >
          {meetingType.description || 'Click to add description'}
        </p>
      )}

      {showDeleteConfirm && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <p className="text-sm text-red-400 mb-2">
            Are you sure you want to delete this meeting type?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteConfirm}
              className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
