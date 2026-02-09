import React from 'react';
import { Plus } from 'lucide-react';
import { MeetingType } from '../types';
import { MeetingTypeCard } from './MeetingTypeCard';

interface MeetingTypesSectionProps {
  meetingTypes: MeetingType[];
  onChange: (types: MeetingType[]) => void;
}

export const MeetingTypesSection: React.FC<MeetingTypesSectionProps> = ({
  meetingTypes,
  onChange,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleAddMeetingType = () => {
    const newType: MeetingType = {
      type: 'New Meeting Type',
      description: '',
      enabled: true,
    };
    onChange([...meetingTypes, newType]);

    // Scroll to bottom after adding new meeting type
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleUpdateMeetingType = (index: number, updated: MeetingType) => {
    const newTypes = [...meetingTypes];
    newTypes[index] = updated;
    onChange(newTypes);
  };

  const handleDeleteMeetingType = (index: number) => {
    const enabledCount = meetingTypes.filter((t) => t.enabled).length;
    const isDeleting = meetingTypes[index].enabled;

    if (enabledCount === 1 && isDeleting) {
      alert('At least one meeting type must be enabled');
      return;
    }

    const newTypes = meetingTypes.filter((_, i) => i !== index);
    onChange(newTypes);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-xl font-semibold text-white mb-2">Meeting Types</h2>
        <p className="text-sm text-gray-400">
          Define the types of meetings your team has. Astra will use these to categorize and
          search your meeting transcripts.
        </p>
      </div>

      {meetingTypes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No meeting types configured.</p>
          <p>Add your first meeting type to get started.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
        >
          {meetingTypes.map((type, index) => (
            <MeetingTypeCard
              key={index}
              meetingType={type}
              onUpdate={(updated) => handleUpdateMeetingType(index, updated)}
              onDelete={() => handleDeleteMeetingType(index)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleAddMeetingType}
        className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Meeting Type
      </button>
    </div>
  );
};
