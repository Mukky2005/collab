import React, { useRef, useEffect, useState, useImperativeHandle } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { CommentSidebar } from "./comment-sidebar";
import { AIAssistant } from "./ai-assistant";
import { PlagiarismDialog } from "./plagiarism-dialog";
import { WritingImprovementDialog } from "./writing-improvement-dialog";
import type { Document } from "@shared/schema";

interface CursorPosition {
  userId: number;
  username: string;
  name: string;
  position: { left: number; top: number };
}

interface EditorProps {
  document: Document;
  onContentChange: (content: string) => void;
  activeUsers: Array<{
    userId: number;
    username: string;
    name: string;
  }>;
  onUndoRedoStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

// Define an interface for the methods exposed via the ref
export interface EditorRef {
  openAIAssistant: () => void;
  checkPlagiarism: () => void;
  improveWriting: () => void;
  insertAIText?: (text: string) => void;
}

export const Editor = React.forwardRef<EditorRef, EditorProps>(({ 
  document: docData, 
  onContentChange, 
  activeUsers, 
  onUndoRedoStateChange 
}, ref) => {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(docData.content);
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showPlagiarismDialog, setShowPlagiarismDialog] = useState(false);
  const [showWritingImprovementDialog, setShowWritingImprovementDialog] = useState(false);
  const [selectionFormat, setSelectionFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    orderedList: false,
    heading: 'p',
    fontFamily: 'default'
  });
  const [userCursors, setUserCursors] = useState<CursorPosition[]>([]);
  
  // History for undo/redo operations
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isUndoRedoAction = useRef(false);
  
  // Initialize history with initial content
  useEffect(() => {
    if (docData.content) {
      setUndoStack([docData.content]);
    }
  }, [docData.id]);
  
  // WebSocket functionality
  const { isConnected, sendMessage } = useWebSocket({
    documentId: docData.id
  });
  
  // Initialize the editor with content
  useEffect(() => {
    if (editorRef.current && docData.content) {
      editorRef.current.innerHTML = docData.content;
      setContent(docData.content);
      
      // Check if we need to add page breaks after content is loaded
      setTimeout(() => checkPageOverflow(), 300);
    }
  }, [docData.id, docData.content]);
  
  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorRef.current && editorRef.current.contains(e.target as Node)) {
        // Check for undo: Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleFormat('undo');
        }
        
        // Check for redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
        if ((e.ctrlKey || e.metaKey) && 
            ((e.key === 'y') || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault();
          handleFormat('redo');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack, content]); // Dependencies to ensure up-to-date state access
  
  // Track text selection and format status
  useEffect(() => {
    const checkFormatting = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      // Check for formatting
      setSelectionFormat({
        bold: window.document.execCommand('queryCommandState', false, 'bold'),
        italic: window.document.execCommand('queryCommandState', false, 'italic'),
        underline: window.document.execCommand('queryCommandState', false, 'underline'),
        list: window.document.execCommand('queryCommandState', false, 'insertUnorderedList'),
        orderedList: window.document.execCommand('queryCommandState', false, 'insertOrderedList'),
        heading: getHeadingLevel(),
        fontFamily: getCurrentFont()
      });
    };
    
    const getHeadingLevel = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return 'p';
      
      const parentElement = selection.anchorNode?.parentElement;
      if (!parentElement) return 'p';
      
      const tagName = parentElement.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'blockquote'].includes(tagName)) {
        return tagName;
      }
      
      return 'p';
    };
    
    const getCurrentFont = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return 'default';
      
      const parentElement = selection.anchorNode?.parentElement;
      if (!parentElement) return 'default';
      
      const computedStyle = window.getComputedStyle(parentElement);
      const fontFamily = computedStyle.fontFamily;
      
      // Check against our known fonts and return the matching one
      if (fontFamily.includes('Arial')) return 'Arial, sans-serif';
      if (fontFamily.includes('Times New Roman')) return "'Times New Roman', serif";
      if (fontFamily.includes('Courier New')) return "'Courier New', monospace";
      if (fontFamily.includes('Georgia')) return "Georgia, serif";
      if (fontFamily.includes('Verdana')) return "Verdana, sans-serif";
      if (fontFamily.includes('Comic Sans')) return "'Comic Sans MS', cursive";
      
      return 'default';
    };
    
    // Listen for selection changes
    window.document.addEventListener('selectionchange', checkFormatting);
    
    return () => {
      window.document.removeEventListener('selectionchange', checkFormatting);
    };
  }, []);
  
  // Check if content exceeds page height and add a new page if needed
  const checkPageOverflow = () => {
    if (editorRef.current) {
      const editorHeight = editorRef.current.scrollHeight;
      
      // A4 height is 297mm, but we need to account for margins and padding
      const pageHeight = 297; // A4 height in mm
      const pageContentHeight = pageHeight - 40; // Subtract margins (20mm top + 20mm bottom)
      
      // Convert measurements to pixels for comparison (assuming 96 DPI)
      const pxPerMm = 3.78; // Approximate pixels per millimeter (96 DPI / 25.4 mm per inch)
      const pageHeightPx = pageContentHeight * pxPerMm;
      
      // Get all page dividers already in the document
      const pageDividers = editorRef.current.querySelectorAll('.page-divider');
      
      // Calculate how many pages we should have based on content height
      const pagesNeeded = Math.ceil(editorHeight / pageHeightPx);
      
      // If we need more pages than we currently have (pageDividers.length + 1), add new dividers
      if (pagesNeeded > pageDividers.length + 1) {
        // How many new dividers we need to add
        const newDividersNeeded = pagesNeeded - (pageDividers.length + 1);
        
        // Create and add each needed divider
        for (let i = 0; i < newDividersNeeded; i++) {
          // Create a page divider
          const pageDivider = document.createElement('div');
          pageDivider.className = 'page-divider';
          pageDivider.innerHTML = '<hr class="border-t-2 border-dashed border-gray-300 my-8" />';
          
          // Add a hidden page break marker for printing
          const pageBreak = document.createElement('div');
          pageBreak.className = 'page-break';
          
          // Add divider at the bottom of the content
          editorRef.current.appendChild(pageDivider);
          editorRef.current.appendChild(pageBreak);
          
          // Update page indicator text with current number of pages
          const pageIndicator = document.querySelector('.page-indicator');
          if (pageIndicator) {
            pageIndicator.textContent = `Page ${pageDividers.length + 2 + i} / Auto-pagination enabled`;
          }
        }
      }
      
      // Initial page indicator text update
      const pageIndicator = document.querySelector('.page-indicator');
      if (pageIndicator && pagesNeeded <= 1) {
        pageIndicator.textContent = `Page 1 / Auto-pagination enabled`;
      }
    }
  };

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      
      // Don't add to history if this is an undo/redo action
      if (!isUndoRedoAction.current && content) {
        // Add current state to undo stack before changing
        const validContent = content as string;
        setUndoStack(prev => [...prev, validContent]);
        // Clear redo stack when a new change is made
        setRedoStack([]);
      } else {
        // Reset the flag
        isUndoRedoAction.current = false;
      }
      
      setContent(newContent);
      onContentChange(newContent);
      
      // Check if we need to add a new page
      setTimeout(() => checkPageOverflow(), 100);
      
      // Send content update to websocket
      sendMessage({
        type: 'document_edit',
        documentId: docData.id,
        content: newContent
      });
    }
  };
  
  // Handle cursor movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorRef.current || !user) return;
    
    const rect = editorRef.current.getBoundingClientRect();
    const position = {
      left: e.clientX - rect.left,
      top: e.clientY - rect.top
    };
    
    // Throttle sending cursor position to avoid overwhelming the server
    // Using a debounce-like approach with a setTimeout
    if ((window as any).cursorUpdateTimeout) {
      clearTimeout((window as any).cursorUpdateTimeout);
    }
    
    (window as any).cursorUpdateTimeout = setTimeout(() => {
      sendMessage({
        type: 'cursor_position',
        position
      });
    }, 100);
  };
  
  // Handle text formatting
  const handleFormat = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    // Make sure editor has focus
    editorRef.current.focus();
    
    // Execute the appropriate command
    switch (command) {
      case 'bold':
        window.document.execCommand('bold', false);
        break;
      case 'italic':
        window.document.execCommand('italic', false);
        break;
      case 'underline':
        window.document.execCommand('underline', false);
        break;
      case 'bulletList':
        window.document.execCommand('insertUnorderedList', false);
        break;
      case 'orderedList':
        window.document.execCommand('insertOrderedList', false);
        break;
      case 'indent':
        window.document.execCommand('indent', false);
        break;
      case 'outdent':
        window.document.execCommand('outdent', false);
        break;
      case 'link':
        const url = prompt('Enter the URL:');
        if (url) {
          window.document.execCommand('createLink', false, url);
        }
        break;
      case 'image':
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Create a custom dialog for image insertion
        const dialog = document.createElement('div');
        dialog.className = 'image-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        dialog.style.zIndex = '1000';
        dialog.style.width = '400px';
        dialog.style.maxWidth = '90%';
        
        dialog.innerHTML = `
          <h3 style="margin-top: 0; margin-bottom: 16px; font-weight: bold;">Insert Image</h3>
          <div style="margin-bottom: 16px;">
            <p style="margin-bottom: 8px; font-weight: bold;">Option 1: Upload an image</p>
            <button id="upload-btn" style="padding: 6px 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-weight: bold;">
              Choose Image
            </button>
            <p id="file-name" style="margin-top: 8px; font-size: 14px;"></p>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin-bottom: 8px; font-weight: bold;">Option 2: Enter image URL</p>
            <input id="img-url" type="text" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin-bottom: 8px; font-weight: bold;">Image size</p>
            <select id="img-size" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
              <option value="small">Small</option>
              <option value="medium" selected>Medium</option>
              <option value="large">Large</option>
              <option value="original">Original Size</option>
            </select>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin-bottom: 8px; font-weight: bold;">Image caption (optional)</p>
            <input id="img-caption" type="text" placeholder="Figure 1: Description of the image" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin-bottom: 8px; font-weight: bold;">Alignment</p>
            <div style="display: flex; gap: 8px;">
              <button id="align-left" style="padding: 6px 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;">
                Left
              </button>
              <button id="align-center" style="padding: 6px 12px; background-color: #1e40af; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;">
                Center
              </button>
              <button id="align-right" style="padding: 6px 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;">
                Right
              </button>
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button id="cancel-btn" style="padding: 8px 16px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-weight: bold;">
              Cancel
            </button>
            <button id="insert-btn" style="padding: 8px 16px; background-color: #1e40af; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              Insert
            </button>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        const uploadBtn = document.getElementById('upload-btn');
        const fileNameEl = document.getElementById('file-name');
        const imgUrlEl = document.getElementById('img-url') as HTMLInputElement;
        const imgCaptionEl = document.getElementById('img-caption') as HTMLInputElement;
        const imgSizeEl = document.getElementById('img-size') as HTMLSelectElement;
        const alignLeftBtn = document.getElementById('align-left');
        const alignCenterBtn = document.getElementById('align-center');
        const alignRightBtn = document.getElementById('align-right');
        const cancelBtn = document.getElementById('cancel-btn');
        const insertBtn = document.getElementById('insert-btn');
        
        let selectedFile: File | null = null;
        let alignment = 'center'; // Default alignment
        
        // Alignment button handlers
        alignLeftBtn?.addEventListener('click', () => {
          alignment = 'left';
          alignLeftBtn.style.backgroundColor = '#1e40af';
          alignLeftBtn.style.color = 'white';
          alignLeftBtn.style.border = 'none';
          
          alignCenterBtn!.style.backgroundColor = '#f1f5f9';
          alignCenterBtn!.style.color = 'black';
          alignCenterBtn!.style.border = '1px solid #e2e8f0';
          
          alignRightBtn!.style.backgroundColor = '#f1f5f9';
          alignRightBtn!.style.color = 'black';
          alignRightBtn!.style.border = '1px solid #e2e8f0';
        });
        
        alignCenterBtn?.addEventListener('click', () => {
          alignment = 'center';
          alignCenterBtn.style.backgroundColor = '#1e40af';
          alignCenterBtn.style.color = 'white';
          alignCenterBtn.style.border = 'none';
          
          alignLeftBtn!.style.backgroundColor = '#f1f5f9';
          alignLeftBtn!.style.color = 'black';
          alignLeftBtn!.style.border = '1px solid #e2e8f0';
          
          alignRightBtn!.style.backgroundColor = '#f1f5f9';
          alignRightBtn!.style.color = 'black';
          alignRightBtn!.style.border = '1px solid #e2e8f0';
        });
        
        alignRightBtn?.addEventListener('click', () => {
          alignment = 'right';
          alignRightBtn.style.backgroundColor = '#1e40af';
          alignRightBtn.style.color = 'white';
          alignRightBtn.style.border = 'none';
          
          alignLeftBtn!.style.backgroundColor = '#f1f5f9';
          alignLeftBtn!.style.color = 'black';
          alignLeftBtn!.style.border = '1px solid #e2e8f0';
          
          alignCenterBtn!.style.backgroundColor = '#f1f5f9';
          alignCenterBtn!.style.color = 'black';
          alignCenterBtn!.style.border = '1px solid #e2e8f0';
        });
        
        // Handle file selection
        uploadBtn?.addEventListener('click', () => {
          fileInput.click();
        });
        
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) {
            selectedFile = fileInput.files[0];
            if (fileNameEl) fileNameEl.textContent = selectedFile.name;
          }
        });
        
        // Handle cancel
        cancelBtn?.addEventListener('click', () => {
          document.body.removeChild(dialog);
          document.body.removeChild(fileInput);
        });
        
        // Handle insert
        insertBtn?.addEventListener('click', () => {
          const url = imgUrlEl?.value;
          const size = imgSizeEl?.value || 'medium';
          const caption = imgCaptionEl?.value;
          
          if (selectedFile) {
            // Read and insert the selected file
            const reader = new FileReader();
            reader.onload = (e) => {
              const imgDataUrl = e.target?.result as string;
              insertImageWithSize(imgDataUrl, size, caption, alignment);
              document.body.removeChild(dialog);
              document.body.removeChild(fileInput);
            };
            reader.readAsDataURL(selectedFile);
          } else if (url) {
            // Insert from URL
            insertImageWithSize(url, size, caption, alignment);
            document.body.removeChild(dialog);
            document.body.removeChild(fileInput);
          } else {
            alert('Please upload an image or enter an image URL');
          }
        });
        
        // Function to insert image with selected size
        const insertImageWithSize = (src: string, size: string, caption?: string, align: string = 'center') => {
          // Create a figure container for the image and caption
          const figure = document.createElement('figure');
          figure.style.margin = '16pt 0';
          
          // Set alignment based on user selection
          switch (align) {
            case 'left':
              figure.style.textAlign = 'left';
              break;
            case 'center':
              figure.style.textAlign = 'center';
              break;
            case 'right':
              figure.style.textAlign = 'right';
              break;
          }
          
          // Create and configure the image
          const img = document.createElement('img');
          img.src = src;
          img.alt = caption || 'Research paper image';
          
          // Set the size based on user selection
          switch (size) {
            case 'small':
              img.className = 'img-small';
              break;
            case 'medium':
              img.className = 'img-medium';
              break;
            case 'large':
              img.className = 'img-large';
              break;
            case 'original':
              // No additional class for original size
              break;
          }
          
          // Add the image to the figure
          figure.appendChild(img);
          
          // Add caption if provided
          if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
          }
          
          // Insert the figure into the document
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(figure);
            
            // Move cursor after the figure
            range.setStartAfter(figure);
            range.setEndAfter(figure);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Add a line break after the figure for better spacing
            const br = document.createElement('br');
            range.insertNode(br);
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        };
        break;
      case 'heading':
        if (value) {
          // First clear any existing formatting
          window.document.execCommand('removeFormat', false);
          
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          
          const range = selection.getRangeAt(0);
          const selectedContent = range.extractContents();
          
          // Create the new element
          const newElement = window.document.createElement(value);
          newElement.appendChild(selectedContent);
          range.insertNode(newElement);
          
          // Restore selection
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;
      
      case 'fontFamily':
        if (value && value !== 'default') {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          
          // If default is selected, we'll just clear the font
          if (value === 'default') {
            window.document.execCommand('removeFormat', false);
            break;
          }
          
          // Focus first to ensure commands work
          editorRef.current.focus();
          
          // Use a span with inline style for font-family
          const range = selection.getRangeAt(0);
          
          // We'll use a custom approach similar to heading to ensure consistent formatting
          const selectedContent = range.extractContents();
          
          // Create a span with the desired font-family
          const span = window.document.createElement('span');
          span.style.fontFamily = value;
          span.appendChild(selectedContent);
          
          // Insert the span
          range.insertNode(span);
          
          // Restore selection
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;
      
      case 'undo':
        // Check if there's anything to undo
        if (undoStack.length > 0) {
          // Get the last state from undo stack
          const previousState = undoStack[undoStack.length - 1];
          const newUndoStack = undoStack.slice(0, -1);
          
          // Add current state to redo stack if it exists
          if (content) {
            const validContent = content as string;
            setRedoStack([...redoStack, validContent]);
          }
          
          // Set flag to prevent adding to history in handleInput
          isUndoRedoAction.current = true;
          
          // Update the content
          if (editorRef.current && previousState) {
            editorRef.current.innerHTML = previousState;
            
            // Update state
            setContent(previousState);
            onContentChange(previousState);
            setUndoStack(newUndoStack);
            
            // Send content update to websocket
            sendMessage({
              type: 'document_edit',
              documentId: docData.id,
              content: previousState
            });
          }
        }
        break;
        
      case 'redo':
        // Check if there's anything to redo
        if (redoStack.length > 0) {
          // Get the last state from redo stack
          const nextState = redoStack[redoStack.length - 1];
          const newRedoStack = redoStack.slice(0, -1);
          
          // Add current state to undo stack if it exists
          if (content) {
            const validContent = content as string;
            setUndoStack([...undoStack, validContent]);
          }
          
          // Set flag to prevent adding to history in handleInput
          isUndoRedoAction.current = true;
          
          // Update the content
          if (editorRef.current && nextState) {
            editorRef.current.innerHTML = nextState;
            
            // Update state
            setContent(nextState);
            onContentChange(nextState);
            setRedoStack(newRedoStack);
            
            // Send content update to websocket
            sendMessage({
              type: 'document_edit',
              documentId: docData.id,
              content: nextState
            });
          }
        }
        break;
    }
    
    // Get the updated content
    handleInput();
  };
  
  const handleAddComment = () => {
    setShowCommentSidebar(true);
  };
  
  const handleOpenAIAssistant = () => {
    setShowAIAssistant(true);
  };
  
  const handleInsertAIText = (text: string) => {
    if (editorRef.current) {
      // Create a page break element
      const pageBreak = document.createElement('div');
      pageBreak.className = 'page-break';
      pageBreak.style.pageBreakBefore = 'always';
      pageBreak.style.height = '10px';
      pageBreak.style.margin = '10px 0';
      pageBreak.style.borderTop = '1px dashed #ccc';
      
      // Create a new content wrapper for the AI-generated text
      const newPageContent = document.createElement('div');
      newPageContent.className = 'ai-generated-content';
      
      // Format the AI text properly
      const paragraphs = text.split('\n\n');
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          const p = document.createElement('p');
          p.textContent = paragraph.trim();
          newPageContent.appendChild(p);
          
          // Add spacing between paragraphs
          if (index < paragraphs.length - 1) {
            const spacing = document.createElement('div');
            spacing.style.height = '12px';
            newPageContent.appendChild(spacing);
          }
        }
      });
      
      // Add a label to indicate AI-generated content
      const aiLabel = document.createElement('div');
      aiLabel.className = 'ai-label';
      aiLabel.innerHTML = '<span style="color:#777; font-size:0.8em; font-style:italic; margin-bottom:8px; display:block; border-bottom:1px solid #eee; padding-bottom:4px;">AI-Generated Content</span>';
      
      // Append elements to the editor
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // If there's a selection, insert after it
        const range = selection.getRangeAt(0);
        
        // Move to the end of the current content
        range.collapse(false);
        
        // Insert the page break and new content
        range.insertNode(pageBreak);
        pageBreak.appendChild(aiLabel);
        pageBreak.appendChild(newPageContent);
        
        // Move cursor to the end of inserted text
        range.setStartAfter(newPageContent);
        range.setEndAfter(newPageContent);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, append to the end
        editorRef.current.appendChild(pageBreak);
        pageBreak.appendChild(aiLabel);
        pageBreak.appendChild(newPageContent);
      }
      
      // Trigger content update
      handleInput();
      
      // Scroll to the new content
      pageBreak.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  // Check if undo/redo operations are available
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  // Notify parent component about undo/redo state
  useEffect(() => {
    if (onUndoRedoStateChange) {
      onUndoRedoStateChange(canUndo, canRedo);
    }
  }, [canUndo, canRedo, onUndoRedoStateChange]);
  
  // Create user cursors
  const renderUserCursors = () => {
    return userCursors.map(cursor => (
      <div 
        key={cursor.userId}
        className="user-cursor absolute z-10 pointer-events-none"
        style={{
          left: `${cursor.position.left}px`,
          top: `${cursor.position.top}px`,
          backgroundColor: `hsl(${cursor.userId * 137.5 % 360}, 70%, 50%)`,
          width: '2px',
          height: '20px',
        }}
        data-user={cursor.name}
      >
        <span 
          className="absolute -top-6 left-0 text-xs text-white px-2 py-1 rounded whitespace-nowrap"
          style={{ backgroundColor: `hsl(${cursor.userId * 137.5 % 360}, 70%, 50%)` }}
        >
          {cursor.name}
        </span>
      </div>
    ));
  };
  
  // Expose methods via ref
  // Handler to open the plagiarism check dialog
  const handlePlagiarismCheck = () => {
    if (editorRef.current) {
      setShowPlagiarismDialog(true);
    }
  };
  
  // Handler to open the writing improvement dialog
  const handleImproveWriting = () => {
    if (editorRef.current) {
      setShowWritingImprovementDialog(true);
    }
  };

  useImperativeHandle(ref, () => ({
    openAIAssistant: handleOpenAIAssistant,
    checkPlagiarism: handlePlagiarismCheck,
    improveWriting: handleImproveWriting,
    insertAIText: handleInsertAIText
  }));
  
  return (
    <div className="flex-1 overflow-hidden relative">
      <ScrollArea className="h-full">
        <div className="mx-auto p-8 flex justify-center">
          <div className="paper-container relative">
            <div 
              className="editor-content bg-white border border-gray-200 rounded-lg shadow-sm relative text-black font-medium" 
              ref={editorRef}
              contentEditable={true}
              onInput={handleInput}
              onMouseMove={handleMouseMove}
              suppressContentEditableWarning={true}
              style={{
                width: '210mm',              /* A4 width */
                minHeight: '297mm',          /* A4 height */
                padding: '20mm',             /* Standard margins */
                boxSizing: 'border-box',
                backgroundColor: 'white',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
              }}
            />
            
            <div className="page-indicator absolute bottom-2 right-4 text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
              Auto-pagination enabled
            </div>
          </div>
          
          {/* User cursors - temporarily disabled */}
        </div>
      </ScrollArea>
      
      {showCommentSidebar && (
        <CommentSidebar 
          documentId={docData.id}
          onClose={() => setShowCommentSidebar(false)}
        />
      )}
      
      {showAIAssistant && (
        <AIAssistant 
          onClose={() => setShowAIAssistant(false)}
        />
      )}
      
      {showPlagiarismDialog && (
        <PlagiarismDialog
          isOpen={showPlagiarismDialog}
          onClose={() => setShowPlagiarismDialog(false)}
          documentText={editorRef.current?.textContent || ''}
        />
      )}
      
      {showWritingImprovementDialog && (
        <WritingImprovementDialog
          isOpen={showWritingImprovementDialog}
          onClose={() => setShowWritingImprovementDialog(false)}
          documentText={editorRef.current?.textContent || ''}
          onApplyChanges={(improvedText) => {
            if (editorRef.current) {
              editorRef.current.innerHTML = improvedText;
              handleInput();
            }
          }}
        />
      )}
    </div>
  );
});
