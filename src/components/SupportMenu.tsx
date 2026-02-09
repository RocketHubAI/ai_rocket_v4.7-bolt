import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Bug, MessageSquare, Lightbulb, X, Send, Upload, Paperclip, Trash2, MessageCircleQuestion } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HelpCenterTab } from './HelpCenter';

type SupportType = 'bug_report' | 'support_message' | 'feature_request';

interface SupportOption {
  type: SupportType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

const supportOptions: SupportOption[] = [
  {
    type: 'bug_report',
    label: 'Report a Bug',
    icon: <Bug className="w-5 h-5" />,
    placeholder: 'Describe the bug you encountered...',
  },
  {
    type: 'support_message',
    label: 'Message Support',
    icon: <MessageSquare className="w-5 h-5" />,
    placeholder: 'How can we help you?',
  },
  {
    type: 'feature_request',
    label: 'Request a Feature',
    icon: <Lightbulb className="w-5 h-5" />,
    placeholder: 'Describe the feature you would like to see...',
  },
];

interface SupportMenuProps {
  onOpenHelpCenter?: (tab: HelpCenterTab) => void;
}

export function SupportMenu({ onOpenHelpCenter }: SupportMenuProps = {}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SupportType | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (type: SupportType) => {
    setSelectedType(type);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setSubject('');
    setDescription('');
    setAttachments([]);
    setError(null);
    setSuccess(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

      if (!isValidType) {
        setError('Only images and PDFs are allowed');
        return false;
      }
      if (!isValidSize) {
        setError('File size must be less than 10MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles].slice(0, 3)); // Max 3 files
      setError(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Upload attachments if any
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadingFile(true);

        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(uploadData.path);

          attachmentUrls.push(publicUrl);
        }

        setUploadingFile(false);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supportType: selectedType,
            subject: subject.trim(),
            description: description.trim(),
            attachmentUrls,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Full error response:', errorData);
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to submit support request';
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setTimeout(() => {
        handleCloseModal();
      }, 2000);
    } catch (err) {
      console.error('Error submitting support request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
      setUploadingFile(false); // ✅ Always reset upload state
    }
  };

  const selectedOption = supportOptions.find(opt => opt.type === selectedType);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          title="Support & Feedback"
        >
          <HelpCircle className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
        </button>

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-56 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg overflow-hidden z-50"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                if (onOpenHelpCenter) {
                  onOpenHelpCenter('faq');
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/10"
            >
              <div className="text-green-400">
                <MessageCircleQuestion className="w-5 h-5" />
              </div>
              <span className="text-white text-sm">FAQ & AI Help</span>
            </button>
            <div className="border-t border-white/10"></div>
            {supportOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleOptionClick(option.type)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className="text-blue-400">{option.icon}</div>
                <span className="text-white text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && selectedOption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-lg shadow-xl w-full max-w-lg border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="text-blue-400">{selectedOption.icon}</div>
                <h2 className="text-xl font-semibold text-white">
                  {selectedOption.label}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">
                    Your request has been submitted successfully!
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-white/80 mb-2">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary..."
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isSubmitting || success}
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={selectedOption.placeholder}
                  rows={6}
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  disabled={isSubmitting || success}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Attachments (Optional)
                </label>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isSubmitting || success || attachments.length >= 3}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || success || attachments.length >= 3}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f1e] border border-white/10 rounded-lg text-white/70 hover:text-white hover:border-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm">
                      {attachments.length >= 3 ? 'Maximum 3 files' : 'Attach files (images or PDFs, max 10MB each)'}
                    </span>
                  </button>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-3 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Paperclip className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-white/80 truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-white/40 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            disabled={isSubmitting || success}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                  disabled={isSubmitting || success}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || success || !subject.trim() || !description.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFile ? (
                    <>
                      <Upload className="w-4 h-4 animate-bounce" />
                      <span>Uploading files...</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
