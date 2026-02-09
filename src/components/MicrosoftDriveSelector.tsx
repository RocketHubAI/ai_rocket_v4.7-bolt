import React, { useState, useEffect } from 'react';
import { Cloud, Building2, User, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { listMicrosoftDrives, saveMicrosoftDriveSelection, MicrosoftDriveInfo } from '../lib/microsoft-graph-oauth';

interface MicrosoftDriveSelectorProps {
  onComplete: (driveId: string, driveName: string) => void;
  onBack?: () => void;
}

export const MicrosoftDriveSelector: React.FC<MicrosoftDriveSelectorProps> = ({
  onComplete,
  onBack
}) => {
  const [drives, setDrives] = useState<MicrosoftDriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDrive, setSelectedDrive] = useState<MicrosoftDriveInfo | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    try {
      setLoading(true);
      setError('');
      const driveList = await listMicrosoftDrives();
      setDrives(driveList);

      if (driveList.length === 1) {
        setSelectedDrive(driveList[0]);
      }
    } catch (err: any) {
      console.error('Error loading drives:', err);
      setError(err.message || 'Failed to load drives');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDrive = (drive: MicrosoftDriveInfo) => {
    setSelectedDrive(drive);
  };

  const handleConfirm = async () => {
    if (!selectedDrive) return;

    try {
      setSaving(true);
      await saveMicrosoftDriveSelection(selectedDrive.id);
      onComplete(selectedDrive.id, selectedDrive.name);
    } catch (err: any) {
      console.error('Error saving drive selection:', err);
      setError(err.message || 'Failed to save selection');
    } finally {
      setSaving(false);
    }
  };

  const getDriveIcon = (driveType: string) => {
    switch (driveType) {
      case 'personal':
        return <User className="w-6 h-6 text-cyan-400" />;
      case 'documentLibrary':
        return <Building2 className="w-6 h-6 text-blue-400" />;
      default:
        return <Cloud className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getDriveTypeLabel = (driveType: string) => {
    switch (driveType) {
      case 'personal':
        return 'Personal OneDrive';
      case 'documentLibrary':
        return 'SharePoint';
      case 'business':
        return 'Business OneDrive';
      default:
        return 'Drive';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600/20 mb-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Your Drives</h2>
          <p className="text-sm text-gray-400">Fetching OneDrive and SharePoint sites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 mb-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Drives</h2>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={loadDrives}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-600/20 mb-3">
          <Cloud className="w-7 h-7 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Select Your Drive</h2>
        <p className="text-sm text-gray-400">
          Choose which OneDrive or SharePoint site to connect
        </p>
      </div>

      {drives.length === 0 ? (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-center">
          <p className="text-yellow-300 text-sm">
            No drives found. Make sure you have access to OneDrive or SharePoint.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {drives.map((drive) => (
            <button
              key={drive.id}
              onClick={() => handleSelectDrive(drive)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedDrive?.id === drive.id
                  ? 'bg-cyan-900/30 border-cyan-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedDrive?.id === drive.id ? 'bg-cyan-600/30' : 'bg-gray-700'
              }`}>
                {getDriveIcon(drive.driveType)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium text-sm">{drive.name}</p>
                <p className="text-xs text-gray-400">{getDriveTypeLabel(drive.driveType)}</p>
              </div>
              {selectedDrive?.id === drive.id && (
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedDrive || saving}
          className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Continue with {selectedDrive?.name || 'Selected Drive'}</span>
          )}
        </button>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-400 text-center">
          After selecting your drive, you'll be able to choose specific folders to sync.
        </p>
      </div>
    </div>
  );
};
