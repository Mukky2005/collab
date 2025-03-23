import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  ArrowLeft, 
  ArrowRight, 
  Link as LinkIcon, 
  Image, 
  ChevronDown,
  Undo,
  Redo,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface FormatButtonProps {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
  onClick: () => void;
}

interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  selectionFormat: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    list: boolean;
    orderedList: boolean;
    heading: string;
    fontFamily?: string;
  };
  onOpenAIAssistant: () => void;
  userCount?: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

function FormatButton({ icon, title, isActive, onClick }: FormatButtonProps) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      title={title}
      onClick={onClick}
      className="h-8 w-8"
    >
      {icon}
    </Button>
  );
}

export function FormattingToolbar({ 
  onFormat, 
  selectionFormat, 
  onOpenAIAssistant,
  userCount = 0,
  canUndo = false,
  canRedo = false
}: FormattingToolbarProps) {
  const handleHeadingChange = (value: string) => {
    onFormat('heading', value);
  };
  
  const handleFontChange = (value: string) => {
    onFormat('fontFamily', value);
  };
  
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-1 overflow-x-auto">
      <div className="flex items-center space-x-1 mr-2">
        <Select onValueChange={handleHeadingChange} value={selectionFormat.heading}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Normal text" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="p">Normal text</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="blockquote">Quote</SelectItem>
          </SelectContent>
        </Select>
        
        <Select onValueChange={handleFontChange} value={selectionFormat.fontFamily || 'default'}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
            <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
            <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
            <SelectItem value="Georgia, serif">Georgia</SelectItem>
            <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
            <SelectItem value="'Comic Sans MS', cursive">Comic Sans</SelectItem>
          </SelectContent>
        </Select>
        
        <FormatButton 
          icon={<Bold className="h-4 w-4" />} 
          title="Bold" 
          isActive={selectionFormat.bold}
          onClick={() => onFormat('bold')} 
        />
        
        <FormatButton 
          icon={<Italic className="h-4 w-4" />} 
          title="Italic" 
          isActive={selectionFormat.italic}
          onClick={() => onFormat('italic')} 
        />
        
        <FormatButton 
          icon={<Underline className="h-4 w-4" />} 
          title="Underline" 
          isActive={selectionFormat.underline}
          onClick={() => onFormat('underline')} 
        />
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex items-center space-x-1">
        
        <FormatButton 
          icon={<List className="h-4 w-4" />} 
          title="Bulleted list" 
          isActive={selectionFormat.list}
          onClick={() => onFormat('bulletList')} 
        />
        
        <FormatButton 
          icon={<ListOrdered className="h-4 w-4" />} 
          title="Numbered list" 
          isActive={selectionFormat.orderedList}
          onClick={() => onFormat('orderedList')} 
        />
        
        <FormatButton 
          icon={<ArrowLeft className="h-4 w-4" />} 
          title="Decrease indent" 
          onClick={() => onFormat('outdent')} 
        />
        
        <FormatButton 
          icon={<ArrowRight className="h-4 w-4" />} 
          title="Increase indent" 
          onClick={() => onFormat('indent')} 
        />
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex items-center space-x-1">
        <FormatButton 
          icon={<LinkIcon className="h-4 w-4" />} 
          title="Add link" 
          onClick={() => onFormat('link')} 
        />
        
        <FormatButton 
          icon={<Image className="h-4 w-4" />} 
          title="Add image" 
          onClick={() => onFormat('image')} 
        />
        
        <FormatButton 
          icon={<Bot className="h-4 w-4" />} 
          title="AI Writing Assistant" 
          onClick={onOpenAIAssistant} 
        />
      </div>
      
      {userCount > 0 && (
        <div className="ml-auto flex items-center text-xs text-gray-500">
          <span>{userCount} user{userCount !== 1 ? 's' : ''} editing</span>
        </div>
      )}
    </div>
  );
}
