import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VisualizationState } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackFeatureUsage } from './useFeatureTracking';

export const useVisualization = (
  updateVisualizationStatus?: (messageId: string, hasVisualization: boolean) => void,
  persistentVisualizationStates?: Record<string, any>,
  updatePersistentVisualizationState?: (messageId: string, state: any) => void
) => {
  const { user } = useAuth();
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationState>>({});
  const [currentVisualization, setCurrentVisualization] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const [messageToHighlight, setMessageToHighlight] = useState<string | null>(null);

  const generateVisualization = useCallback(async (messageId: string, messageText: string, visualizationMode: 'detailed_report' = 'detailed_report') => {
    setIsGenerating(true);

    // Mark visualization as generating in persistent state
    if (updatePersistentVisualizationState) {
      updatePersistentVisualizationState(messageId, {
        isGenerating: true,
        content: null,
        hasVisualization: false
      });
    }

    // Also mark in database - fetch existing metadata first to preserve it
    try {
      const { data: existingMessage } = await supabase
        .from('astra_chats')
        .select('metadata')
        .eq('id', messageId)
        .maybeSingle();

      const existingMetadata = existingMessage?.metadata || {};

      await supabase
        .from('astra_chats')
        .update({
          visualization: true,
          metadata: { ...existingMetadata, visualization_generating: true }
        })
        .eq('id', messageId);

      console.log('✅ Marked visualization as generating in database for message:', messageId);
    } catch (error) {
      console.error('Error marking visualization as generating:', error);
    }

    console.log('📊 Full message text being sent to Gemini:', messageText);
    console.log('📊 Message text length:', messageText.length);

    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        isGenerating: true,
        content: null,
        isVisible: false
      }
    }));

    try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error('Gemini API key not found');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3-flash-preview',
          generationConfig: {
            temperature: 1.0,
            topK: 64,
            topP: 0.95,
            maxOutputTokens: 100000,
          }
        });

        const baseDesign = `DESIGN REQUIREMENTS:
- Use a dark theme with gray-900 (#111827) background
- Use gray-800 (#1f2937) and gray-700 (#374151) for card backgrounds
- Use white (#ffffff) and gray-300 (#d1d5db) for text
- Use blue (#3b82f6), purple (#8b5cf6), and cyan (#06b6d4) for accents and highlights
- Match the visual style of a modern dark dashboard
- Include proper spacing, rounded corners, and subtle shadows
- Use responsive layouts with flexbox or CSS grid
- Ensure all content fits within containers without overflow`;

        const prompt = `Create a comprehensive visual dashboard to help understand the information in the message below.

${baseDesign}
- Use graphics, emojis, and charts as needed to enhance the visualization
- Include visual elements like progress bars, icons, charts, and infographics where appropriate
- Make the dashboard visually engaging with relevant emojis and graphical elements

CRITICAL TYPOGRAPHY & SIZING RULES:
- Headings: Use max font-size of 1.875rem (30px)
- Large numbers/metrics: Use max font-size of 2rem (32px) with clamp() for responsiveness
- Subheadings: 1rem to 1.25rem (16-20px)
- Body text: 0.875rem to 1rem (14-16px)

CRITICAL LAYOUT RULES TO PREVENT OVERFLOW:
- Add padding inside ALL cards and containers (minimum 1rem on all sides)
- Use word-wrap: break-word on all text elements
- Use overflow-wrap: break-word to handle long numbers and text
- For responsive card grids, use: display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;
- Never use fixed widths that might cause overflow
- Ensure numbers scale down on smaller containers using clamp() or max-width with text wrapping

MESSAGE TEXT:
${messageText}

Return only the HTML code - no other text or formatting.`;

      console.log('🤖 Generating visualization with Gemini...');
      console.log('🔧 Using settings: temperature=1.0, topK=64, maxTokens=100000');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let cleanedContent = response.text();

      console.log('🔍 Raw Gemini response:', cleanedContent.substring(0, 500) + '...');

      // Clean up the response - remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log('🧹 Cleaned content preview:', cleanedContent.substring(0, 500) + '...');

      // Ensure it starts with DOCTYPE if it's a complete HTML document
      if (!cleanedContent.toLowerCase().includes('<!doctype') && !cleanedContent.toLowerCase().includes('<html')) {
        cleanedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualization</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            background: #111827;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            width: 100%;
            overflow-x: hidden;
        }
        /* Prevent text overflow in all elements */
        h1, h2, h3, h4, h5, h6, p, div, span {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        /* Enforce maximum font sizes */
        h1 { font-size: clamp(1.5rem, 4vw, 1.875rem) !important; }
        h2 { font-size: clamp(1.25rem, 3.5vw, 1.5rem) !important; }
        h3 { font-size: clamp(1.125rem, 3vw, 1.25rem) !important; }
        /* Responsive images */
        img {
            max-width: 100%;
            height: auto;
        }
        /* Ensure all containers have proper padding and prevent overflow */
        [class*="card"], [class*="container"], [class*="box"], [style*="padding"] {
            padding: 1rem !important;
            overflow: hidden;
        }
    </style>
</head>
<body>
    ${cleanedContent}
</body>
</html>`;
      }

      console.log('✅ Visualization generated successfully');

      // Save visualization to database - preserve existing metadata and clear generating flag
      try {
        const { data: existingMessage, error: fetchError } = await supabase
          .from('astra_chats')
          .select('metadata')
          .eq('id', messageId)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Error fetching existing message:', fetchError);
        }

        const existingMetadata = existingMessage?.metadata || {};
        console.log('📊 Existing metadata before update:', JSON.stringify(existingMetadata));

        // Remove visualization_generating and visualization_error by creating a new object without them
        const { visualization_generating, visualization_error, ...updatedMetadata } = existingMetadata;
        console.log('📊 Updated metadata after cleanup:', JSON.stringify(updatedMetadata));
        console.log('📊 Removed flags:', { visualization_generating, visualization_error });

        const { error: updateError } = await supabase
          .from('astra_chats')
          .update({
            visualization_data: cleanedContent,
            visualization: true,
            metadata: updatedMetadata
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('❌ Error saving visualization to database:', updateError);
        } else {
          console.log('✅ Visualization saved to database for message:', messageId);

          // Force a small delay then verify the update worked
          await new Promise(resolve => setTimeout(resolve, 100));
          const { data: verifyData } = await supabase
            .from('astra_chats')
            .select('metadata')
            .eq('id', messageId)
            .maybeSingle();
          console.log('✅ Verified metadata after update:', JSON.stringify(verifyData?.metadata));

          if (user?.id) {
            trackFeatureUsage(user.id, 'visualizations');
          }
        }
      } catch (dbError) {
        console.error('❌ Database error while saving visualization:', dbError);
      }
      
      // Update persistent state
      if (updatePersistentVisualizationState) {
        updatePersistentVisualizationState(messageId, {
          isGenerating: false,
          content: cleanedContent,
          hasVisualization: true
        });
      }

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: cleanedContent,
          isVisible: false
        }
      }));

      // Note: Database update will be handled by the calling component
    } catch (error) {
      console.error('Error generating visualization:', error);

      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exhausted')) {
        errorMessage = 'API rate limit reached. The visualization service is temporarily unavailable due to high demand. Please try again in a few minutes.';
      }
      
      // Update persistent state with error
      if (updatePersistentVisualizationState) {
        updatePersistentVisualizationState(messageId, {
          isGenerating: false,
          content: null,
          hasVisualization: false,
          error: errorMessage
        });
      }

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: `<div style="padding: 20px; text-align: center; color: #ef4444; background: #1f2937; border-radius: 8px;">
            <h3>Failed to generate visualization</h3>
            <p>Error: ${errorMessage}</p>
            <p>Please try again.</p>
          </div>`,
          isVisible: false
        }
      }));
      
      // Also update database to mark as failed - preserve existing metadata
      try {
        const { data: existingMessage } = await supabase
          .from('astra_chats')
          .select('metadata')
          .eq('id', messageId)
          .maybeSingle();

        const existingMetadata = existingMessage?.metadata || {};

        // Remove generating flag and add error by creating a new object
        const { visualization_generating, ...restMetadata } = existingMetadata;
        const updatedMetadata = {
          ...restMetadata,
          visualization_error: errorMessage
        };

        await supabase
          .from('astra_chats')
          .update({
            metadata: updatedMetadata
          })
          .eq('id', messageId);
      } catch (dbError) {
        console.error('Error updating database with visualization error:', dbError);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [updateVisualizationStatus, updatePersistentVisualizationState]);

  const showVisualization = useCallback((messageId: string) => {
    // Save current scroll position before showing visualization
    const scrollContainer = document.querySelector('.chat-messages-container');
    if (scrollContainer) {
      setSavedScrollPosition(scrollContainer.scrollTop);
    }
    setMessageToHighlight(messageId);
    setCurrentVisualization(messageId);
    
    console.log('🎯 useVisualization: showVisualization called for messageId:', messageId);
    console.log('🎯 useVisualization: Current visualizations state:', Object.keys(visualizations));
    console.log('🎯 useVisualization: Visualization exists for messageId:', !!visualizations[messageId]);
    
    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || { messageId, isGenerating: false, content: null }),
        isVisible: true
      }
    }));
  }, []);
  
  // Add a method to manually set visualization content
  const setVisualizationContent = useCallback((messageId: string, content: string) => {
    console.log('🔧 useVisualization: Setting visualization content for messageId:', messageId);
    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        isGenerating: false,
        content,
        isVisible: false
      }
    }));
  }, []);

  const hideVisualization = useCallback(() => {
    setCurrentVisualization(null);
    
    // Restore scroll position after a short delay
    setTimeout(() => {
      const scrollContainer = document.querySelector('.chat-messages-container');
      if (scrollContainer && savedScrollPosition > 0) {
        scrollContainer.scrollTo({
          top: savedScrollPosition,
          behavior: 'smooth'
        });
      }
      
      // Highlight the message briefly
      if (messageToHighlight) {
        const messageElement = document.getElementById(`message-${messageToHighlight}`);
        if (messageElement) {
          messageElement.classList.add('message-highlight');
          setTimeout(() => {
            messageElement.classList.remove('message-highlight');
          }, 3000);
        }
      }
    }, 100);
  }, [messageToHighlight, savedScrollPosition]);

  const getVisualization = useCallback((messageId: string) => {
    // Check persistent state first, then local state
    if (persistentVisualizationStates && persistentVisualizationStates[messageId]) {
      return persistentVisualizationStates[messageId];
    }
    return visualizations[messageId] || null;
  }, [visualizations]);

  const clearHighlight = useCallback(() => {
    setMessageToHighlight(null);
    setSavedScrollPosition(0);
  }, []);
  
  return {
    generateVisualization,
    showVisualization,
    setVisualizationContent,
    hideVisualization,
    getVisualization,
    currentVisualization,
    isGenerating,
    messageToHighlight,
    clearHighlight
  };
};