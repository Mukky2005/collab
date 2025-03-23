import React, { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { CommentSidebar } from "./comment-sidebar";
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
}

export function Editor({ document: docData, onContentChange, activeUsers }: EditorProps) {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(docData.content);
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
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
  
  // WebSocket functionality
  const { isConnected, sendMessage } = useWebSocket({
    documentId: docData.id
  });
  
  // Initialize the editor with content
  useEffect(() => {
    if (editorRef.current && docData.content) {
      editorRef.current.innerHTML = docData.content;
      setContent(docData.content);
    }
  }, [docData.id, docData.content]);
  
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
  
  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      onContentChange(newContent);
      
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
        const imgUrl = prompt('Enter the image URL:');
        if (imgUrl) {
          window.document.execCommand('insertImage', false, imgUrl);
        }
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
    }
    
    // Get the updated content
    handleInput();
  };
  
  const handleAddComment = () => {
    setShowCommentSidebar(true);
  };
  
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
  
  return (
    <div className="flex-1 overflow-hidden relative">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-8">
          <div 
            className="editor-content bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative text-black font-medium" 
            ref={editorRef}
            contentEditable={true}
            onInput={handleInput}
            onMouseMove={handleMouseMove}
            suppressContentEditableWarning={true}
          />
          
          {/* User cursors - temporarily disabled */}
        </div>
      </ScrollArea>
      
      {showCommentSidebar && (
        <CommentSidebar 
          documentId={docData.id}
          onClose={() => setShowCommentSidebar(false)}
        />
      )}
    </div>
  );
}
